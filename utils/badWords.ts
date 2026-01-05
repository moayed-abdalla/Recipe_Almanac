/**
 * CONTENT MODERATION UTILITIES
 * 
 * Provides functions to validate usernames and censor descriptions
 * containing inappropriate words or phrases.
 */

import badWordsData from '@/data/badWords.json';

/**
 * List of words and phrases that should not be allowed
 * Loaded from data/badWords.json
 */
export const BAD_WORDS: string[] = badWordsData.words;

/**
 * Check if a username contains any bad words
 * Case-insensitive matching
 * 
 * @param username - The username to check
 * @returns true if username contains bad words, false otherwise
 */
export function containsBadWords(username: string): boolean {
  const normalizedUsername = username.toLowerCase().trim();
  
  // Check if any bad word appears in the username
  return BAD_WORDS.some(badWord => {
    const normalizedBadWord = badWord.toLowerCase();
    // Check for exact word match or word boundary match
    const regex = new RegExp(`\\b${normalizedBadWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(normalizedUsername);
  });
}

/**
 * Censor bad words in a description by replacing them with *#&%
 * Case-insensitive matching
 * 
 * @param description - The description text to censor
 * @returns The censored description with bad words replaced
 */
export function censorBadWords(description: string): string {
  if (!description) return description;
  
  let censored = description;
  
  BAD_WORDS.forEach(badWord => {
    // Create a regex that matches the word with word boundaries, case-insensitive
    const regex = new RegExp(`\\b${badWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    censored = censored.replace(regex, '*#&%');
  });
  
  return censored;
}

/**
 * Get a user-friendly error message for bad words in usernames
 */
export function getBadWordErrorMessage(): string {
  return 'Username contains inappropriate language. Please choose a different username.';
}

