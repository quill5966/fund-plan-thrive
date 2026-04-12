/**
 * Tool call parameter validation for LLM-invoked tools.
 *
 * These are deterministic guardrails that run inside tool execute()
 * functions BEFORE any database write. Even if the LLM is fully
 * compromised by a prompt injection, these checks prevent bogus data
 * from reaching the database.
 */

const MAX_INPUT_LENGTH = 2000;
const MAX_AMOUNT = 50_000_000;
const MAX_NAME_LENGTH = 100;
const DATE_RANGE_YEARS = 30;
// Allow letters, numbers, spaces, and common punctuation in account names
const NAME_PATTERN = /^[\p{L}\p{N}\s\-'.,()&/#+]+$/u;

const MIN_STEP_LENGTH = 10;
const MAX_STEP_LENGTH = 300;
// Allow full natural-language punctuation in step descriptions
const STEP_PATTERN = /^[\p{L}\p{N}\s\-'.,!?;:()&"#%$@+/\\*]+$/u;
// Detect ≥8 consecutive identical characters (LLM artifacts / garbage)
const REPEATED_CHAR_PATTERN = /(.)\1{7,}/;
// Detect HTML tags and javascript: URIs
const HTML_PATTERN = /<[a-zA-Z/!][^>]*>|javascript:/i;

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validates user text input length.
 * Returns an error message if the input exceeds the maximum length.
 */
export function validateInputLength(text: string): ValidationResult {
    if (text.length > MAX_INPUT_LENGTH) {
        return {
            valid: false,
            error: `Message too long (${text.length} chars). Please keep messages under ${MAX_INPUT_LENGTH} characters.`,
        };
    }
    return { valid: true };
}

/**
 * Validates a financial amount from a tool call.
 * Rejects negative values and amounts exceeding the cap.
 */
export function validateAmount(amount: number): ValidationResult {
    if (amount < 0) {
        return { valid: false, error: `Invalid amount: ${amount}. Amount cannot be negative.` };
    }
    if (amount > MAX_AMOUNT) {
        return { valid: false, error: `Invalid amount: $${amount.toLocaleString()}. Exceeds maximum of $${MAX_AMOUNT.toLocaleString()}.` };
    }
    return { valid: true };
}

/**
 * Validates an account/debt name from a tool call.
 * Rejects names that are too long or contain suspicious characters.
 */
export function validateName(name: string): ValidationResult {
    if (name.length > MAX_NAME_LENGTH) {
        return { valid: false, error: `Account name too long (${name.length} chars). Maximum is ${MAX_NAME_LENGTH}.` };
    }
    if (!NAME_PATTERN.test(name)) {
        return { valid: false, error: `Account name contains invalid characters: "${name}".` };
    }
    return { valid: true };
}

/**
 * Validates an effective date from a tool call.
 * Rejects dates that don't parse or are outside ±30 years of today.
 */
export function validateEffectiveDate(dateStr: string): ValidationResult {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        return { valid: false, error: `Invalid date: "${dateStr}". Could not parse.` };
    }

    const now = new Date();
    const minDate = new Date(now.getFullYear() - DATE_RANGE_YEARS, now.getMonth(), now.getDate());
    const maxDate = new Date(now.getFullYear() + DATE_RANGE_YEARS, now.getMonth(), now.getDate());

    if (date < minDate || date > maxDate) {
        return { valid: false, error: `Date "${dateStr}" is outside the allowed range (±${DATE_RANGE_YEARS} years from today).` };
    }
    return { valid: true };
}

/**
 * Validates a single goal step description.
 * Rejects steps that are too short/long, contain control characters,
 * repeated-char artifacts, or HTML/script injection patterns.
 */
export function validateStep(description: string): ValidationResult {
    const trimmed = description.trim();

    if (trimmed.length < MIN_STEP_LENGTH) {
        return { valid: false, error: `Step description too short (${trimmed.length} chars). Minimum is ${MIN_STEP_LENGTH}.` };
    }
    if (trimmed.length > MAX_STEP_LENGTH) {
        return { valid: false, error: `Step description too long (${trimmed.length} chars). Maximum is ${MAX_STEP_LENGTH}.` };
    }
    if (HTML_PATTERN.test(trimmed)) {
        return { valid: false, error: `Step description contains invalid content (HTML or script).` };
    }
    if (REPEATED_CHAR_PATTERN.test(trimmed)) {
        return { valid: false, error: `Step description contains invalid repeated characters.` };
    }
    if (!STEP_PATTERN.test(trimmed)) {
        return { valid: false, error: `Step description contains invalid characters.` };
    }

    return { valid: true };
}

/**
 * Validates an array of goal step descriptions.
 * Returns the first error found with its index, or { valid: true }.
 */
export function validateSteps(steps: { description: string }[]): ValidationResult {
    for (let i = 0; i < steps.length; i++) {
        const result = validateStep(steps[i].description);
        if (!result.valid) {
            return { valid: false, error: `Step ${i + 1}: ${result.error}` };
        }
    }
    return { valid: true };
}

const MIN_TASK_LENGTH = 3;
const MAX_TASK_LENGTH = 300;

/**
 * Validates a user-entered task description.
 * Rejects tasks that are too short/long, contain HTML/script injection,
 * repeated-char artifacts, or unsupported characters.
 */
export function validateTaskDescription(text: string): ValidationResult {
    const trimmed = text.trim();

    if (trimmed.length === 0) {
        return { valid: false, error: "Task cannot be empty." };
    }
    if (trimmed.length < MIN_TASK_LENGTH) {
        return { valid: false, error: `Task must be at least ${MIN_TASK_LENGTH} characters.` };
    }
    if (trimmed.length > MAX_TASK_LENGTH) {
        return { valid: false, error: `Task must be ${MAX_TASK_LENGTH} characters or fewer.` };
    }
    if (HTML_PATTERN.test(trimmed)) {
        return { valid: false, error: "Task contains invalid content (HTML or script)." };
    }
    if (REPEATED_CHAR_PATTERN.test(trimmed)) {
        return { valid: false, error: "Invalid input." };
    }
    if (!STEP_PATTERN.test(trimmed)) {
        return { valid: false, error: "Task contains unsupported characters." };
    }

    return { valid: true };
}

/**
 * Validates all parameters for an asset/debt tool call.
 * Returns the first validation error found, or { valid: true }.
 */
export function validateToolParams(params: {
    name: string;
    amount: number;
    effectiveDate?: string;
}): ValidationResult {
    const nameCheck = validateName(params.name);
    if (!nameCheck.valid) return nameCheck;

    const amountCheck = validateAmount(params.amount);
    if (!amountCheck.valid) return amountCheck;

    if (params.effectiveDate) {
        const dateCheck = validateEffectiveDate(params.effectiveDate);
        if (!dateCheck.valid) return dateCheck;
    }

    return { valid: true };
}
