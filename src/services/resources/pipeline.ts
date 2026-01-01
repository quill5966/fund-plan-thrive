/**
 * Full Resource Curation Pipeline
 * 
 * Orchestrates the complete flow:
 * 1. Extract intent from step
 * 2. Search Brave with query terms
 * 3. Filter candidates
 * 4. Curate with LLM
 * 5. Write to database
 */

import { db } from '@/db';
import { goalSteps, goalResources } from '@/db/schema';
import { eq } from 'drizzle-orm';

import { extractIntentSpec } from './intent';
import { searchCandidates } from './brave';
import { filterCandidates } from './filter';
import { curateResources, validateDiversity } from './curate';
import type { CuratedResource } from './types';

// Global lock to serialize curation across all goals
// Prevents Brave API rate limiting (1 request/second on free tier)
let _curationLock: Promise<void> = Promise.resolve();

async function runSerializedCuration<T>(fn: () => Promise<T>): Promise<T> {
    const prev = _curationLock;
    let resolve: () => void;
    _curationLock = new Promise<void>(r => { resolve = r; });

    try {
        await prev; // Wait for previous curation to complete
        return await fn();
    } finally {
        resolve!(); // Signal completion
    }
}

/**
 * Curates resources for a single goal step.
 * This is the main entry point for the curation pipeline.
 * 
 * @param stepId - UUID of the goal step
 * @param stepDescription - The step's description text
 * @param goalContext - Context about the parent goal
 * @param stepNumber - Optional step number for logging (1-indexed)
 */
export async function curateResourcesForStep(
    stepId: string,
    stepDescription: string,
    goalContext: string,
    stepNumber?: number
): Promise<{ success: boolean; resourceCount: number; error?: string }> {
    try {
        const stepLabel = stepNumber ? `Step ${stepNumber}` : 'Step';
        console.log(`[Curation] ${stepLabel}: Starting for "${stepDescription.substring(0, 50)}..."`);

        // Step 1: Extract intent spec
        const intentSpec = await extractIntentSpec(stepDescription, goalContext);
        console.log(`[Curation] ${stepLabel}: Intent extracted: userJob=${intentSpec.userJob}, query="${intentSpec.queryTerms[0]}"`);

        // Update step with intent spec
        await db.update(goalSteps)
            .set({
                userJob: intentSpec.userJob,
                constraints: JSON.stringify(intentSpec.constraints),
                resourceTypesNeeded: JSON.stringify(intentSpec.resourceTypesNeeded),
                queryTerms: JSON.stringify(intentSpec.queryTerms),
                intentExtractedAt: new Date(),
            })
            .where(eq(goalSteps.id, stepId));

        // Step 2: Search for candidates
        const rawCandidates = await searchCandidates(intentSpec.queryTerms);
        console.log(`[Curation] ${stepLabel}: Found ${rawCandidates.length} candidates from Brave`);

        // Step 3: Filter candidates
        const filteredCandidates = filterCandidates(rawCandidates);
        console.log(`[Curation] ${stepLabel}: ${filteredCandidates.length} candidates after filtering`);

        if (filteredCandidates.length === 0) {
            console.warn('[Curation] No candidates after filtering');
            return { success: false, resourceCount: 0, error: 'No candidates found' };
        }

        // Step 4: Curate with LLM
        const curationResult = await curateResources(filteredCandidates, intentSpec);
        console.log(`[Curation] ${stepLabel}: LLM selected ${curationResult.resources.length} resources`);

        // Validate diversity
        const diversity = validateDiversity(curationResult.resources);
        if (!diversity.valid) {
            console.warn(`[Curation] Diversity warning: ${diversity.publisherCount} publishers, ${diversity.typeCount} types`);
        }

        // Step 5: Write to database
        await writeResourcesToDb(stepId, curationResult.resources);
        console.log(`[Curation] ${stepLabel}: Wrote ${curationResult.resources.length} resources to DB`);

        return {
            success: true,
            resourceCount: curationResult.resources.length,
        };
    } catch (error) {
        console.error('[Curation] Error:', error);
        return {
            success: false,
            resourceCount: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Writes curated resources to the database
 */
async function writeResourcesToDb(stepId: string, resources: CuratedResource[]): Promise<void> {
    // Delete existing resources for this step (re-curation scenario)
    await db.delete(goalResources).where(eq(goalResources.stepId, stepId));

    // Insert new resources
    if (resources.length > 0) {
        await db.insert(goalResources).values(
            resources.map(r => ({
                stepId,
                title: r.title,
                url: r.url,
                publisher: r.publisher,
                resourceType: r.resourceType,
                credibilityScore: r.credibilityScore.toString(),
                curatedAt: new Date(),
            }))
        );
    }
}

/**
 * Curates resources for all steps in a goal.
 * Called asynchronously after goal creation.
 * 
 * Uses global serialization to prevent concurrent Brave API calls
 * from exceeding the rate limit (1 request/second on free tier).
 * 
 * @param goalId - UUID of the goal
 * @param goalTitle - Title of the goal for context
 */
export async function curateResourcesForGoal(
    goalId: string,
    goalTitle: string
): Promise<void> {
    // Serialize curation across all goals to respect Brave API rate limits
    return runSerializedCuration(async () => {
        // Get all steps for this goal
        const steps = await db.select()
            .from(goalSteps)
            .where(eq(goalSteps.goalId, goalId));

        console.log(`[Curation] Processing ${steps.length} steps for goal: "${goalTitle}"`);

        // Process each step sequentially (to respect Brave API rate limits)
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            await curateResourcesForStep(step.id, step.description, goalTitle, i + 1);

            // Small delay between steps for rate limiting
            await new Promise(resolve => setTimeout(resolve, 1100));
        }

        console.log(`[Curation] Completed curation for goal: "${goalTitle}"`);
    });
}
