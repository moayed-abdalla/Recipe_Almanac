/**
 * Server-side recipe URL importer.
 *
 * Fetches a recipe page, extracts Schema.org Recipe JSON-LD, converts it to
 * importable text, and runs it through the existing text parser.
 */

import { parseRecipeText, type ParsedRecipeDraft } from '@/lib/recipeTextParser';
import { iso8601DurationToMinutes } from '@/utils/recipeTime';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const USER_AGENT =
  'Mozilla/5.0 (compatible; RecipeAlmanac/1.0; +https://recipe-almanac.vercel.app)';

export class RecipeImportError extends Error {
  constructor(
    message: string,
    public readonly code: 'invalid_url' | 'blocked_url' | 'fetch_failed' | 'no_recipe'
  ) {
    super(message);
    this.name = 'RecipeImportError';
  }
}

type SchemaRecipe = Record<string, unknown>;

function isRecipeType(type: unknown): boolean {
  const types = Array.isArray(type) ? type : type ? [type] : [];
  return types.some(
    t => t === 'Recipe' || t === 'https://schema.org/Recipe' || String(t).endsWith('/Recipe')
  );
}

function collectRecipes(node: unknown, results: SchemaRecipe[] = []): SchemaRecipe[] {
  if (node == null) return results;
  if (Array.isArray(node)) {
    for (const item of node) collectRecipes(item, results);
    return results;
  }
  if (typeof node !== 'object') return results;

  const record = node as Record<string, unknown>;
  if (isRecipeType(record['@type'])) {
    results.push(record);
  }
  if (record['@graph']) {
    collectRecipes(record['@graph'], results);
  }
  return results;
}

function extractJsonLdRecipes(html: string): SchemaRecipe[] {
  const pattern =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const recipes: SchemaRecipe[] = [];

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      collectRecipes(parsed, recipes);
    } catch {
      // Skip malformed JSON-LD blocks.
    }
  }

  return recipes;
}

function recipeRichness(recipe: SchemaRecipe): number {
  const ingredients = normalizeStringArray(recipe.recipeIngredient);
  const steps = extractInstructionTexts(recipe.recipeInstructions);
  let score = ingredients.length * 2 + steps.length * 2;
  if (recipe.name) score += 3;
  if (recipe.description) score += 1;
  return score;
}

function pickBestRecipe(recipes: SchemaRecipe[]): SchemaRecipe | null {
  if (recipes.length === 0) return null;
  return recipes.reduce((best, current) =>
    recipeRichness(current) > recipeRichness(best) ? current : best
  );
}

function normalizeStringArray(value: unknown): string[] {
  if (value == null) return [];
  if (typeof value === 'string') return value.trim() ? [value.trim()] : [];
  if (Array.isArray(value)) {
    return value
      .flatMap(item => {
        if (typeof item === 'string') return item.trim() ? [item.trim()] : [];
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          const text = record.text ?? record.name;
          if (typeof text === 'string' && text.trim()) return [text.trim()];
        }
        return [];
      })
      .filter(Boolean);
  }
  return [];
}

function extractInstructionTexts(value: unknown): string[] {
  if (value == null) return [];
  if (typeof value === 'string') return value.trim() ? [value.trim()] : [];
  if (Array.isArray(value)) {
    const steps: string[] = [];
    for (const item of value) {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (trimmed) steps.push(trimmed);
        continue;
      }
      if (!item || typeof item !== 'object') continue;
      const record = item as Record<string, unknown>;
      const type = record['@type'];
      const types = Array.isArray(type) ? type : type ? [type] : [];
      const isSection = types.some(
        t =>
          t === 'HowToSection' ||
          t === 'https://schema.org/HowToSection' ||
          String(t).endsWith('/HowToSection')
      );
      if (isSection && record.itemListElement) {
        steps.push(...extractInstructionTexts(record.itemListElement));
        continue;
      }
      const text = record.text ?? record.name;
      if (typeof text === 'string' && text.trim()) {
        steps.push(text.trim());
      }
    }
    return steps;
  }
  return [];
}

function parseYield(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'number' && value > 0) return String(Math.round(value));
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const numMatch = trimmed.match(/(\d+)/);
    return numMatch ? numMatch[1] : trimmed;
  }
  return null;
}

function parseKeywords(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') {
    return value
      .split(/[,;|]/)
      .map(k => k.trim())
      .filter(Boolean)
      .join(', ');
  }
  if (Array.isArray(value)) {
    return value
      .map(k => (typeof k === 'string' ? k.trim() : ''))
      .filter(Boolean)
      .join(', ');
  }
  return '';
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function schemaRecipeToText(recipe: SchemaRecipe): string {
  const lines: string[] = [];

  const name = typeof recipe.name === 'string' ? stripHtml(recipe.name) : '';
  if (name) lines.push(name);

  const metaParts: string[] = [];
  const yieldValue = parseYield(recipe.recipeYield);
  if (yieldValue) metaParts.push(`Serves ${yieldValue}`);

  const prepMins = iso8601DurationToMinutes(
    typeof recipe.prepTime === 'string' ? recipe.prepTime : undefined
  );
  if (prepMins != null) metaParts.push(`Prep: ${prepMins} min`);

  const cookMins = iso8601DurationToMinutes(
    typeof recipe.cookTime === 'string' ? recipe.cookTime : undefined
  );
  if (cookMins != null) metaParts.push(`Cook: ${cookMins} min`);

  if (metaParts.length > 0) lines.push(metaParts.join(' | '));

  const description =
    typeof recipe.description === 'string' ? stripHtml(recipe.description) : '';
  if (description) {
    lines.push('');
    lines.push(description);
  }

  const tags = parseKeywords(recipe.keywords);
  if (tags) {
    lines.push('');
    lines.push(`Tags: ${tags}`);
  }

  const ingredients = normalizeStringArray(recipe.recipeIngredient).map(stripHtml);
  if (ingredients.length > 0) {
    lines.push('');
    lines.push('Ingredients');
    for (const ingredient of ingredients) {
      lines.push(`- ${ingredient}`);
    }
  }

  const steps = extractInstructionTexts(recipe.recipeInstructions).map(stripHtml);
  if (steps.length > 0) {
    lines.push('');
    lines.push('Instructions');
    steps.forEach((step, index) => {
      lines.push(`${index + 1}. ${step}`);
    });
  }

  return lines.join('\n').trim();
}

function isPrivateOrReservedIp(ip: string): boolean {
  if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') return true;

  if (isIP(ip) === 4) {
    const parts = ip.split('.').map(Number);
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }

  if (isIP(ip) === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::1') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    if (lower.startsWith('fe80')) return true;
    return false;
  }

  return true;
}

async function assertSafeUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new RecipeImportError('Please enter a valid URL.', 'invalid_url');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new RecipeImportError('Only http and https URLs are supported.', 'invalid_url');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new RecipeImportError('That URL is not allowed.', 'blocked_url');
  }

  if (isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new RecipeImportError('That URL is not allowed.', 'blocked_url');
    }
    return parsed;
  }

  try {
    const results = await lookup(hostname, { all: true });
    for (const result of results) {
      if (isPrivateOrReservedIp(result.address)) {
        throw new RecipeImportError('That URL is not allowed.', 'blocked_url');
      }
    }
  } catch (error) {
    if (error instanceof RecipeImportError) throw error;
    throw new RecipeImportError('Could not resolve that URL.', 'invalid_url');
  }

  return parsed;
}

async function fetchPageHtml(url: URL): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new RecipeImportError(
        `Could not fetch that page (HTTP ${response.status}).`,
        'fetch_failed'
      );
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType && !contentType.includes('text/html') && !contentType.includes('text/plain')) {
      throw new RecipeImportError('That URL did not return a web page.', 'fetch_failed');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new RecipeImportError('Could not read the page response.', 'fetch_failed');
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        throw new RecipeImportError('That page is too large to import.', 'fetch_failed');
      }
      chunks.push(value);
    }

    const buffer = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
    return buffer.toString('utf-8');
  } catch (error) {
    if (error instanceof RecipeImportError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new RecipeImportError('The request timed out. Try again.', 'fetch_failed');
    }
    throw new RecipeImportError('Could not fetch that page.', 'fetch_failed');
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchRecipeFromUrl(
  rawUrl: string
): Promise<{ sourceText: string; draft: ParsedRecipeDraft }> {
  const url = await assertSafeUrl(rawUrl);
  const html = await fetchPageHtml(url);
  const recipes = extractJsonLdRecipes(html);
  const recipe = pickBestRecipe(recipes);

  if (!recipe) {
    throw new RecipeImportError(
      'No structured recipe data found on this page.',
      'no_recipe'
    );
  }

  const sourceText = schemaRecipeToText(recipe);
  if (!sourceText.trim()) {
    throw new RecipeImportError(
      'No structured recipe data found on this page.',
      'no_recipe'
    );
  }

  const draft = parseRecipeText(sourceText);
  if (recipes.length > 1) {
    draft.warnings.unshift(
      'Multiple recipes were found on this page; the most complete one was imported.'
    );
  }

  return { sourceText, draft };
}
