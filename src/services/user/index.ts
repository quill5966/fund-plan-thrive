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
