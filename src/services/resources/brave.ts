/**
 * Brave Search API Client
 * 
 * Searches the web for candidate resources based on intent spec queries.
 * Uses the Brave Web Search API with recency filtering.
 * 
 * API Documentation: https://api-dashboard.search.brave.com/app/documentation/web-search/query
 */

import type { BraveWebSearchResponse, BraveSearchResult, Candidate } from './types';
import { getCredibilityScore } from './config';

const BRAVE_API_BASE = 'https://api.search.brave.com/res/v1/web/search';

/**
 * Builds the freshness parameter for 2-year recency filter
 * Format: YYYY-MM-DDtoYYYY-MM-DD
 */
function getFreshnessRange(): string {
    const now = new Date();
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(now.getFullYear() - 2);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    return `${formatDate(twoYearsAgo)}to${formatDate(now)}`;
}

/**
 * Extracts the publisher (hostname) from a URL
 */
function extractPublisher(url: string): string {
    try {
        const hostname = new URL(url).hostname;
        return hostname.replace(/^www\./, '');
    } catch {
        return 'unknown';
    }
}

/**
 * Searches Brave for a single query and returns raw results
 */
async function searchSingleQuery(query: string): Promise<BraveSearchResult[]> {
    const apiKey = process.env.BRAVE_API_KEY;

    if (!apiKey) {
        throw new Error('BRAVE_API_KEY environment variable is not set');
    }

    const params = new URLSearchParams({
        q: query,
        count: '20',
        freshness: getFreshnessRange(),
        safesearch: 'moderate',
        result_filter: 'web',
        // TODO: Update based on user locale and goal topic
        country: 'US',
    });

    const response = await fetch(`${BRAVE_API_BASE}?${params}`, {
        headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip',
            'X-Subscription-Token': apiKey,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Brave Search API error ${response.status}: ${errorText}`);
    }

    const data: BraveWebSearchResponse = await response.json();
    return data.web?.results ?? [];
}

/**
 * Searches Brave with query terms and returns deduplicated candidates
 * 
 * @param queryTerms - 1 search query from the intent spec (limited for Brave free tier)
 * @returns Deduplicated list of candidates with credibility scores
 */
export async function searchCandidates(queryTerms: string[]): Promise<Candidate[]> {
    // Limit to 1 query for Brave API free tier (1 request/second)
    const limitedQueries = queryTerms.slice(0, 1);

    // Run all queries in parallel
    const resultArrays = await Promise.all(
        limitedQueries.map(query => searchSingleQuery(query))
    );

    // Flatten results
    const allResults = resultArrays.flat();

    // Deduplicate by URL (normalized)
    const seenUrls = new Set<string>();
    const candidates: Candidate[] = [];

    for (const result of allResults) {
        // Normalize URL for deduplication
        const normalizedUrl = result.url.toLowerCase().replace(/\/$/, '');

        if (seenUrls.has(normalizedUrl)) {
            continue;
        }
        seenUrls.add(normalizedUrl);

        // Skip non-HTTPS
        if (!result.url.startsWith('https://')) {
            continue;
        }

        const publisher = extractPublisher(result.url);
        const credibilityScore = getCredibilityScore(result.url);

        candidates.push({
            title: result.title,
            url: result.url,
            description: result.description,
            publisher,
            credibilityScore,
        });
    }

    // Sort by credibility score (highest first)
    candidates.sort((a, b) => b.credibilityScore - a.credibilityScore);

    return candidates;
}

/**
 * Test function to verify Brave Search API integration
 */
export async function testBraveSearch(): Promise<void> {
    console.log('Testing Brave Search API...');

    const testQueries = ['how to save for house down payment guide'];
    const candidates = await searchCandidates(testQueries);

    console.log(`Found ${candidates.length} candidates:`);
    candidates.slice(0, 5).forEach((c, i) => {
        console.log(`${i + 1}. [${c.credibilityScore.toFixed(2)}] ${c.publisher}: ${c.title}`);
        console.log(`   ${c.url}`);
    });
}
