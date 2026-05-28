/**
 * Recipe Almanac PDF Generator
 *
 * Generates a branded multi-recipe PDF "almanac". Each recipe starts on a new
 * page and follows the site's visual identity (theme primary color, typewriter
 * headings, Arial body, colourised logo).
 *
 * The PDF is rendered client-side using jsPDF (no native fonts required —
 * built-in Courier mimics the "Special Elite" typewriter style).
 */

import { jsPDF } from 'jspdf';

/** Full recipe payload required to render a single PDF page. */
export interface AlmanacRecipe {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  tags: string[];
  method_steps: string[];
  notes: string[];
  ingredients: AlmanacIngredient[];
  author_username?: string | null;
}

export interface AlmanacIngredient {
  name: string;
  display_amount: number;
  unit: string;
}

/** Active theme colors sampled at PDF-generation time. */
export interface AlmanacBrand {
  /** Hex — main accent (buttons, headings) */
  primary: string;
  /** Hex — background fill */
  background: string;
  /** Hex — body text */
  text: string;
  /** Hex — image/logo tint colour (matches --theme-image-color) */
  imageColor: string;
  /** 'light' | 'dark' — used to pick contrast band colors */
  mode: 'light' | 'dark';
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Convert a hex color (#RRGGBB or #RGB) to an RGB tuple.
 */
function hexToRgb(hex: string): RGB {
  const cleaned = hex.replace('#', '').trim();
  const expanded =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((c) => c + c)
          .join('')
      : cleaned;
  const num = parseInt(expanded || '000000', 16);
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}

/**
 * Apply a tint to a logo PNG by using its alpha channel as a mask.
 * Mirrors the CSS `logo-colorized` effect used in the site header.
 */
async function colourizeLogo(
  imageUrl: string,
  hexColor: string
): Promise<string | null> {
  try {
    const img = await loadImageElement(imageUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = hexColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(img, 0, 0);

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('[almanacPdf] Logo colourization failed:', err);
    return null;
  }
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (event) => reject(event);
    img.src = url;
  });
}

/**
 * Fetch a remote image and return a data URL plus dimensions.
 * Returns null on CORS / network failure so callers can render text-only.
 */
async function loadImageAsDataUrl(
  url: string
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const img = await loadImageElement(dataUrl);
    return {
      dataUrl,
      width: img.naturalWidth,
      height: img.naturalHeight,
    };
  } catch (err) {
    console.warn('[almanacPdf] Image load failed:', url, err);
    return null;
  }
}

// Page geometry (A4, millimetres)
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_X = 18;
const MARGIN_TOP = 22;
const MARGIN_BOTTOM = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

// Typography (line-height factor for splitTextToSize manual wrapping)
const LINE_HEIGHT_FACTOR = 1.35;

/** Convert a jsPDF point size to its baseline-to-baseline mm height. */
function lineHeightMm(fontSizePt: number): number {
  return (fontSizePt * LINE_HEIGHT_FACTOR) / 2.83465; // 1mm = 2.83465pt
}

interface PageContext {
  doc: jsPDF;
  brand: AlmanacBrand;
  logoDataUrl: string | null;
  /** Current Y cursor (mm) */
  y: number;
  /** Title of the recipe currently being rendered — used for the running header. */
  recipeTitle: string;
  /** Page index within this recipe (1-based) — used for "(continued)" markers. */
  recipePage: number;
}

/**
 * Draw the running header band at the top of the current page.
 * Header contains a coloured strip + colourised logo + "Recipe Almanac" wordmark.
 */
function drawHeader(ctx: PageContext) {
  const { doc, brand, logoDataUrl } = ctx;
  const primary = hexToRgb(brand.primary);

  // Thin colored top strip
  doc.setFillColor(primary.r, primary.g, primary.b);
  doc.rect(0, 0, PAGE_WIDTH, 4, 'F');

  // Logo (colourised PNG sits inside header band)
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', MARGIN_X, 7, 10, 10, undefined, 'FAST');
    } catch (err) {
      // Ignore logo errors — header will still render the wordmark.
      console.warn('[almanacPdf] Could not add logo image:', err);
    }
  }

  // Wordmark
  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.text('Recipe Almanac', MARGIN_X + 12.5, 14.5);

  // Right side: "(continued)" hint when this is the 2+ page of a recipe
  if (ctx.recipePage > 1 && ctx.recipeTitle) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    const truncated = truncate(`${ctx.recipeTitle} (continued)`, 60);
    const textWidth = doc.getTextWidth(truncated);
    doc.text(truncated, PAGE_WIDTH - MARGIN_X - textWidth, 14.5);
  }
}

/** Draw a thin footer line + page number on the current page. */
function drawFooter(ctx: PageContext, totalPages?: number) {
  const { doc, brand } = ctx;
  const text = hexToRgb(brand.text);
  doc.setDrawColor(text.r, text.g, text.b);
  doc.setLineWidth(0.1);
  doc.line(MARGIN_X, PAGE_HEIGHT - MARGIN_BOTTOM + 4, PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - MARGIN_BOTTOM + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(text.r, text.g, text.b);

  const pageNum = doc.getCurrentPageInfo().pageNumber;
  const label = totalPages ? `${pageNum} / ${totalPages}` : String(pageNum);
  const tw = doc.getTextWidth(label);
  doc.text(label, (PAGE_WIDTH - tw) / 2, PAGE_HEIGHT - MARGIN_BOTTOM + 9);

  // Brand attribution on the left
  doc.text('recipealmanac.xyz', MARGIN_X, PAGE_HEIGHT - MARGIN_BOTTOM + 9);
}

/** Add a new page and re-draw the running header for the same recipe. */
function newRecipeContinuationPage(ctx: PageContext) {
  ctx.doc.addPage();
  ctx.recipePage += 1;
  ctx.y = MARGIN_TOP;
  drawHeader(ctx);
}

/** Ensure `needed` mm of vertical space — paginating if necessary. */
function ensureSpace(ctx: PageContext, needed: number) {
  if (ctx.y + needed > PAGE_HEIGHT - MARGIN_BOTTOM) {
    newRecipeContinuationPage(ctx);
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '\u2026';
}

interface TextOptions {
  font?: 'helvetica' | 'courier' | 'times';
  style?: 'normal' | 'bold' | 'italic' | 'bolditalic';
  size?: number;
  color?: RGB;
  /** Extra space (mm) after the block. */
  paragraphSpacing?: number;
  align?: 'left' | 'center' | 'right';
  x?: number;
  maxWidth?: number;
}

/** Write a (possibly multi-line) text block with auto-pagination. */
function writeText(ctx: PageContext, text: string, opts: TextOptions = {}) {
  const {
    font = 'helvetica',
    style = 'normal',
    size = 11,
    color = hexToRgb(ctx.brand.text),
    paragraphSpacing = 0,
    align = 'left',
    x = MARGIN_X,
    maxWidth = CONTENT_WIDTH,
  } = opts;

  const { doc } = ctx;
  doc.setFont(font, style);
  doc.setFontSize(size);
  doc.setTextColor(color.r, color.g, color.b);

  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  const lh = lineHeightMm(size);

  lines.forEach((line) => {
    ensureSpace(ctx, lh);
    if (align === 'center') {
      const tw = doc.getTextWidth(line);
      doc.text(line, x + (maxWidth - tw) / 2, ctx.y);
    } else if (align === 'right') {
      const tw = doc.getTextWidth(line);
      doc.text(line, x + maxWidth - tw, ctx.y);
    } else {
      doc.text(line, x, ctx.y);
    }
    ctx.y += lh;
  });

  if (paragraphSpacing > 0) {
    ctx.y += paragraphSpacing;
  }
}

/** Draw a section heading (typewriter font, primary colour, underline rule). */
function writeSectionHeading(ctx: PageContext, label: string) {
  const primary = hexToRgb(ctx.brand.primary);
  ensureSpace(ctx, 12);
  writeText(ctx, label, {
    font: 'courier',
    style: 'bold',
    size: 14,
    color: primary,
  });
  // Underline rule
  ctx.doc.setDrawColor(primary.r, primary.g, primary.b);
  ctx.doc.setLineWidth(0.4);
  ctx.doc.line(MARGIN_X, ctx.y - 1, MARGIN_X + 35, ctx.y - 1);
  ctx.y += 2;
}

/** Format an ingredient as a single line of text. */
function formatIngredient(ing: AlmanacIngredient): string {
  const amount = roundTo(ing.display_amount, 2);
  const unit = ing.unit?.trim() ?? '';
  const isOther = !unit || unit.toLowerCase() === 'other';
  if (isOther) {
    return `${amount} ${ing.name}`.trim();
  }
  return `${amount} ${unit} ${ing.name}`.trim();
}

function roundTo(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return '0';
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  return String(rounded);
}

/**
 * Render the cover page (logo + title + owner name + recipe count).
 */
function drawCoverPage(ctx: PageContext, ownerName: string, recipeCount: number) {
  const { doc, brand, logoDataUrl } = ctx;
  const primary = hexToRgb(brand.primary);
  const text = hexToRgb(brand.text);

  doc.setFillColor(primary.r, primary.g, primary.b);
  doc.rect(0, 0, PAGE_WIDTH, 4, 'F');
  doc.rect(0, PAGE_HEIGHT - 4, PAGE_WIDTH, 4, 'F');

  let y = 60;

  if (logoDataUrl) {
    const logoSize = 60;
    try {
      doc.addImage(
        logoDataUrl,
        'PNG',
        (PAGE_WIDTH - logoSize) / 2,
        y,
        logoSize,
        logoSize,
        undefined,
        'FAST'
      );
    } catch (err) {
      console.warn('[almanacPdf] Could not add cover logo:', err);
    }
    y += logoSize + 12;
  }

  doc.setFont('courier', 'bold');
  doc.setFontSize(32);
  doc.setTextColor(primary.r, primary.g, primary.b);
  const title = 'Recipe Almanac';
  const titleW = doc.getTextWidth(title);
  doc.text(title, (PAGE_WIDTH - titleW) / 2, y);
  y += 14;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(14);
  doc.setTextColor(text.r, text.g, text.b);
  const subtitle = ownerName ? `${ownerName}'s Cookbook` : 'Your Personal Cookbook';
  const subW = doc.getTextWidth(subtitle);
  doc.text(subtitle, (PAGE_WIDTH - subW) / 2, y);
  y += 10;

  doc.setFont('courier', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(text.r, text.g, text.b);
  const countLabel = `${recipeCount} ${recipeCount === 1 ? 'recipe' : 'recipes'}`;
  const countW = doc.getTextWidth(countLabel);
  doc.text(countLabel, (PAGE_WIDTH - countW) / 2, y);

  // Decorative line
  doc.setDrawColor(primary.r, primary.g, primary.b);
  doc.setLineWidth(0.6);
  doc.line(PAGE_WIDTH / 2 - 25, y + 8, PAGE_WIDTH / 2 + 25, y + 8);

  // Footer line for cover
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(text.r, text.g, text.b);
  const date = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const dateW = doc.getTextWidth(date);
  doc.text(date, (PAGE_WIDTH - dateW) / 2, PAGE_HEIGHT - 20);
}

/**
 * Render a single recipe page (auto-paginates within itself if needed).
 * Caller must have already invoked doc.addPage() before calling this.
 */
async function drawRecipePage(ctx: PageContext, recipe: AlmanacRecipe) {
  ctx.recipeTitle = recipe.title;
  ctx.recipePage = 1;
  ctx.y = MARGIN_TOP;
  drawHeader(ctx);

  const primary = hexToRgb(ctx.brand.primary);
  const textColor = hexToRgb(ctx.brand.text);

  // Recipe title
  writeText(ctx, recipe.title, {
    font: 'courier',
    style: 'bold',
    size: 22,
    color: primary,
    paragraphSpacing: 1,
  });

  // Author byline
  if (recipe.author_username) {
    writeText(ctx, `by ${recipe.author_username}`, {
      font: 'helvetica',
      style: 'italic',
      size: 11,
      color: textColor,
      paragraphSpacing: 3,
    });
  } else {
    ctx.y += 1;
  }

  // Recipe image (centered, scaled to width)
  if (recipe.image_url) {
    const loaded = await loadImageAsDataUrl(recipe.image_url);
    if (loaded) {
      const maxWidth = CONTENT_WIDTH;
      const maxHeight = 80;
      const ratio = loaded.width / loaded.height;
      let imgW = maxWidth;
      let imgH = imgW / ratio;
      if (imgH > maxHeight) {
        imgH = maxHeight;
        imgW = imgH * ratio;
      }
      ensureSpace(ctx, imgH + 4);
      const x = MARGIN_X + (CONTENT_WIDTH - imgW) / 2;
      try {
        // Detect format by data URL header (jpeg vs png)
        const format = loaded.dataUrl.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
        ctx.doc.addImage(loaded.dataUrl, format, x, ctx.y, imgW, imgH, undefined, 'FAST');
        ctx.y += imgH + 5;
      } catch (err) {
        console.warn('[almanacPdf] Could not add recipe image:', err);
      }
    }
  }

  // Tags
  if (recipe.tags && recipe.tags.length > 0) {
    const tagsText = recipe.tags.map((t) => `#${t}`).join('   ');
    writeText(ctx, tagsText, {
      font: 'helvetica',
      style: 'normal',
      size: 9,
      color: { r: Math.min(textColor.r + 60, 255), g: Math.min(textColor.g + 60, 255), b: Math.min(textColor.b + 60, 255) },
      paragraphSpacing: 3,
    });
  }

  // Description
  if (recipe.description) {
    writeText(ctx, recipe.description, {
      font: 'helvetica',
      style: 'normal',
      size: 11,
      color: textColor,
      paragraphSpacing: 5,
    });
  }

  // Ingredients
  if (recipe.ingredients.length > 0) {
    writeSectionHeading(ctx, 'Ingredients');
    recipe.ingredients.forEach((ing) => {
      const line = `\u2022  ${formatIngredient(ing)}`;
      writeText(ctx, line, {
        font: 'helvetica',
        style: 'normal',
        size: 11,
        color: textColor,
        x: MARGIN_X + 2,
        maxWidth: CONTENT_WIDTH - 2,
      });
    });
    ctx.y += 3;
  }

  // Method
  if (recipe.method_steps.length > 0) {
    writeSectionHeading(ctx, 'Method');
    recipe.method_steps.forEach((step, idx) => {
      const prefix = `${idx + 1}.`;
      // Render the number in primary color, then the body
      ensureSpace(ctx, lineHeightMm(11));
      ctx.doc.setFont('helvetica', 'bold');
      ctx.doc.setFontSize(11);
      ctx.doc.setTextColor(primary.r, primary.g, primary.b);
      ctx.doc.text(prefix, MARGIN_X, ctx.y);
      const indent = 7;
      const lines = ctx.doc.splitTextToSize(step, CONTENT_WIDTH - indent) as string[];
      ctx.doc.setFont('helvetica', 'normal');
      ctx.doc.setTextColor(textColor.r, textColor.g, textColor.b);
      lines.forEach((line, i) => {
        if (i > 0) {
          ensureSpace(ctx, lineHeightMm(11));
        }
        ctx.doc.text(line, MARGIN_X + indent, ctx.y);
        ctx.y += lineHeightMm(11);
      });
      ctx.y += 1.5;
    });
    ctx.y += 3;
  }

  // Notes
  if (recipe.notes && recipe.notes.length > 0) {
    writeSectionHeading(ctx, 'Notes');
    recipe.notes.forEach((note) => {
      writeText(ctx, `\u2022  ${note}`, {
        font: 'helvetica',
        style: 'italic',
        size: 10,
        color: textColor,
        x: MARGIN_X + 2,
        maxWidth: CONTENT_WIDTH - 2,
      });
    });
  }
}

/**
 * Main entry point — builds the PDF in memory, paginates each recipe onto its
 * own page (1+ pages each), then triggers a browser download.
 */
export async function generateAlmanacPdf(
  recipes: AlmanacRecipe[],
  brand: AlmanacBrand,
  options: { ownerName?: string; filename?: string; logoUrl?: string } = {}
): Promise<void> {
  if (!recipes.length) {
    throw new Error('No recipes provided for almanac PDF generation.');
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const logoDataUrl = await colourizeLogo(
    options.logoUrl || '/logo.png',
    brand.primary
  );

  const ctx: PageContext = {
    doc,
    brand,
    logoDataUrl,
    y: MARGIN_TOP,
    recipeTitle: '',
    recipePage: 1,
  };

  // Cover page (uses the default first page)
  drawCoverPage(ctx, options.ownerName ?? '', recipes.length);

  for (const recipe of recipes) {
    doc.addPage();
    await drawRecipePage(ctx, recipe);
  }

  // Footers + page numbers (must run after all pages exist)
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p += 1) {
    doc.setPage(p);
    if (p === 1) {
      // Cover already has its own bottom decoration — skip the regular footer
      continue;
    }
    drawFooter(ctx, total);
  }

  const filename =
    options.filename ||
    `recipe-almanac-${(options.ownerName || 'cookbook').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
  doc.save(filename);
}
