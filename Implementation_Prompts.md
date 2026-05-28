# Recipe Almanac — Implementation Prompts

Each section below is a **self-contained prompt** designed to be pasted into a fresh agent chat (with no prior history). They can all be run in **parallel**, but note: prompts that touch the same database tables or files should be sequenced or carefully merged afterwards — flagged in each prompt as **⚠ Coordination Notes**.

---

## Shared context (every prompt assumes this)

All prompts below assume the agent has access to the `Recipe_Almanac` Next.js project. Key facts the agent should know up front:

- **Stack:** Next.js 14 (App Router, TypeScript), Tailwind CSS + DaisyUI, Supabase (Postgres + Auth + Storage), deployed on Vercel.
- **Server vs client clients:** `lib/supabase.ts` (`createServerClient`) for RSC/route handlers; `lib/supabase-client.ts` (`supabaseClient`) for client components.
- **Auth pattern:** RLS is enabled on every table. The user is fetched via `supabaseClient.auth.getUser()` on the client or `(await createServerClient()).auth.getUser()` on the server.
- **DB tables that already exist:** `profiles`, `recipes`, `ingredients`, `saved_recipes`, `feedback`.
- **Theming:** Themes are applied via the `data-theme` attribute on `<html>` (e.g. `light-orange`, `dark-orange`). Theme tokens are defined in `lib/theme-config.ts`. Always use DaisyUI semantic colors (`bg-base-100`, `text-base-content`, `btn-primary`, etc.) — **never hardcode hex values**.
- **Fonts:** Use existing classes `special-elite-regular` (typewriter headings) and `arial-font` (body) to match the rest of the site.
- **Project principles (NON-NEGOTIABLE):** No ads, no email collection beyond auth, no marketing copy, no popups, no analytics beyond the existing Google Analytics tag in `app/layout.tsx`. UI must remain clean and chemistry/almanac-themed.
- **Unit system:** Ingredients are stored as `amount_grams` (base unit) plus a `display_amount` + `unit` for the original input. `utils/unitConverter.ts` handles all conversion and ingredient density lookups via `INGREDIENT_DENSITIES`.
- **Schema changes:** The database lives in the user's Supabase project. Do NOT try to apply migrations automatically — produce a clearly-labelled SQL block the user can paste into the Supabase SQL Editor, and include any required RLS policies.
- **Bad-word filter:** User-generated text fields (comments, reviews, etc.) should be filtered through `utils/badWords.ts`.
- **Linter / lints:** Run `ReadLints` on every file edited and fix anything introduced.
- **Don't add comments that just narrate the code.** Comments only for non-obvious intent.

---

## Prompt 1 — Servings / Prep Time / Cook Time fields

> **⚠ Coordination Notes:** Touches `recipes` table, `app/recipe/create/page.tsx`, `app/recipe/[id]/RecipeDetailPage.tsx`, `app/recipe/[id]/RecipePageClient.tsx`. Safe to run alongside any other prompt that doesn't add columns to `recipes`.

```
You are working in the Recipe_Almanac Next.js project (App Router, TypeScript, Tailwind+DaisyUI, Supabase). Read README.md and the project structure before editing. Use DaisyUI semantic colors and existing fonts (`special-elite-regular`, `arial-font`). Do NOT use emojis in code or UI.

GOAL
Add three optional fields to recipes: `servings` (integer), `prep_time_minutes` (integer), `cook_time_minutes` (integer). Surface them in the create/edit form, the recipe detail page, and the JSON-LD structured data. Update the scale multiplier so that, when servings is set, the controls show "Serves N" / "Serves 2N" instead of abstract "0.5x / 2x".

DATABASE
Produce a SQL block (for the user to paste into Supabase SQL Editor) that:
1. Adds `servings INT NULL`, `prep_time_minutes INT NULL`, `cook_time_minutes INT NULL` to the `recipes` table.
2. Confirms (don't recreate) that RLS policies on `recipes` already allow owner UPDATE — if not, output a note.
All three fields must be optional everywhere — never block submission for missing values.

FILES TO TOUCH
- `types/index.ts`: extend the `Recipe` interface with the three new optional fields.
- `app/recipe/create/page.tsx` (the `RecipeForm` component): add three number inputs below the existing description field, in a single responsive row. Validate non-negative integers. Persist on create and edit. Re-read the file before editing — it already handles edit mode via the `recipe` prop.
- `app/recipe/[id]/RecipeDetailPage.tsx`: include `servings`, `prep_time_minutes`, `cook_time_minutes` in the recipe select. Add them to the JSON-LD `Recipe` object as `recipeYield` (e.g. `"4 servings"`), `prepTime` and `cookTime` in ISO 8601 duration format (`"PT20M"`). Also compute `totalTime` if both are present.
- `app/recipe/[id]/RecipePageClient.tsx`:
  - Display a small metadata strip below the title — three pill-style chips ("Serves 4", "Prep 15 min", "Cook 45 min") only rendered when each value is present.
  - Modify the scale multiplier section: if `servings` is set, show buttons labelled "Serves N/2", "Serves N", "Serves 2N" (rounding up to nearest whole number) instead of "0.5x / 1x / 2x". Keep the underlying multiplier math identical. The Custom input becomes "Custom servings".
- `components/RecipeCard.tsx`: optionally show a tiny "⏱ X min" total-time hint in the card meta row only when total time is set (no icon — use the word "min").
- `app/almanac/page.tsx`, `app/profile/[username]/ProfileViewPage.tsx`, `app/leaderboard/page.tsx`, `app/HomePage.tsx`: ensure their `select(...)` queries include the new columns where the card or detail page uses them.

ACCEPTANCE
- Existing recipes (with all three fields NULL) render exactly as before — no empty pills, no broken layout.
- Creating a recipe without filling in the new fields works fine.
- A recipe with servings=4 + cook_time=45 shows two pills ("Serves 4", "Cook 45 min") and the multiplier controls read "Serves 2 / Serves 4 / Serves 8".
- JSON-LD validates against Google's Rich Results test for any recipe that has servings + a time.
- Run lints, fix anything introduced.
```

---

## Prompt 2 — Auto-generated shopping list

> **⚠ Coordination Notes:** Creates a new route `/shopping-list`. Reads `recipes` and `ingredients`. Safe to run in parallel with all other prompts.

```
You are working in the Recipe_Almanac Next.js project (App Router, TypeScript, Tailwind+DaisyUI, Supabase). Reuse the patterns from `app/prepare_almanac/page.tsx` — that page already implements multi-recipe selection with checkboxes grouped by Public/Private/Favorites. Do NOT use emojis in code or UI. Use DaisyUI semantic colors and existing fonts.

GOAL
Build a new "Shopping List" page that lets a logged-in user pick recipes (from their own + favourites), then renders a consolidated, deduplicated ingredient list grouped by ingredient name. Provide Copy-to-Clipboard, Print, and Download-as-PDF options.

ROUTE & FILE
- New page: `app/shopping_list/page.tsx` (snake_case to match `prepare_almanac`). Add a `layout.tsx` next to it if `prepare_almanac` has one — mirror that pattern.
- Add a link in:
  - The user dropdown in `components/Header.tsx` (between "My Almanac" and "Create Recipe").
  - The action buttons row at the top of `app/almanac/page.tsx` (a third button next to "Add Recipe" and "Download Your Recipe Book").

UI
- Two-column layout on `lg+` (recipe picker on the left, live shopping list on the right). Single column below `lg`. Mirror the structure used by `app/prepare_almanac/page.tsx`.
- The left column: same selection grouping as `prepare_almanac` (Public / Private / Favourites with select-all / mine-only / clear).
- The right column: live-updating consolidated list.
- Action bar at the bottom: "Copy to clipboard", "Print", "Download PDF".

CONSOLIDATION LOGIC
- Group ingredients by case-insensitive trimmed `name`.
- For each ingredient group:
  - If all entries share a unit family (all volume / all weight), sum within that family in its preferred display unit (prefer cups for volume, grams for weight ≥ 100g, otherwise keep grams).
  - If they mix volume and weight: convert everything to grams using `utils/unitConverter.ts` and `INGREDIENT_DENSITIES`. If a density is unavailable, list the unconvertable entries as separate sub-bullets under the same ingredient header instead of forcing a wrong conversion.
  - "Other"-unit entries: sum the raw display amounts and append "(units)" — never auto-convert.
- Apply any per-recipe scale multiplier the user has set on this page (default 1x). Provide an inline scale input next to each selected recipe in the picker.

OUTPUTS
- Copy-to-clipboard: a clean plain-text list, one ingredient per line ("250 g flour", "3 cups milk", etc.).
- Print: triggers `window.print()`. Add a print stylesheet (scoped via `@media print` in `app/globals.css` or a dedicated `.print-only` class) that hides the header, footer, picker, and action bar, and prints only the consolidated list with the user's username and the date at the top.
- PDF: reuse `lib/almanacPdf.ts`'s `jsPDF` setup. Add a new exported helper `generateShoppingListPdf(items, brand, owner)` that produces a single-page, branded list using the same colour-sampling pattern as `generateAlmanacPdf`. Do NOT duplicate brand-reading logic — refactor any shared helpers into `lib/almanacPdf.ts` exports if needed.

ACCEPTANCE
- Selecting 0 recipes shows an empty state ("Pick recipes on the left to start your shopping list").
- Two recipes that both call for "flour" (one 200 g, one 1 cup) produce a single "flour" line with the correct total in grams.
- The Copy button shows a brief inline confirmation ("Copied!") that disappears after ~2 s.
- Print preview shows only the list, not the rest of the chrome.
- The page requires auth — redirect via `useAuth({ requireAuth: true })` like `prepare_almanac` does.
- Run lints, fix anything introduced.
```

---

## Prompt 3 — In-step cook timers

> **⚠ Coordination Notes:** Touches `app/recipe/[id]/RecipePageClient.tsx`. May conflict with Prompt 1 if both edit method-step rendering — merge carefully.

```
You are working in the Recipe_Almanac Next.js project (App Router, TypeScript, Tailwind+DaisyUI, Supabase). Read `app/recipe/[id]/RecipePageClient.tsx` first — it already implements the Wake Lock feature you should sit alongside. Use DaisyUI semantic colors and existing fonts. No emojis.

GOAL
Detect time phrases in recipe method steps and render an inline "Start N-minute timer" button next to the detected phrase. When clicked, the timer counts down in place, plays a soft chime when finished, and can be paused / reset. Multiple timers can run simultaneously.

DETECTION
- Scan each entry in `recipe.method_steps`. Use a regex like:
  `/(\d+(?:\.\d+)?)\s*(?:to|–|-|—)?\s*(?:(\d+(?:\.\d+)?))?\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/gi`
- If a range is matched (e.g. "5–7 minutes"), use the upper bound as the default but expose a small dropdown letting the user pick lower / upper.
- Convert everything to seconds for the underlying countdown.
- Highlight the matched substring (subtle `bg-primary/10` underline span) and attach a small "Start Nm" button immediately after it.

UI / BEHAVIOUR
- Create a new client component `components/recipe/StepTimers.tsx` that:
  - Receives a method step string and an index.
  - Renders the string with detected time phrases tokenised into inline timer buttons.
  - Each timer button toggles between three states: idle → running (showing "01:23 ▶ pause") → finished (showing "Done — restart"). Use DaisyUI badge / btn-xs styling.
  - State lives in component-local React state (no DB persistence needed).
- Replace the current plain `{step}` render inside the "Method Section" of `RecipePageClient.tsx` with `<StepTimers step={step} index={index} />`.

CHIME
- Add a small WebAudio-based beep (3 short tones, fading) — do NOT bundle an audio file. Generate the tones with `AudioContext` to keep the bundle small.
- Respect `prefers-reduced-motion` by skipping any UI animation on the running button. Also expose a small mute toggle (icon button only) somewhere reasonable on the page — persist the mute preference in `localStorage` under `recipe-timer-muted`.

WAKE LOCK INTEGRATION
- When any timer starts running and the Wake Lock isn't currently active, automatically request it (using the existing `requestWakeLock` logic — refactor if needed so both timers and the existing toggle can call it).
- Release the Wake Lock automatically only if (a) all timers are finished/idle AND (b) the user had not toggled the manual Wake Lock button.

ACCEPTANCE
- "Bake for 30 minutes" gets a "Start 30m" button.
- "Simmer for 5 to 7 minutes" gets a button defaulting to 7 minutes plus a dropdown.
- Two timers can run at once; both count down independently.
- A finished timer plays the chime once and shows "Done — restart".
- Closing the tab cancels the timers (acceptable). Navigating between pages also cancels.
- Run lints, fix anything introduced.
```

---

## Prompt 5 — Ratings + short reviews

> **⚠ Coordination Notes:** Adds two new tables (`recipe_ratings`, `recipe_reviews`). Touches `app/leaderboard/page.tsx` (leaderboard scoring), `app/recipe/[id]/RecipeDetailPage.tsx`, `components/RecipeCard.tsx`. May conflict with Prompt 1 (recipe page edits) — merge carefully.

```
You are working in the Recipe_Almanac Next.js project (App Router, TypeScript, Tailwind+DaisyUI, Supabase). Read `app/leaderboard/page.tsx`, `app/recipe/[id]/RecipePageClient.tsx`, and `utils/badWords.ts` first. Use DaisyUI semantic colors and existing fonts. No emojis.

GOAL
Add a 1-to-5-star rating + an optional short text review (max 250 characters) per user per public recipe. Show an average rating + rating count on the recipe page and on every recipe card. Incorporate ratings into the leaderboard score WITHOUT removing the existing "favourites are still the strongest signal" rule.

DATABASE
Produce a SQL block for the user to paste into the Supabase SQL Editor:

```sql
CREATE TABLE recipe_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT NULL CHECK (review IS NULL OR char_length(review) <= 250),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (recipe_id, user_id)
);

ALTER TABLE recipe_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ratings_select_public_recipes" ON recipe_ratings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_ratings.recipe_id AND r.is_public = true)
  );
CREATE POLICY "ratings_insert_own" ON recipe_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ratings_update_own" ON recipe_ratings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ratings_delete_own" ON recipe_ratings
  FOR DELETE USING (auth.uid() = user_id);
```

Also add a Postgres view `recipe_rating_stats` exposing `(recipe_id, rating_count, average_rating)` to keep client queries cheap.

UI — RECIPE PAGE
- Add a `components/recipe/RecipeRatings.tsx` client component embedded just below the Notes section of `RecipePageClient.tsx`.
- The component:
  - Shows average rating (large stars + "X.X out of 5 · N ratings") read from the new view.
  - If the viewer is logged in, NOT the owner, and the recipe is public: show their own current rating as 5 interactive star icons (filled/outline). Clicking a star upserts their rating.
  - Below the stars, show a textarea (`maxLength=250`) with a Twitter-style countdown ("234 / 250") that turns warning amber at 25 left and error red at 0. Save button uses `supabaseClient.from('recipe_ratings').upsert(...)`.
  - Before saving the review, run the text through `utils/badWords.ts` — if it trips the filter, show an inline error ("Please remove inappropriate language") and refuse to save.
  - Show the list of reviews below: review text, star count, author username (link to their profile), and relative time ("3 days ago"). Authors can edit/delete their own.
- Owners cannot rate their own recipe (show an inline note instead).

UI — CARDS
- `components/RecipeCard.tsx`: add an extra meta entry "★ 4.6 (23)" between "by X" and view count. Hide entirely when there are no ratings.
- Include average + count in the queries on `app/HomePage.tsx`, `app/almanac/page.tsx`, `app/leaderboard/page.tsx`, and `app/profile/[username]/ProfileViewPage.tsx`. Select via `recipe_rating_stats` join or a Supabase view embed.

LEADERBOARD SCORE
- Update `app/leaderboard/page.tsx`. New formula:
  - `score = favourites × 4 + ratings_count × 2 + round(average_rating × ratings_count × 1) + views × 1`
  - This keeps favourites as the dominant "super-like" signal (still worth 4 each), gives ratings real weight without overpowering favourites, and still rewards views.
  - Update the page's description text to reflect the new formula.

ACCEPTANCE
- A logged-out user sees the average + reviews but cannot rate (the stars are disabled with a tooltip "Log in to rate").
- A user can only have one rating per recipe; upserting works.
- Reviews containing words from `badWords.ts` are rejected client-side AND a DB trigger or RLS check should also reject (add a row-level check or DB trigger — produce SQL for that too).
- The character countdown updates live and styling changes correctly at 25 left and 0 left.
- Run lints, fix anything introduced.
```

---

## Prompt 6 — Print-friendly single-recipe view

> **⚠ Coordination Notes:** Adds `app/recipe/[id]/print/page.tsx` and touches `app/globals.css`. Touches `app/recipe/[id]/RecipePageClient.tsx` (small additions). Safe to run in parallel with most prompts; coordinate with Prompts 1, 3, 5 if all editing recipe page.

```
You are working in the Recipe_Almanac Next.js project (App Router, TypeScript, Tailwind+DaisyUI, Supabase). Read `app/recipe/[id]/RecipeDetailPage.tsx` and `app/recipe/[id]/RecipePageClient.tsx` first. Use DaisyUI semantic colors and existing fonts. No emojis.

GOAL
Provide a dedicated, print-optimised view of a single recipe at `/recipe/[id]/print`. It should fit cleanly on one A4 / Letter page when possible (multi-page is acceptable if recipe is long) and respect the user's currently-applied scale multiplier and per-ingredient unit choices.

ROUTE
- Create `app/recipe/[id]/print/page.tsx`. Reuse `RecipeDetailPage.tsx`'s data-fetching pattern (fetch recipe + ingredients by slug, respect privacy/RLS).
- Create a sibling client component `app/recipe/[id]/print/PrintView.tsx` that renders the printable layout.

PASSING SCALE / UNIT STATE
- The simplest cross-tab transfer: read `multiplier` and `unitOverrides` (a JSON map of ingredientId → unit) from URL search params on the print page (e.g. `/recipe/my-cake/print?m=2&u=<base64-json>`).
- In `RecipePageClient.tsx` add a small "Print" icon button next to the existing Wake Lock / Fork / Edit / Favorite cluster. Clicking it opens the print route in a new tab with the current multiplier + per-ingredient units encoded in the URL, then immediately calls `window.print()` on the new tab once it loads (use an `onLoad` effect inside `PrintView.tsx` triggered when `?auto=1` is present).

LAYOUT
- White background regardless of theme (override using `bg-white text-black` on the print container).
- Show: title, author username, optional servings/timing (if Prompt 1 lands), tags as inline text, description, ingredients (scaled + chosen units), method steps, notes.
- Hide: site `Header`, `Footer`, `BackgroundMaskPositions`, favorite/fork/edit/print/wake-lock buttons, view count, related actions.
- Either:
  - Render the page with the global Header/Footer absent by using a route-group layout (`app/recipe/[id]/print/layout.tsx` that does NOT include them and overrides `globals.css` background), OR
  - Add an `@media print` block in `globals.css` that hides `.no-print` elements and gives `.print-page` clean styling. Pick whichever is less invasive — preference: route group.
- Typography: `special-elite-regular` for headings, `arial-font` body, single column, generous margins, no images cropped awkwardly (set image `max-height: 12cm`).

ACCEPTANCE
- Opening `/recipe/<slug>/print?m=2` shows ingredients doubled.
- Private recipes still respect ownership in the print route.
- `window.print()` preview shows ONLY the recipe content — no header, no footer, no background masks, no buttons.
- A 5-ingredient, 5-step recipe fits comfortably on one A4 page.
- Run lints, fix anything introduced.
```

---

## Prompt 7 — Import recipe from URL

> **⚠ Coordination Notes:** Adds `app/api/recipes/import/route.ts` and edits `app/recipe/create/page.tsx`. Safe in parallel.

```
You are working in the Recipe_Almanac Next.js project (App Router, TypeScript, Tailwind+DaisyUI, Supabase). Use DaisyUI semantic colors and existing fonts. No emojis.

GOAL
Let a logged-in user paste a URL into the Recipe Create page and have the form pre-filled by parsing the JSON-LD `Recipe` schema (or the looser microdata fallback) from the target page.

API ROUTE
- Create `app/api/recipes/import/route.ts` (POST). Body: `{ url: string }`. Response: `{ title, description, image_url, tags, servings?, prep_time_minutes?, cook_time_minutes?, ingredients: [{ name, display_amount, unit }], method_steps: string[], notes: string[], source_url, source_site }` plus `{ error: string }` on failure.
- Use a server-side `fetch` with:
  - Reasonable User-Agent (`Recipe Almanac Importer/1.0 (+https://recipealmanac.com)`).
  - 8-second timeout via `AbortController`.
  - Max response size guard (don't read >2 MB of HTML).
- Parsing strategy (in order):
  1. Look for `<script type="application/ld+json">` blocks. Walk JSON (handle arrays, `@graph`, etc.) and pick the first `@type` that includes `"Recipe"`.
  2. Fallback to microdata using a tiny in-house parser — only if step 1 finds nothing. Don't pull in a heavy library; a regex-based selector pass is fine for `[itemprop="recipeIngredient"]`, `[itemprop="recipeInstructions"]`, etc.
- Normalisation:
  - `recipeIngredient` (array of strings) → parse "200 g flour" into `{ display_amount: 200, unit: "g", name: "flour" }`. Use `utils/unitConverter.ts` `VOLUME_UNITS` keys to detect units. If amount/unit can't be parsed, use `display_amount: 0, unit: "other", name: <whole string>` — never drop the line.
  - `recipeInstructions` → if it's an array of strings, use as-is. If it's an array of `HowToStep` objects, take `.text`. If it's a single string, split on `\n` or numbered prefixes.
  - `recipeYield` → integer servings (parse first integer found).
  - `prepTime` / `cookTime` → parse ISO 8601 duration into total minutes.
- Security: reject `file://`, `localhost`, private IP ranges (10/8, 172.16/12, 192.168/16, 127/8, 169.254/16), and non-HTTP(S) protocols. Reject responses with `Content-Type` that is not `text/html` or `application/xhtml+xml`.

UI
- In `app/recipe/create/page.tsx` (`RecipeForm`), above the Title field add a collapsible "Import from URL" section (closed by default). Inside: a URL text input + Import button + status/error area.
- On success, populate the form fields. If a field already has user input, ask before overwriting (a small confirm `<dialog>` via DaisyUI's `modal`).
- Show a clear, non-spammy attribution line near the top of the prefilled form: "Imported from <hostname>. Please review carefully and edit before saving — Recipe Almanac is ad-free; please remove any promotional copy from the description and method steps." (This stays only until the user submits — it's a UI hint, not stored.)

ACCEPTANCE
- Importing a real recipe from any major site that publishes JSON-LD (e.g. BBC Good Food, NYT Cooking public pages, Allrecipes) pre-fills the form.
- Importing from a URL that has no recipe data returns a clear inline error: "We couldn't find a recipe on that page. You can still fill it in manually."
- Importing from `http://localhost`, `file:///`, or private IPs returns a 400 with a clear message.
- Importing pages >2 MB times out gracefully with a friendly error.
- Run lints, fix anything introduced.
```

---

## Prompt 8 — Follow users + personalised feed

> **⚠ Coordination Notes:** Adds new `followers` table, new `/feed` route, edits `app/profile/[username]/ProfileViewPage.tsx`, edits `components/Header.tsx`. Safe in parallel.

```
You are working in the Recipe_Almanac Next.js project (App Router, TypeScript, Tailwind+DaisyUI, Supabase). Read `app/profile/[username]/ProfileViewPage.tsx` and `components/Header.tsx` first. Use DaisyUI semantic colors and existing fonts. No emojis.

GOAL
Implement a follow graph (one user follows another), a Follow / Unfollow button on profile pages, follower / following counts, and a new `/feed` page that lists recent public recipes by the people the logged-in user follows.

DATABASE
Produce a SQL block for the Supabase SQL Editor:

```sql
CREATE TABLE followers (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);

ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "followers_select_anyone" ON followers FOR SELECT USING (true);
CREATE POLICY "followers_insert_self" ON followers
  FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "followers_delete_self" ON followers
  FOR DELETE USING (auth.uid() = follower_id);
```

Add an index on `(followee_id)` for the feed query.

UI — PROFILE PAGE
- `app/profile/[username]/ProfileViewPage.tsx`:
  - Add follower / following counts to the header (e.g. "12 followers · 4 following"), with each linking to a modal or `/profile/[username]/followers` and `/profile/[username]/following` (acceptable: modal first, dedicated route later).
  - Add a Follow / Unfollow button next to the username for logged-in viewers who are not the profile owner. Make it optimistic (toggle UI state immediately, roll back on error).
  - Convert to either a client component (small) or split it: keep page as RSC, move the follow button + counts into a new client child component `app/profile/[username]/ProfileFollowButton.tsx`.

UI — FEED
- New page `app/feed/page.tsx`. Requires auth (`useAuth({ requireAuth: true })` or RSC redirect).
- Server-side query:
  - Get the list of `followee_id`s for `auth.uid()`.
  - Select public recipes from those users, ordered by `created_at DESC`, limit 50.
- Render them as a grid using `components/RecipeCard.tsx` (consistent with home and almanac).
- If the user follows nobody yet: show a helpful empty state ("You're not following anyone yet. Browse recipes and follow creators whose food you love.") with a link to the leaderboard.

UI — HEADER
- Add a "Feed" link in `components/Header.tsx` for logged-in users — beside the existing "Leaderboard" link. Use the same icon-on-mobile / text-on-desktop pattern.

ACCEPTANCE
- Following yourself is impossible (DB check + UI button hidden on own profile).
- Unfollow + refresh keeps state correct.
- Two browser tabs: following in one updates the count in the other on refresh.
- Feed shows nothing if the user follows nobody — and shows clear empty state.
- Run lints, fix anything introduced.
```

---

## Prompt 9 — Optional nutrition estimate per recipe

> **⚠ Coordination Notes:** Adds a static data file `data/nutrition.json`, a util `utils/nutritionEstimator.ts`, and a UI panel in `app/recipe/[id]/RecipePageClient.tsx`. Safe in parallel; coordinate with Prompts 1, 3, 5, 6 if they all touch the recipe page.

```
You are working in the Recipe_Almanac Next.js project (App Router, TypeScript, Tailwind+DaisyUI, Supabase). Use DaisyUI semantic colors and existing fonts. No emojis.

GOAL
Show an optional, collapsible "Nutrition (approximate)" panel on the recipe detail page, estimating calories, protein, carbs, fat, and fibre per serving. The estimate uses a small static lookup table (per 100 g for ~150 common ingredients). Mark every estimate clearly as approximate.

STATIC DATA
- Create `data/nutrition.json`: a JSON object keyed by lowercased canonical ingredient name. Each entry: `{ kcal: number, protein_g: number, carbs_g: number, fat_g: number, fibre_g: number }` per 100 g. Seed it with at least 150 of the most common cooking ingredients (flour, butter, sugar, salt, olive oil, eggs, milk, common vegetables, common meats, etc.). Source values from USDA FoodData Central where possible; document the source in a top comment / `_meta` key.
- Provide a way to extend it: the JSON is read at build-time only; no runtime fetch.

UTIL
- Create `utils/nutritionEstimator.ts` with:
  ```ts
  export interface Nutrition { kcal: number; protein_g: number; carbs_g: number; fat_g: number; fibre_g: number; }
  export interface RecipeNutritionResult {
    total: Nutrition;
    perServing: Nutrition | null; // null if servings is unknown
    coverage: number; // 0..1 — fraction of recipe mass we could account for
    unmatched: string[];
  }
  export function estimateRecipeNutrition(
    ingredients: Array<{ name: string; amount_grams: number }>,
    servings: number | null
  ): RecipeNutritionResult;
  ```
- Matching logic:
  - Normalise name: lowercase, trim, remove parenthetical notes ("(plain)"), strip leading adjectives ("fresh", "ripe", "chopped").
  - If exact match in `nutrition.json`, use it.
  - Otherwise try contains-match against the keys (so "all-purpose flour" still matches "flour" entry).
  - Sum `(amount_grams / 100) × per-100g-values` across matched ingredients.
  - Track unmatched names so the UI can disclose them.
  - `coverage = matched_mass / total_mass`.

UI
- New client component `components/recipe/NutritionPanel.tsx`:
  - Collapsed by default, rendered between the Method and Notes sections in `RecipePageClient.tsx`.
  - Heading: "Nutrition (approximate)" with a small info icon — tooltip explaining "Estimated from ingredients. Actual values vary."
  - When expanded, shows a 5-cell grid (kcal / protein / carbs / fat / fibre) per serving. If servings is null, show "per recipe" instead with a smaller note.
  - If `coverage < 0.7`, show a prominent warning ("We could only estimate ~X% of the ingredients — see list").
  - Show the list of unmatched names in a small expandable details element.
- Creator opt-out: add `nutrition_visible BOOLEAN NOT NULL DEFAULT true` to the `recipes` table (produce a SQL block). Add a toggle in the create/edit form ("Show nutrition estimate on this recipe"). When false, hide the panel entirely.

ACCEPTANCE
- A recipe whose ingredients are all in the lookup table shows the panel and matches expected USDA-ish values within ~20%.
- A recipe with one unknown ingredient still shows the panel, with the unknown listed and a coverage % shown.
- Setting `nutrition_visible = false` hides the panel.
- Recipes without ingredients (edge case) show the panel collapsed with "Not enough data".
- Run lints, fix anything introduced.
```

---

## Prompt 10 — Offline / PWA support

> **⚠ Coordination Notes:** Adds `public/manifest.json`, `public/sw.js` (or via `next-pwa`), edits `app/layout.tsx`. Independent — safe in parallel.

```
You are working in the Recipe_Almanac Next.js project (App Router, TypeScript, Tailwind+DaisyUI, Supabase). Use DaisyUI semantic colors and existing fonts. No emojis.

GOAL
Make Recipe Almanac an installable PWA, and cache the logged-in user's favourited recipes so they can be opened offline (read-only). Show a clear "Offline" indicator in the header when the user has no network.

APPROACH
- Prefer a hand-rolled service worker over `next-pwa` to avoid adding a dependency that has historically lagged App Router support. If you do choose `next-pwa`, justify it in a one-line comment in `next.config.js` and verify it works with the App Router.

MANIFEST
- Create `public/manifest.json` with name, short_name, start_url `/`, display `standalone`, theme_color matching `#CC5500` (light) — or use a sensible neutral value. Icons: reuse existing `logo.png` (declare 192 and 512 sized PNGs — generate them if absent).
- Reference the manifest from `<head>` in `app/layout.tsx` via `metadata.manifest = '/manifest.json'` (Next.js Metadata API).

SERVICE WORKER
- Add `public/sw.js`. Strategies:
  - HTML pages: network-first with cache fallback.
  - `/_next/static/*` and other static assets: cache-first.
  - Supabase API requests: NEVER cache (bypass entirely — use a request URL match).
  - Recipe images (Supabase Storage public URLs for the `recipe-image` bucket): cache-first with a 30-day expiry.
- Register the SW from a tiny client component `components/providers/ServiceWorkerRegister.tsx` mounted inside `AppProviders` only when `process.env.NODE_ENV === 'production'` to keep dev hot-reload sane.

OFFLINE RECIPE CACHE
- On the My Almanac page (or in `useAuth`-aware code), after loading favourites + own recipes, post a message to the service worker (`navigator.serviceWorker.controller?.postMessage`) with the list of recipe slugs and image URLs to pre-cache.
- The SW listens for `{ type: 'PRECACHE_RECIPES', urls: string[] }` and adds them to a versioned cache `recipes-v1`.
- Build an `/offline` fallback page (`app/offline/page.tsx`) shown by the SW when a navigation fails.

UI HINTS
- Add a tiny "Offline" pill to `components/Header.tsx` (right side, next to theme toggle) that appears only when `navigator.onLine === false`. Use `window.addEventListener('online' | 'offline')` and DaisyUI badge styling.
- In `components/Footer.tsx` (or somewhere unobtrusive), add a "App is installable — install to use offline" hint that appears only when the `beforeinstallprompt` event has fired and the user hasn't dismissed it. Persist dismissal in `localStorage` under `pwa-install-dismissed`.

ACCEPTANCE
- Lighthouse PWA audit shows "Installable: yes".
- Going offline and navigating to a previously-visited favourited recipe still loads (cached HTML + cached image). Navigating to a never-visited recipe shows the `/offline` fallback.
- Supabase auth/data requests are NOT served from cache (no stale data).
- Production-only registration — `npm run dev` has no SW interference.
- Run lints, fix anything introduced.
```

---

## Suggested execution plan

The cleanest order if you want to run them mostly-parallel is:

| Wave | Prompts | Why |
| --- | --- | --- |
| **1 (parallel)** | 7, 8, 10 | Independent — no overlapping files. |
| **2 (parallel)** | 1, 2, 9 | Schema changes are additive and on different tables. |
| **3 (sequential)** | 3, 5, 6 | All edit the recipe page; merge in order: 6 (smallest), 3, then 5 (largest). |

If you'd rather just dispatch everything at once, expect merge conflicts on `app/recipe/[id]/RecipePageClient.tsx` between prompts 1, 3, 5, and 6 — they're flagged at the top of each prompt for that reason.
