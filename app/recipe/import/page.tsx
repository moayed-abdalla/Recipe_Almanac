'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RecipeForm } from '@/components/recipe/RecipeForm';
import { parseRecipeText, type ParsedRecipeDraft } from '@/lib/recipeTextParser';

const PLACEHOLDER = `Paste a full recipe here, for example:

Grandma's Banana Bread
Serves 8 | Prep: 15 min | Cook: 1 hour

Ingredients
- 3 ripe bananas, mashed
- 1/2 cup melted butter
- 200g sugar
- 1 1/2 cups flour
- 1 tsp baking soda
- pinch of salt

Instructions
1. Preheat the oven to 350°F.
2. Mix the bananas and butter, then stir in the sugar.
3. Fold in the flour, baking soda, and salt.
4. Bake for about 1 hour.

Notes
- Tastes even better the next day.`;

export default function RecipeImportPage() {
  const [recipeUrl, setRecipeUrl] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [rawText, setRawText] = useState('');
  const [parsedDraft, setParsedDraft] = useState<ParsedRecipeDraft | null>(null);
  const [parseKey, setParseKey] = useState(0);

  const handleParse = () => {
    const draft = parseRecipeText(rawText);
    setParsedDraft(draft);
    setParseKey(key => key + 1);
  };

  const handleImportLink = async () => {
    const url = recipeUrl.trim();
    if (!url) return;

    setLinkLoading(true);
    setLinkError('');

    try {
      const response = await fetch('/api/recipe/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = (await response.json()) as {
        error?: string;
        sourceText?: string;
        draft?: ParsedRecipeDraft;
      };

      if (!response.ok) {
        setLinkError(data.error ?? 'Could not import that recipe link.');
        return;
      }

      if (!data.sourceText || !data.draft) {
        setLinkError('Could not import that recipe link.');
        return;
      }

      setRawText(data.sourceText);
      setParsedDraft(data.draft);
      setParseKey(key => key + 1);
    } catch {
      setLinkError('Could not import that recipe link.');
    } finally {
      setLinkLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6 md:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Import Recipe</h1>
        <Link href="/recipe/create" className="btn btn-ghost btn-sm self-start sm:self-auto">
          ← Back to Create
        </Link>
      </div>

      <div className="space-y-4">
        <div className="form-control">
          <label className="label" htmlFor="recipe-import-link">
            <span className="label-text text-lg font-bold">Paste Recipe Link</span>
          </label>
          <input
            id="recipe-import-link"
            type="url"
            className="input input-bordered w-full"
            value={recipeUrl}
            onChange={e => setRecipeUrl(e.target.value)}
            placeholder="https://example.com/recipe"
          />
          <label className="label">
            <span className="label-text-alt opacity-70">
              Paste a recipe page URL. We&apos;ll pull structured recipe data when available.
            </span>
          </label>
        </div>

        <button
          type="button"
          className="btn btn-primary w-full sm:w-auto"
          onClick={handleImportLink}
          disabled={!recipeUrl.trim() || linkLoading}
        >
          {linkLoading ? 'Importing...' : 'Import from Link'}
        </button>

        {linkError && (
          <div className="alert alert-error">
            <span>{linkError}</span>
          </div>
        )}

        <div className="divider">or paste text</div>

        <div className="form-control">
          <label className="label" htmlFor="recipe-import-text">
            <span className="label-text text-lg font-bold">Paste recipe text</span>
          </label>
          <textarea
            id="recipe-import-text"
            className="textarea textarea-bordered w-full min-h-[220px] font-mono text-sm"
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder={PLACEHOLDER}
          />
          <label className="label">
            <span className="label-text-alt opacity-70">
              We&apos;ll do our best to sort this into the right fields. Review and edit everything below before saving.
            </span>
          </label>
        </div>

        <button
          type="button"
          className="btn btn-primary w-full sm:w-auto"
          onClick={handleParse}
          disabled={!rawText.trim()}
        >
          {parsedDraft ? 'Re-parse Recipe' : 'Parse Recipe'}
        </button>
      </div>

      {parsedDraft && (
        <>
          {parsedDraft.warnings.length > 0 && (
            <div className="alert alert-info mt-6 flex-col items-start gap-1">
              <span className="font-semibold">Heads up:</span>
              <ul className="list-disc list-inside text-sm">
                {parsedDraft.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="divider mt-6">Review &amp; edit</div>

          <RecipeForm key={parseKey} draft={parsedDraft} hideHeader />
        </>
      )}
    </div>
  );
}
