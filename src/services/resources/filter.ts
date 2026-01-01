/**
 * Candidate Filtering
 * 
 * Pre-filters search results before LLM curation to remove
 * spam, duplicates, and low-quality sources.
 */

import type { Candidate } from './types';
import { isBlockedDomain } from './config';

/**
 * Filters candidates to remove spam, duplicates, and low-quality sources.
 * Applied after Brave search but before LLM curation.
 * 
 * @param candidates - Raw candidates from search
 * @returns Filtered candidates
 */
export function filterCandidates(candidates: Candidate[]): Candidate[] {
    const filtered: Candidate[] = [];
    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();

    for (const candidate of candidates) {
        // Skip blocked domains
        if (isBlockedDomain(candidate.url)) {
            continue;
        }

        // Skip if URL already seen (normalized)
        const normalizedUrl = candidate.url.toLowerCase().replace(/\/$/, '');
        if (seenUrls.has(normalizedUrl)) {
            continue;
        }

        // Skip if title is too similar (duplicate content)
        const normalizedTitle = candidate.title.toLowerCase().trim();
        if (seenTitles.has(normalizedTitle)) {
            continue;
        }

        // Skip very short titles (likely spam or broken)
        if (candidate.title.length < 10) {
            continue;
        }

        // Skip if description is missing or too short
        if (!candidate.description || candidate.description.length < 20) {
            continue;
        }

        seenUrls.add(normalizedUrl);
        seenTitles.add(normalizedTitle);
        filtered.push(candidate);
    }

    // Sort by credibility score (highest first)
    filtered.sort((a, b) => b.credibilityScore - a.credibilityScore);

    return filtered;
}

/**
 * Checks if candidates meet minimum diversity requirements.
 * 
 * @param candidates - List of candidates
 * @returns Object with diversity metrics
 */
export function checkDiversity(candidates: Candidate[]): {
    uniquePublishers: number;
    meetsMinimum: boolean;
} {
    const publishers = new Set(candidates.map(c => c.publisher));
    return {
        uniquePublishers: publishers.size,
        meetsMinimum: publishers.size >= 3,
    };
}
