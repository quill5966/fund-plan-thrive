/**
 * LLM Resource Curation
 * 
 * Uses LLM to curate resources from candidates with guardrails:
 * - Hard URL constraint (only output URLs from candidate list)
 * - Diversity rule (3+ publishers, 2+ resource types)
 * - Quality prioritization (gov, edu, trusted sources)
 * - Insufficient sources handling
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { IntentSpec, Candidate, CuratedResource, CurationResponse } from './types';
import { CURATION_PROMPT } from './prompts';

/**
 * Curates resources from candidates using LLM with guardrails.
 * 
 * @param candidates - Filtered candidates from Brave search
 * @param intentSpec - Structured intent spec for context
 * @returns Curated resources (5-8) with guardrails enforced
 */
export async function curateResources(
    candidates: Candidate[],
    intentSpec: IntentSpec
): Promise<CurationResponse> {
    // Build candidate list for LLM
    const candidateList = candidates.map((c, i) =>
        `${i + 1}. [${c.credibilityScore.toFixed(2)}] ${c.publisher}\n   Title: ${c.title}\n   URL: ${c.url}\n   Description: ${c.description}`
    ).join('\n\n');

    const prompt = `## STEP CONTEXT
Topic: ${intentSpec.topic}
User Job: ${intentSpec.userJob}
Resource Types Needed: ${intentSpec.resourceTypesNeeded.join(', ')}

## CANDIDATE RESOURCES (${candidates.length} total)
${candidateList}

Select 5-8 resources from the candidates above. Output JSON only.`;

    const result = await generateText({
        model: openai('gpt-4o-mini'),
        system: CURATION_PROMPT,
        prompt,
    });

    // Parse JSON from response
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Failed to extract JSON from LLM curation response');
    }

    const parsed: CurationResponse = JSON.parse(jsonMatch[0]);

    // Validate URLs are from candidate set (hard guardrail)
    const candidateUrls = new Set(candidates.map(c => c.url));
    const validResources = parsed.resources.filter(r => candidateUrls.has(r.url));

    if (validResources.length < parsed.resources.length) {
        console.warn(`Filtered out ${parsed.resources.length - validResources.length} hallucinated URLs`);
    }

    return {
        resources: validResources,
        insufficientSources: parsed.insufficientSources || validResources.length < 5,
        suggestedConstraint: parsed.suggestedConstraint,
    };
}

/**
 * Validates that curation result meets diversity requirements
 */
export function validateDiversity(resources: CuratedResource[]): {
    valid: boolean;
    publisherCount: number;
    typeCount: number;
} {
    const publishers = new Set(resources.map(r => r.publisher));
    const types = new Set(resources.map(r => r.resourceType));

    return {
        valid: publishers.size >= 3 && types.size >= 2,
        publisherCount: publishers.size,
        typeCount: types.size,
    };
}
