/**
 * Resource Curation Service
 * 
 * Curates high-quality resources for goal steps using:
 * 1. Intent extraction (LLM)
 * 2. Web search (Brave API)
 * 3. Candidate filtering
 * 4. LLM curation with guardrails
 * 5. Database storage
 */

// Main Pipeline (entry point)
export { curateResourcesForStep, curateResourcesForGoal } from './pipeline';

// Individual Components
export { searchCandidates, testBraveSearch } from './brave';
export { getCredibilityScore, isBlockedDomain, DOMAIN_CREDIBILITY } from './config';
export { extractIntentSpec, testIntentExtraction } from './intent';
export { filterCandidates, checkDiversity } from './filter';
export { curateResources, validateDiversity } from './curate';

// Prompts
export { INTENT_EXTRACTION_PROMPT, CURATION_PROMPT } from './prompts';

// Types
export type { IntentSpec, Candidate, CuratedResource, CurationResponse } from './types';
