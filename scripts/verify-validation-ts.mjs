/**
 * Lightweight checks for shared validation rules (no Supabase connection required).
 * Run: npx tsx scripts/verify-validation-ts.mjs
 */

import assert from 'node:assert/strict';
import {
  validateUsername,
  validateProfileDescription,
  validateReview,
  validateRating,
  validateRecipePayload,
} from '../lib/validation/index.ts';

assert.equal(validateUsername('ab').ok, false);
assert.equal(validateUsername('good_cook').ok, true);
assert.equal(validateUsername('fuck').ok, false);

const profile = validateProfileDescription('hello fuck world');
assert.equal(profile.ok, true);
assert.equal(profile.value.censored.includes('*#&%'), true);

assert.equal(validateReview('nice recipe').ok, true);
assert.equal(validateReview('what the fuck').ok, false);
assert.equal(validateReview('a'.repeat(251)).ok, false);

assert.equal(validateRating(5).ok, true);
assert.equal(validateRating(0).ok, false);

assert.equal(validateRecipePayload({ title: '   ', ingredients: [] }).ok, false);
assert.equal(
  validateRecipePayload({
    title: 'Soup',
    ingredients: [{ name: 'water', amount: 1 }],
  }).ok,
  true
);

console.log('All TypeScript validation checks passed.');
