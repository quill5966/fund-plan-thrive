/**
 * Type definitions for the Resource Curation Service
 */

// Intent Spec - structured understanding of what a step needs
export interface IntentSpec {
    topic: string;  // The step description itself
    userJob: 'research' | 'compare' | 'calculate' | 'draft' | 'buy' | 'negotiate' | 'implement';
    constraints: {
        budget?: string;
        timeline?: string;
        location?: string;
        riskTolerance?: string;
        vendorPreference?: string;
    };
    resourceTypesNeeded: Array<'guide' | 'checklist' | 'calculator' | 'dataset' | 'video' | 'template'>;
    queryTerms: string[];  // 1 high-quality search query (limited for Brave free tier)
}

// Raw result from Brave Search API
export interface BraveSearchResult {
    title: string;
    url: string;
    description: string;
    age?: string;  // e.g., "2 days ago"
    page_age?: string;  // ISO date string
    meta_url?: {
        hostname: string;
        path: string;
    };
}

export interface BraveWebSearchResponse {
    query: {
        original: string;
        altered?: string;
    };
    web?: {
        results: BraveSearchResult[];
    };
}

// Candidate after pre-filtering
export interface Candidate {
    title: string;
    url: string;
    description: string;
    publisher: string;  // Extracted hostname
    credibilityScore: number;  // 0.0 - 1.0
}

// Final curated resource
export interface CuratedResource {
    title: string;
    url: string;
    publisher: string;
    resourceType: 'guide' | 'checklist' | 'calculator' | 'dataset' | 'video' | 'template';
    credibilityScore: number;
}

// LLM curation response
export interface CurationResponse {
    resources: CuratedResource[];
    insufficientSources: boolean;
    suggestedConstraint?: 'budget' | 'location' | 'timeline';
}
