/**
 * Test script for Full Curation Pipeline (Phase 4)
 * 
 * Run with: npx tsx src/scripts/test-curation-pipeline.ts
 * 
 * This tests the complete flow without a real goal step in DB.
 * It uses mock data to test: intent → search → filter → curate
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import {
    extractIntentSpec,
    searchCandidates,
    filterCandidates,
    curateResources,
    validateDiversity
} from '../services/resources';

async function main() {
    console.log('=== Testing Full Curation Pipeline ===\n');

    const testStep = 'Research mortgage lenders and compare interest rates';
    const testGoal = 'Buy a House';

    try {
        // Step 1: Intent Extraction
        console.log('Step 1: Extracting intent...');
        const intentSpec = await extractIntentSpec(testStep, testGoal);
        console.log(`  userJob: ${intentSpec.userJob}`);
        console.log(`  query: "${intentSpec.queryTerms[0]}"`);
        console.log(`  resourceTypes: ${intentSpec.resourceTypesNeeded.join(', ')}\n`);

        // Step 2: Search
        console.log('Step 2: Searching Brave...');
        const rawCandidates = await searchCandidates(intentSpec.queryTerms);
        console.log(`  Found ${rawCandidates.length} candidates\n`);

        // Step 3: Filter
        console.log('Step 3: Filtering candidates...');
        const filtered = filterCandidates(rawCandidates);
        console.log(`  ${filtered.length} candidates after filtering\n`);

        // Step 4: Curate
        console.log('Step 4: LLM Curation...');
        const curationResult = await curateResources(filtered, intentSpec);
        console.log(`  Selected ${curationResult.resources.length} resources`);
        console.log(`  Insufficient sources: ${curationResult.insufficientSources}\n`);

        // Validate diversity
        const diversity = validateDiversity(curationResult.resources);
        console.log(`Diversity check:`);
        console.log(`  Publishers: ${diversity.publisherCount} (need 3+)`);
        console.log(`  Types: ${diversity.typeCount} (need 2+)`);
        console.log(`  Valid: ${diversity.valid}\n`);

        // Display results
        console.log('=== Curated Resources ===');
        curationResult.resources.forEach((r, i) => {
            console.log(`${i + 1}. [${r.credibilityScore.toFixed(2)}] ${r.resourceType.toUpperCase()}`);
            console.log(`   ${r.title}`);
            console.log(`   ${r.publisher} - ${r.url}\n`);
        });

        console.log('✓ Pipeline test completed successfully');
    } catch (error) {
        console.error('\n✗ Pipeline test failed:');
        console.error(error);
        process.exit(1);
    }
}

main();
