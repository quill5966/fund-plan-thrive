/**
 * Intent Extraction Service
 * 
 * Uses LLM to convert goal step descriptions into structured intent specs.
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { IntentSpec } from './types';
import { INTENT_EXTRACTION_PROMPT } from './prompts';

/**
 * Extracts a structured intent spec from a step description.
 * 
 * @param stepDescription - The step's description text (serves as "topic")
 * @param goalContext - Context about the parent goal (title, description)
 * @returns Structured intent spec for resource curation
 */
export async function extractIntentSpec(
    stepDescription: string,
    goalContext: string
): Promise<IntentSpec> {
    const prompt = `Step: "${stepDescription}"
Goal: "${goalContext}"

Analyze this step and output the intent specification as JSON.`;

    const result = await generateText({
        model: openai('gpt-4o-mini'),
        system: INTENT_EXTRACTION_PROMPT,
        prompt,
    });

    // Parse JSON from response
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Failed to extract JSON from LLM response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Build IntentSpec with step description as topic
    const intentSpec: IntentSpec = {
        topic: stepDescription,
        userJob: parsed.userJob,
        constraints: parsed.constraints || {},
        resourceTypesNeeded: parsed.resourceTypesNeeded || ['guide'],
        queryTerms: parsed.queryTerms || [],
    };

    return intentSpec;
}

/**
 * Test function to verify intent extraction
 */
export async function testIntentExtraction(): Promise<void> {
    console.log('Testing Intent Extraction...\n');

    const testCases = [
        { step: 'Research mortgage lenders and compare rates', goal: 'Buy a House' },
        { step: 'Calculate how much you can afford for a down payment', goal: 'Save for House Down Payment' },
        { step: 'Open a high-yield savings account', goal: 'Build Emergency Fund' },
    ];

    for (const { step, goal } of testCases) {
        console.log(`Step: "${step}"`);
        console.log(`Goal: "${goal}"`);

        const intentSpec = await extractIntentSpec(step, goal);
        console.log('Intent Spec:', JSON.stringify(intentSpec, null, 2));
        console.log('---\n');
    }
}
