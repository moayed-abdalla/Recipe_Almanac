/**
 * Shared validation rules used by forms and server routes.
 * Mirrors database CHECK constraints and triggers where applicable.
 */

import {
  containsBadWords,
  censorBadWords,
  getBadWordErrorMessage,
} from '@/utils/badWords';

export type ValidationResult<T = void> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const PROFILE_DESCRIPTION_MAX_LENGTH = 500;
export const REVIEW_MAX_LENGTH = 250;
export const RATING_MIN = 1;
export const RATING_MAX = 5;

export interface RecipeIngredientInput {
  name: string;
  amount: number;
}

export interface RecipePayloadInput {
  title: string;
  servings?: string;
  prepTime?: string;
  cookTime?: string;
  ingredients: RecipeIngredientInput[];
}

export interface ValidatedRecipePayload {
  trimmedTitle: string;
  servings: number | null;
  prepTime: number | null;
  cookTime: number | null;
  validIngredients: RecipeIngredientInput[];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseOptionalNonNegativeInt(
  raw: string,
  label: string
): ValidationResult<number | null> {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return { ok: true, value: null };
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return {
      ok: false,
      error: `${label} must be a whole number that is zero or greater.`,
    };
  }
  return { ok: true, value: parsed };
}

export function validateUsername(username: string): ValidationResult<{ trimmed: string }> {
  const trimmed = username.trim();
  if (trimmed.length < USERNAME_MIN_LENGTH || trimmed.length > USERNAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `Username must be between ${USERNAME_MIN_LENGTH} and ${USERNAME_MAX_LENGTH} characters.`,
    };
  }
  if (containsBadWords(trimmed)) {
    return { ok: false, error: getBadWordErrorMessage() };
  }
  return { ok: true, value: { trimmed } };
}

export function validateEmail(email: string): ValidationResult<{ trimmed: string }> {
  const trimmed = email.trim();
  if (!trimmed) {
    return { ok: false, error: 'Email is required' };
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return { ok: false, error: 'Please enter a valid email address' };
  }
  return { ok: true, value: { trimmed } };
}

export function validateRegistrationPasswords(
  password: string,
  confirmPassword: string
): ValidationResult {
  if (password !== confirmPassword) {
    return { ok: false, error: 'Passwords do not match' };
  }
  if (password.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters' };
  }
  return { ok: true, value: undefined };
}

export function validateProfileDescription(
  description: string
): ValidationResult<{ censored: string }> {
  const trimmed = description.trim();
  if (trimmed.length > PROFILE_DESCRIPTION_MAX_LENGTH) {
    return {
      ok: false,
      error: `Description must be at most ${PROFILE_DESCRIPTION_MAX_LENGTH} characters.`,
    };
  }
  return { ok: true, value: { censored: censorBadWords(trimmed) } };
}

export function validateRating(rating: number): ValidationResult {
  if (!Number.isInteger(rating) || rating < RATING_MIN || rating > RATING_MAX) {
    return { ok: false, error: `Rating must be between ${RATING_MIN} and ${RATING_MAX}.` };
  }
  return { ok: true, value: undefined };
}

export function validateReview(review: string | null): ValidationResult<{ trimmed: string | null }> {
  if (review === null || review.trim() === '') {
    return { ok: true, value: { trimmed: null } };
  }
  const trimmed = review.trim();
  if (trimmed.length > REVIEW_MAX_LENGTH) {
    return {
      ok: false,
      error: `Review must be at most ${REVIEW_MAX_LENGTH} characters.`,
    };
  }
  if (containsBadWords(trimmed)) {
    return { ok: false, error: 'Please remove inappropriate language' };
  }
  return { ok: true, value: { trimmed } };
}

export function validateRecipePayload(
  input: RecipePayloadInput
): ValidationResult<ValidatedRecipePayload> {
  const trimmedTitle = input.title.trim();
  if (!trimmedTitle) {
    return { ok: false, error: 'Recipe title is required.' };
  }

  const servingsResult = parseOptionalNonNegativeInt(input.servings ?? '', 'Servings');
  if (!servingsResult.ok) return servingsResult;

  const prepResult = parseOptionalNonNegativeInt(input.prepTime ?? '', 'Prep time');
  if (!prepResult.ok) return prepResult;

  const cookResult = parseOptionalNonNegativeInt(input.cookTime ?? '', 'Cook time');
  if (!cookResult.ok) return cookResult;

  const validIngredients = input.ingredients.filter(
    (ing) => ing.name.trim() && ing.amount > 0
  );
  if (validIngredients.length === 0) {
    return {
      ok: false,
      error:
        'Please add at least one ingredient with a name and an amount greater than zero.',
    };
  }

  return {
    ok: true,
    value: {
      trimmedTitle,
      servings: servingsResult.value,
      prepTime: prepResult.value,
      cookTime: cookResult.value,
      validIngredients,
    },
  };
}
