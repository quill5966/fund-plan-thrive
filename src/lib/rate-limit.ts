/**
 * Lightweight In-Memory Rate Limiter
 * 
 * Provides basic protection against runaway client loops or abuse
 * without requiring external dependencies (like Redis).
 * 
 * Note: In a serverless environment (like Vercel), this state is local
 * to each edge function instance. While not perfectly globally synchronized,
 * it is highly effective at stopping single-source spam or infinite loops.
 */

interface RateLimitStore {
    [userId: string]: number[];
}

// Global store attached to the module. In Node.js, this persists
// across requests.
const store: RateLimitStore = {};

export interface RateLimitResult {
    success: boolean;
    remaining: number;
    resetMs: number;
}

/**
 * Checks if a user has exceeded their rate limit for a specific action.
 * 
 * @param identifier Unique ID for the user and action (e.g., "chat:user123")
 * @param limit Maximum number of requests allowed in the window
 * @param windowMs Time window in milliseconds (e.g., 60000 for 1 minute)
 */
export function checkRateLimit(
    identifier: string,
    limit: number,
    windowMs: number
): RateLimitResult {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Initialize if empty
    if (!store[identifier]) {
        store[identifier] = [];
    }

    // Filter out timestamps older than the window
    store[identifier] = store[identifier].filter(timestamp => timestamp > windowStart);

    // Check if within limit
    const currentCount = store[identifier].length;
    
    if (currentCount >= limit) {
        // Find the oldest timestamp in the window to calculate reset time
        const oldest = store[identifier][0];
        const resetMs = (oldest + windowMs) - now;
        
        return {
            success: false,
            remaining: 0,
            resetMs: resetMs > 0 ? resetMs : 0
        };
    }

    // Add current request timestamp
    store[identifier].push(now);

    return {
        success: true,
        remaining: limit - (currentCount + 1),
        resetMs: 0
    };
}
