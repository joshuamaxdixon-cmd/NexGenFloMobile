/**
 * Janet Field Validation — Phase 3
 *
 * Pure, side-effect-free helpers that validate and normalize voice-captured
 * field values before they are written to the intake form.
 *
 * Rules:
 * - Returns null  → value is valid, proceed to save.
 * - Returns string → error message to speak back to the patient; do NOT save.
 *
 * No React, no screen imports. Safe to unit-test in isolation.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Human-plausible range for height in feet. */
const HEIGHT_FT_MIN = 1;
const HEIGHT_FT_MAX = 8;

/** Human-plausible range for height inches remainder. */
const HEIGHT_IN_MIN = 0;
const HEIGHT_IN_MAX = 11;

/** Human-plausible range for weight in pounds. */
const WEIGHT_LB_MIN = 50;
const WEIGHT_LB_MAX = 700;

/** Minimum content for chief-concern / symptom free-text fields. */
const SYMPTOM_MIN_CHARS = 10;
const SYMPTOM_MIN_WORDS = 3;

// ---------------------------------------------------------------------------
// Field-type classification (lookup tables — no runtime branching dispersal)
// ---------------------------------------------------------------------------

const PHONE_FIELD_KEYS = new Set([
  'phoneNumber',
  'emergencyContactPhone',
] as const);

const NAME_FIELD_KEYS = new Set([
  'firstName',
  'lastName',
  'emergencyContactName',
] as const);

const GENDER_FIELD_KEYS = new Set(['gender'] as const);

const DATE_FIELD_KEYS = new Set(['dateOfBirth'] as const);

const SYMPTOM_FIELD_KEYS = new Set([
  'chiefConcern',
  'symptomNotes',
] as const);

export type JanetValidatableFieldKey =
  | 'chiefConcern'
  | 'dateOfBirth'
  | 'email'
  | 'emergencyContactName'
  | 'emergencyContactPhone'
  | 'firstName'
  | 'gender'
  | 'heightFt'
  | 'heightIn'
  | 'lastName'
  | 'phoneNumber'
  | 'weightLb'
  | 'zipCode';

// ---------------------------------------------------------------------------
// Internal helpers (pure, exported for potential reuse / testing)
// ---------------------------------------------------------------------------

/**
 * Strip all non-digit characters from a string. Used for phone / zip checks.
 */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Convert spoken ordinal words to numeric strings.
 * e.g. "fifteenth" → "15", "thirty" → "30"
 */
const ORDINAL_MAP: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10,
  eleventh: 11,
  twelfth: 12,
  thirteenth: 13,
  fourteenth: 14,
  fifteenth: 15,
  sixteenth: 16,
  seventeenth: 17,
  eighteenth: 18,
  nineteenth: 19,
  twentieth: 20,
  'twenty-first': 21,
  'twenty-second': 22,
  'twenty-third': 23,
  'twenty-fourth': 24,
  'twenty-fifth': 25,
  'twenty-sixth': 26,
  'twenty-seventh': 27,
  'twenty-eighth': 28,
  'twenty-ninth': 29,
  thirtieth: 30,
  'thirty-first': 31,
} as const;

const CARDINAL_MAP: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  thousand: 1000,
} as const;

const MONTH_MAP: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
} as const;

/**
 * Parse a spoken-word year like "nineteen ninety" → 1990, "two thousand five" → 2005.
 * Returns null if the tokens cannot be resolved to a plausible year (1900–2099).
 */
function parseSpokenYear(tokens: string[]): number | null {
  // Try direct 4-digit number first.
  if (tokens.length === 1 && /^\d{4}$/.test(tokens[0])) {
    return Number(tokens[0]);
  }

  // "nineteen ninety" style (two-token hundreds pattern)
  if (tokens.length === 2) {
    const hundreds = CARDINAL_MAP[tokens[0]];
    const tens = CARDINAL_MAP[tokens[1]] ?? ORDINAL_MAP[tokens[1]];
    if (hundreds !== undefined && tens !== undefined && hundreds >= 10 && hundreds <= 20) {
      const year = hundreds * 100 + tens;
      if (year >= 1900 && year <= 2099) {
        return year;
      }
    }
  }

  // "two thousand five" style
  if (tokens.length >= 2) {
    let accumulated = 0;
    let current = 0;
    for (const token of tokens) {
      const val = CARDINAL_MAP[token];
      if (val === undefined) {
        // Try digit token
        if (/^\d+$/.test(token)) {
          const n = Number(token);
          if (n >= 1900 && n <= 2099) {
            return n;
          }
          current += n;
        } else {
          return null;
        }
        continue;
      }
      if (val === 1000) {
        accumulated = (accumulated + current) * val;
        current = 0;
      } else if (val === 100) {
        current *= val;
      } else {
        current += val;
      }
    }
    const year = accumulated + current;
    if (year >= 1900 && year <= 2099) {
      return year;
    }
  }

  return null;
}

/**
 * Attempt to parse a date string from many spoken and typed formats.
 * Returns a Date object (potentially Invalid Date) or null if unparseable.
 */
export function parseJanetDate(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  // ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  }

  // MM/DD/YYYY  or  M/D/YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, mm, dd, yyyy] = slashMatch;
    const d = new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }

  // "January 15 1990" or "Jan 15, 1990"
  const normalized = trimmed
    .toLowerCase()
    .replace(/[,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = normalized.split(' ');

  // Check if first token is a month name.
  const firstMonthNum = MONTH_MAP[tokens[0]];
  if (firstMonthNum !== undefined && tokens.length >= 2) {
    // Tokens: [monthName, day, ...yearTokens]
    const dayToken = tokens[1];
    const dayNum = ORDINAL_MAP[dayToken] ?? CARDINAL_MAP[dayToken] ?? (/^\d+$/.test(dayToken) ? Number(dayToken) : NaN);
    if (!isNaN(dayNum)) {
      const yearTokens = tokens.slice(2);
      const yearNum = parseSpokenYear(yearTokens);
      if (yearNum !== null) {
        const d = new Date(
          `${yearNum}-${String(firstMonthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}T00:00:00`,
        );
        return isNaN(d.getTime()) ? null : d;
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Normalizer
// ---------------------------------------------------------------------------

/**
 * Normalize common voice artifacts in a field value before validation.
 * This is called BEFORE validateJanetField so the validator sees clean input.
 */
export function normalizeJanetFieldValue(
  fieldKey: string,
  rawValue: string,
): string {
  const trimmed = rawValue.trim();

  // Phone normalization: "oh" → "0", "double X" → "XX"
  if (PHONE_FIELD_KEYS.has(fieldKey as 'phoneNumber' | 'emergencyContactPhone')) {
    return trimmed
      .toLowerCase()
      .replace(/\boh\b/g, '0')
      .replace(/\bzero\b/g, '0')
      .replace(/\bone\b/g, '1')
      .replace(/\btwo\b/g, '2')
      .replace(/\bthree\b/g, '3')
      .replace(/\bfour\b/g, '4')
      .replace(/\bfive\b/g, '5')
      .replace(/\bsix\b/g, '6')
      .replace(/\bseven\b/g, '7')
      .replace(/\beight\b/g, '8')
      .replace(/\bnine\b/g, '9')
      .replace(/\bdouble\s+([a-z0-9])/gi, (_, ch: string) => `${ch}${ch}`)
      .replace(/\D/g, ''); // strip to digits
  }

  // Email normalization: "at" → "@", "dot" → "."
  if (fieldKey === 'email') {
    return trimmed
      .toLowerCase()
      .replace(/\s+at\s+/gi, '@')
      .replace(/\s+dot\s+/gi, '.')
      .replace(/\s+/g, '');
  }

  // Gender normalization → canonical values
  if (GENDER_FIELD_KEYS.has(fieldKey as 'gender')) {
    return normalizeGenderValue(trimmed);
  }

  return trimmed;
}

/**
 * Canonicalize gender to one of: "male" | "female" | "other" | original.
 */
export function normalizeGenderValue(raw: string): string {
  const n = raw.toLowerCase().trim();
  if (
    n === 'male' ||
    n === 'man' ||
    n === 'boy' ||
    n === 'm' ||
    n === 'gentleman' ||
    n.includes('i am a man') ||
    n.includes('i am male') ||
    n.includes("i'm male") ||
    n.includes("i'm a man")
  ) {
    return 'male';
  }
  if (
    n === 'female' ||
    n === 'woman' ||
    n === 'girl' ||
    n === 'f' ||
    n === 'lady' ||
    n.includes('i am a woman') ||
    n.includes('i am female') ||
    n.includes("i'm female") ||
    n.includes("i'm a woman")
  ) {
    return 'female';
  }
  if (
    n === 'other' ||
    n === 'non-binary' ||
    n === 'nonbinary' ||
    n === 'non binary' ||
    n.includes('prefer not') ||
    n === 'neither'
  ) {
    return 'other';
  }
  // Return original — validator will catch it if still unrecognised.
  return raw;
}

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

/**
 * Validate a normalized field value.
 *
 * @param fieldKey    - The IntakeFormData key being validated.
 * @param rawValue    - The (optionally pre-normalized) value to check.
 * @param transcript  - The original voice transcript, used for richer error messages.
 * @returns null if valid; an actionable error string if invalid.
 */
export function validateJanetField(
  fieldKey: string,
  rawValue: string | number | undefined,
  transcript: string,
): string | null {
  const value = String(rawValue ?? '').trim();

  // ── Phone ──────────────────────────────────────────────────────────────────
  if (PHONE_FIELD_KEYS.has(fieldKey as 'phoneNumber' | 'emergencyContactPhone')) {
    const digits = digitsOnly(value);
    if (digits.length !== 10) {
      const got = digits.length;
      if (got === 0) {
        return "I did not catch a phone number. Please say ten digits, for example: eight five five, five five five, one two three four.";
      }
      if (got < 10) {
        return `I only heard ${got} digit${got === 1 ? '' : 's'}. A US phone number needs exactly 10 digits. Try again — you can say each digit separately.`;
      }
      return `I heard ${got} digits, but a US phone number needs exactly 10. Please repeat just the ten digits.`;
    }
    return null;
  }

  // ── Email ──────────────────────────────────────────────────────────────────
  if (fieldKey === 'email') {
    if (!value) {
      return null; // email is optional — empty is fine
    }
    const atIndex = value.indexOf('@');
    if (atIndex < 1) {
      return "That email is missing the @ symbol. Try saying it as: name at domain dot com.";
    }
    const afterAt = value.slice(atIndex + 1);
    if (!afterAt.includes('.') || afterAt.endsWith('.')) {
      return "That email needs a domain like gmail dot com after the @ sign. Try again.";
    }
    return null;
  }

  // ── Date of birth ──────────────────────────────────────────────────────────
  if (DATE_FIELD_KEYS.has(fieldKey as 'dateOfBirth')) {
    if (!value) {
      return "I need your date of birth. Say it as: month, day, year — for example, January fifteenth nineteen ninety.";
    }
    const parsed = parseJanetDate(value);
    if (!parsed) {
      return `I could not parse "${value}" as a date. Try saying it as month, day, year — like March 3rd 1985.`;
    }
    const now = new Date();
    if (parsed > now) {
      return "That date is in the future. Please say your date of birth again.";
    }
    const age = (now.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (age > 130) {
      return "That date seems too far back. Please say your date of birth again — month, day, and year.";
    }
    return null;
  }

  // ── Name fields ────────────────────────────────────────────────────────────
  if (NAME_FIELD_KEYS.has(fieldKey as 'firstName' | 'lastName' | 'emergencyContactName')) {
    if (!value) {
      const label =
        fieldKey === 'firstName' ? 'first name'
        : fieldKey === 'lastName' ? 'last name'
        : 'emergency contact name';
      return `I need a ${label}. Please say the name clearly.`;
    }
    if (/^\d+$/.test(value)) {
      return "That sounded like a number, not a name. Please say your name again.";
    }
    if (value.length === 1) {
      return `I only heard the letter "${value.toUpperCase()}". If that is correct, say "yes". Otherwise, please say your full name again.`;
    }
    return null;
  }

  // ── Gender ─────────────────────────────────────────────────────────────────
  if (GENDER_FIELD_KEYS.has(fieldKey as 'gender')) {
    const normalized = normalizeGenderValue(value);
    if (normalized !== 'male' && normalized !== 'female' && normalized !== 'other') {
      return "I did not catch a clear gender. Please say male, female, or other.";
    }
    return null;
  }

  // ── Height (feet) ──────────────────────────────────────────────────────────
  if (fieldKey === 'heightFt') {
    const num = Number(value);
    if (!value || isNaN(num)) {
      return "I did not catch a height in feet. Please say a number like 5 or 6.";
    }
    if (num < HEIGHT_FT_MIN || num > HEIGHT_FT_MAX) {
      return `${num} feet does not seem like a valid height. Please say your height in feet — for example, 5 feet or 6 feet.`;
    }
    return null;
  }

  // ── Height (inches) ────────────────────────────────────────────────────────
  if (fieldKey === 'heightIn') {
    const num = Number(value);
    if (!value || isNaN(num)) {
      return "I did not catch the inches. Please say a number from 0 to 11.";
    }
    if (num < HEIGHT_IN_MIN || num > HEIGHT_IN_MAX) {
      return `${num} inches is not valid. Inches should be between 0 and 11. Please try again.`;
    }
    return null;
  }

  // ── Weight ─────────────────────────────────────────────────────────────────
  if (fieldKey === 'weightLb') {
    const num = Number(value);
    if (!value || isNaN(num)) {
      return "I did not catch a weight. Please say your weight in pounds — for example, one hundred fifty.";
    }
    if (num < WEIGHT_LB_MIN || num > WEIGHT_LB_MAX) {
      return `${num} pounds does not seem right. Please say your weight in pounds — a number between 50 and 700.`;
    }
    return null;
  }

  // ── Zip code ───────────────────────────────────────────────────────────────
  if (fieldKey === 'zipCode') {
    const digits = digitsOnly(value);
    if (digits.length !== 5) {
      return "A zip code must be exactly 5 digits. Please say your zip code again.";
    }
    return null;
  }

  // ── Chief concern / symptom notes ──────────────────────────────────────────
  if (SYMPTOM_FIELD_KEYS.has(fieldKey as 'chiefConcern' | 'symptomNotes')) {
    if (!value) {
      return "I need a bit more detail. Please describe your symptom or reason for visit in a few words.";
    }
    const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
    const charCount = value.trim().length;
    if (wordCount < SYMPTOM_MIN_WORDS && charCount < SYMPTOM_MIN_CHARS) {
      return `I heard "${value}", but I need a bit more detail. Could you describe your symptom in a full sentence?`;
    }
    return null;
  }

  // All other fields: no Janet-side validation rule — pass through.
  return null;
}

// ---------------------------------------------------------------------------
// Attempt-count helpers (pure — the actual ref lives in VoiceScreen)
// ---------------------------------------------------------------------------

/**
 * Build the re-prompt message Janet should speak after a validation failure.
 *
 * @param fieldKey       - The field that failed validation.
 * @param errorMessage   - The error returned by validateJanetField.
 * @param attemptCount   - The NEW count (after incrementing) for this field.
 * @param isOptional     - Whether the field is optional (affects skip offer).
 * @returns The full prompt string to speak + display.
 */
export function buildValidationRetryPrompt(options: {
  attemptCount: number;
  errorMessage: string;
  fieldKey: string;
  isOptional: boolean;
}): string {
  const { attemptCount, errorMessage, isOptional } = options;

  if (attemptCount >= 3) {
    if (isOptional) {
      return `${errorMessage} This field is optional — say "skip" to move on, or "type it" to enter it manually.`;
    }
    return `${errorMessage} Would you like to type this instead? Say "type it" or try once more.`;
  }

  if (attemptCount === 2) {
    // Spell mode will be auto-activated by the caller.
    return `${errorMessage} Let me switch to spell mode. Say each letter or digit one at a time.`;
  }

  // First failure: return the error message directly.
  return errorMessage;
}
