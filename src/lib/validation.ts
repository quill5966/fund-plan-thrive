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
