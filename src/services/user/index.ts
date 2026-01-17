/**
 * TODO: AUTH_REFACTOR
 * 
 * Current Approach (MVP):
 * - Users are identified by name only (no password/authentication)
 * - getOrCreateUser() finds existing user by name or creates new one
 * - User ID stored in HTTP-only cookie for session persistence
 * - Anyone can access any user's data by entering their name
 * 
 * For Production Authentication:
 * 1. Integrate NextAuth.js or similar auth provider
 * 2. Replace getOrCreateUser() with auth provider's user creation
 * 3. Add email/OAuth for secure user identification
 * 4. Update all API routes to use auth session instead of userId cookie
 * 5. Add middleware to protect routes requiring authentication
 * 6. getUserById() will still be useful for fetching user details
 */
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const userService = {
    /**
     * Finds an existing user by name, or creates a new one if not found.
     * For MVP, name is used as the unique identifier.
     */
    async getOrCreateUser(name: string) {
        const trimmedName = name.trim();

        if (!trimmedName) {
            throw new Error("User name cannot be empty");
        }

        const existing = await db
            .select()
            .from(users)
            .where(eq(users.name, trimmedName))
            .limit(1);

        if (existing.length > 0) {
            return existing[0];
        }

        const newUser = await db
            .insert(users)
            .values({ name: trimmedName })
            .returning();

        return newUser[0];
    },

    /**
     * Retrieves a user by their ID.
     */
    async getUserById(id: string) {
        const result = await db
            .select()
            .from(users)
            .where(eq(users.id, id))
            .limit(1);

        return result.length > 0 ? result[0] : null;
    },

    /**
     * Retrieves the most recently created user.
     * Useful for the MVP dashboard to show the latest active user's data.
     * @deprecated Used for global MVP debug only. Now we use session-based specific user fetching.
     */
    async getLatestUser() {
        const result = await db
            .select()
            .from(users)
            .orderBy(desc(users.createdAt))
            .limit(1);

        return result.length > 0 ? result[0] : null;
    },
};
