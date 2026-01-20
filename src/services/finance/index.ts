import { db } from "@/db";
import { assets, debts, assetsHistory, debtsHistory, goals, goalSteps, goalResources } from "@/db/schema";
import { eq, sql, and, desc } from "drizzle-orm";
import { distance } from "fastest-levenshtein";

// Similarity threshold for goal deduplication (0-1 scale, where 1 = exact match)
const GOAL_SIMILARITY_THRESHOLD = 0.7;

/**
 * Calculate similarity between two strings using Levenshtein distance.
 * Returns a value between 0 and 1, where 1 indicates identical strings.
 */
function calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    const maxLen = Math.max(s1.length, s2.length);
    if (maxLen === 0) return 1; // Both strings are empty
    return 1 - distance(s1, s2) / maxLen;
}

// In-memory lock to serialize upserts for the same entity (User + Name)
// This prevents race conditions where parallel calls both see "no record" and insert duplicates.
const _locks = new Map<string, Promise<void>>();

async function runSerialized<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = _locks.get(key) || Promise.resolve();

    // We want the new promise in the map to represent "when THIS operation is finished"
    // catch() on prev ensures we run even if the previous one failed.
    const currentTask = prev.catch(() => { }).then(fn);

    // signalDone resolves when currentTask finishes (success or fail)
    const signalDone = currentTask.then(() => { }, () => { });
    _locks.set(key, signalDone);

    // Cleanup map if we are the last one
    signalDone.then(() => {
        if (_locks.get(key) === signalDone) {
            _locks.delete(key);
        }
    });

    return currentTask;
}

export const financeService = {

    async upsertAsset(userId: string, type: string, name: string, value: number, effectiveDate: Date = new Date(), source: string = "user_input", isActive: boolean = true) {
        // Prevent race conditions on the same asset name
        const lockKey = `asset:${userId}:${name.trim().toLowerCase()}`;

        return runSerialized(lockKey, async () => {
            // 1. Find or Create the Asset (Parent Record)
            let assetId;
            const existing = await db
                .select()
                .from(assets)
                .where(and(eq(assets.userId, userId), sql`lower(${assets.name}) = lower(${name.trim()})`, eq(assets.type, type)))
                .limit(1);

            if (existing.length > 0) {
                assetId = existing[0].id;
                // Only update the 'main' record if this new data is NEWER or equal to what we have.
                // If we are backfilling old data, we don't want to overwrite the current balance.
                if (effectiveDate >= existing[0].effectiveDate) {
                    await db
                        .update(assets)
                        .set({
                            value: sql`${value}`,
                            effectiveDate: effectiveDate,
                            updatedDate: new Date(),
                            source: source,
                            isActive: isActive // Update active status
                        })
                        .where(eq(assets.id, assetId));
                }
            } else {
                const newAsset = await db
                    .insert(assets)
                    .values({
                        userId,
                        type,
                        name: name.trim(), // normalizing storage
                        value: sql`${value}`,
                        effectiveDate: effectiveDate,
                        source: source,
                        isActive: isActive
                    })
                    .returning();
                assetId = newAsset[0].id;
            }

            // 2. Always Insert into History
            await db.insert(assetsHistory).values({
                assetId,
                value: sql`${value}`,
                effectiveDate: effectiveDate,
                source: source,
            });

            return { assetId };
        });
    },

    async upsertDebt(userId: string, type: string, name: string, value: number, effectiveDate: Date = new Date(), source: string = "user_input", isActive: boolean = true) {
        // Prevent race conditions on the same debt name
        const lockKey = `debt:${userId}:${name.trim().toLowerCase()}`;

        return runSerialized(lockKey, async () => {
            let debtId;
            const existing = await db
                .select()
                .from(debts)
                .where(and(eq(debts.userId, userId), sql`lower(${debts.name}) = lower(${name.trim()})`, eq(debts.type, type)))
                .limit(1);

            if (existing.length > 0) {
                debtId = existing[0].id;
                if (effectiveDate >= existing[0].effectiveDate) {
                    await db
                        .update(debts)
                        .set({
                            value: sql`${value}`,
                            effectiveDate: effectiveDate,
                            updatedDate: new Date(),
                            source: source,
                            isActive: isActive
                        })
                        .where(eq(debts.id, debtId));
                }
            } else {
                const newDebt = await db
                    .insert(debts)
                    .values({
                        userId,
                        type,
                        name: name.trim(),
                        value: sql`${value}`,
                        effectiveDate: effectiveDate,
                        source: source,
                        isActive: isActive
                    })
                    .returning();
                debtId = newDebt[0].id;
            }

            await db.insert(debtsHistory).values({
                debtId,
                value: sql`${value}`,
                effectiveDate: effectiveDate,
                source: source,
            });

            return { debtId };
        });
    },

    /**
     * Merge an asset when user clarifies/updates an existing account.
     * Handles name changes and smart value updates based on date.
     */
    async mergeAsset(
        userId: string,
        existingName: string,    // Old name to find
        newName: string,         // New/clarified name
        type: string,
        value: number,
        effectiveDate: Date = new Date()
    ) {
        const lockKey = `asset:${userId}:${existingName.trim().toLowerCase()}`;

        return runSerialized(lockKey, async () => {
            // 1. Find existing asset for THIS USER by old name
            // Note: userId is the PRIMARY filter - ensures we only match assets belonging to current user
            const existing = await db.select().from(assets)
                .where(and(
                    eq(assets.userId, userId),  // Primary filter: user ownership
                    sql`lower(${assets.name}) = lower(${existingName.trim()})`,
                    eq(assets.type, type)
                )).limit(1);

            if (!existing.length) {
                throw new Error(`No existing asset found: ${existingName}`);
            }

            const asset = existing[0];

            // 2. Build update object
            const updates: Record<string, unknown> = { updatedDate: new Date() };

            // Update name if it's a clarification (always update to more specific name)
            if (newName.trim().toLowerCase() !== existingName.trim().toLowerCase()) {
                updates.name = newName.trim();
            }

            // 3. Handle value update based on date
            if (effectiveDate >= asset.effectiveDate) {
                // New data is more recent → update main record
                updates.value = sql`${value}`;
                updates.effectiveDate = effectiveDate;
            }
            // Otherwise, only add to history (not main record)

            await db.update(assets).set(updates).where(eq(assets.id, asset.id));

            // 4. Always add to history
            await db.insert(assetsHistory).values({
                assetId: asset.id,
                value: sql`${value}`,
                effectiveDate,
                source: "user_input"
            });

            return { assetId: asset.id, merged: true, nameUpdated: updates.name !== undefined };
        });
    },

    /**
     * Merge a debt when user clarifies/updates an existing account.
     * Handles name changes and smart value updates based on date.
     */
    async mergeDebt(
        userId: string,
        existingName: string,    // Old name to find
        newName: string,         // New/clarified name
        type: string,
        value: number,
        effectiveDate: Date = new Date()
    ) {
        const lockKey = `debt:${userId}:${existingName.trim().toLowerCase()}`;

        return runSerialized(lockKey, async () => {
            // 1. Find existing debt for THIS USER by old name
            const existing = await db.select().from(debts)
                .where(and(
                    eq(debts.userId, userId),  // Primary filter: user ownership
                    sql`lower(${debts.name}) = lower(${existingName.trim()})`,
                    eq(debts.type, type)
                )).limit(1);

            if (!existing.length) {
                throw new Error(`No existing debt found: ${existingName}`);
            }

            const debt = existing[0];

            // 2. Build update object
            const updates: Record<string, unknown> = { updatedDate: new Date() };

            // Update name if it's a clarification
            if (newName.trim().toLowerCase() !== existingName.trim().toLowerCase()) {
                updates.name = newName.trim();
            }

            // 3. Handle value update based on date
            if (effectiveDate >= debt.effectiveDate) {
                updates.value = sql`${value}`;
                updates.effectiveDate = effectiveDate;
            }

            await db.update(debts).set(updates).where(eq(debts.id, debt.id));

            // 4. Always add to history
            await db.insert(debtsHistory).values({
                debtId: debt.id,
                value: sql`${value}`,
                effectiveDate,
                source: "user_input"
            });

            return { debtId: debt.id, merged: true, nameUpdated: updates.name !== undefined };
        });
    },

    async getFinancialSummary(userId: string) {
        // Gets the LATEST known state from the main tables
        // Filter out inactive items for the current summary
        const userAssets = await db
            .select()
            .from(assets)
            .where(
                and(
                    eq(assets.userId, userId),
                    eq(assets.isActive, true)
                )
            );

        const userDebts = await db
            .select()
            .from(debts)
            .where(
                and(
                    eq(debts.userId, userId),
                    eq(debts.isActive, true)
                )
            );

        const totalAssets = userAssets.reduce((sum, a) => sum + Number(a.value), 0);
        const totalDebts = userDebts.reduce((sum, d) => sum + Number(d.value), 0);
        const netWorth = totalAssets - totalDebts;

        return { assets: userAssets, debts: userDebts, totalAssets, totalDebts, netWorth };
    },

    /**
     * Reconstructs the financial history over time.
     * Returns a time series of { date, assets, debts, netWorth }.
     */
    async getFinancialHistory(userId: string) {
        // 1. Fetch all asset history for this user
        const allAssetHistory = await db
            .select({
                assetId: assetsHistory.assetId,
                value: assetsHistory.value,
                effectiveDate: assetsHistory.effectiveDate,
            })
            .from(assetsHistory)
            .innerJoin(assets, eq(assetsHistory.assetId, assets.id))
            .where(eq(assets.userId, userId))
            .orderBy(assetsHistory.effectiveDate);

        // 2. Fetch all debt history for this user
        const allDebtHistory = await db
            .select({
                debtId: debtsHistory.debtId,
                value: debtsHistory.value,
                effectiveDate: debtsHistory.effectiveDate,
            })
            .from(debtsHistory)
            .innerJoin(debts, eq(debtsHistory.debtId, debts.id))
            .where(eq(debts.userId, userId))
            .orderBy(debtsHistory.effectiveDate);

        // 3. Collect unique dates to build the timeline
        const uniqueDates = new Set<string>();
        [...allAssetHistory, ...allDebtHistory].forEach(item => {
            if (item.effectiveDate) {
                uniqueDates.add(item.effectiveDate.toISOString().split('T')[0]);
            }
        });
        const sortedDates = Array.from(uniqueDates).sort();

        // 4. Build the time series
        const timeSeries = sortedDates.map(dateStr => {
            const dateObj = new Date(dateStr);

            // Calculate total assets for this date
            // Strategy: For each distinct asset, find the latest history entry <= current date
            const uniqueAssetIds = new Set(allAssetHistory.map(a => a.assetId));
            let currentAssets = 0;
            uniqueAssetIds.forEach(id => {
                // Find latest record for this asset on or before 'dateObj'
                const history = allAssetHistory
                    .filter(h => h.assetId === id && new Date(h.effectiveDate) <= new Date(dateStr + 'T23:59:59'))
                    .pop();
                if (history) {
                    currentAssets += Number(history.value);
                }
            });

            // Calculate total debts for this date
            const uniqueDebtIds = new Set(allDebtHistory.map(d => d.debtId));
            let currentDebts = 0;
            uniqueDebtIds.forEach(id => {
                const history = allDebtHistory
                    .filter(h => h.debtId === id && new Date(h.effectiveDate) <= new Date(dateStr + 'T23:59:59'))
                    .pop();
                if (history) {
                    currentDebts += Number(history.value);
                }
            });

            return {
                date: dateStr,
                assets: currentAssets,
                debts: currentDebts,
                netWorth: currentAssets - currentDebts
            };
        });

        return timeSeries;
    },

    /**
     * Goal Management
     */
    async createGoal(userId: string, data: {
        title: string;
        description: string;
        targetAmount?: number;
        currentAmount?: number;
        steps: { description: string; isUserDefined: boolean }[];
        resources?: { stepIndex: number; title: string; url: string }[];  // Optional - resources now curated async
    }) {
        // Serialize all goal creation for this user to prevent race conditions
        const lockKey = `goal:${userId}`;

        return runSerialized(lockKey, async () => {
            // 1. Check for existing goals with similar titles (fuzzy deduplication)
            const existingGoals = await db.select().from(goals).where(eq(goals.userId, userId));

            for (const existing of existingGoals) {
                const similarity = calculateSimilarity(data.title, existing.title);
                if (similarity >= GOAL_SIMILARITY_THRESHOLD) {
                    console.log(`[Goal Dedup] "${data.title}" matched "${existing.title}" (score: ${similarity.toFixed(2)})`);
                    return { goalId: existing.id, deduplicated: true };
                }
            }

            // 2. No duplicate found - create new goal in transaction
            return await db.transaction(async (tx) => {
                // Create Goal
                const newGoal = await tx.insert(goals).values({
                    userId,
                    title: data.title,
                    description: data.description,
                    targetAmount: data.targetAmount ? sql`${data.targetAmount}` : null,
                    currentAmount: data.currentAmount ? sql`${data.currentAmount}` : sql`0`,
                    status: 'active'
                }).returning();
                const goalId = newGoal[0].id;

                // Create Steps and Resources
                for (let i = 0; i < data.steps.length; i++) {
                    const step = data.steps[i];
                    const newStep = await tx.insert(goalSteps).values({
                        goalId,
                        description: step.description,
                        order: `${i + 1}`,
                        isCompleted: false,
                        isUserDefined: step.isUserDefined
                    }).returning();
                    const stepId = newStep[0].id;

                    // Create Resources for this step (if any provided - usually none, curated async later)
                    const stepResourcesList = (data.resources ?? []).filter(r => r.stepIndex === i);
                    if (stepResourcesList.length > 0) {
                        await tx.insert(goalResources).values(
                            stepResourcesList.map(r => ({
                                stepId,
                                title: r.title,
                                url: r.url
                            }))
                        );
                    }
                }

                return { goalId, deduplicated: false };
            });
        });
    },

    async updateGoal(userId: string, goalId: string, updates: {
        currentAmount?: number;
        status?: 'active' | 'completed' | 'archived';
        newSteps?: string[];
    }) {
        // Validate ownership
        const existing = await db.select().from(goals).where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
        if (!existing.length) throw new Error("Goal not found");

        return await db.transaction(async (tx) => {
            // Update fields
            const setValues: any = { updatedAt: new Date() };
            if (updates.currentAmount !== undefined) setValues.currentAmount = sql`${updates.currentAmount}`;
            if (updates.status) setValues.status = updates.status;

            await tx.update(goals).set(setValues).where(eq(goals.id, goalId));

            // Add new steps if any
            if (updates.newSteps && updates.newSteps.length > 0) {
                // Get current max order
                // Simple heuristic: count existing steps
                const existingSteps = await tx.select().from(goalSteps).where(eq(goalSteps.goalId, goalId));
                let nextOrder = existingSteps.length + 1;

                for (const stepDesc of updates.newSteps) {
                    await tx.insert(goalSteps).values({
                        goalId,
                        description: stepDesc,
                        order: `${nextOrder}`,
                        isCompleted: false
                    });
                    nextOrder++;
                }
            }
        });
    },

    async getGoals(userId: string) {
        // Fetch goals, steps, resources
        // For simplicity in this prototype, we'll fetch goals and then fetch steps/resources for each or do a big join.
        // Drizzle's query builder with `with` (relational query features) would be nice, but we are using core method.
        // Let's just fetch flat and restructure, or simple loops.

        const userGoals = await db.select().from(goals).where(eq(goals.userId, userId));

        const results = [];
        for (const g of userGoals) {
            const steps = await db
                .select()
                .from(goalSteps)
                .where(eq(goalSteps.goalId, g.id))
                // .orderBy(goalSteps.order) // order is text, might sort "10" before "2". But for <10 steps it's fine.
                // Fixing sort:
                .orderBy(sql`cast(${goalSteps.order} as integer)`);

            const stepsWithResources = [];
            for (const s of steps) {
                const resources = await db.select().from(goalResources).where(eq(goalResources.stepId, s.id));
                stepsWithResources.push({ ...s, resources });
            }
            results.push({ ...g, steps: stepsWithResources });
        }
        return results;
    }
};
