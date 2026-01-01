/**
 * Test script for Intent Extraction (Phase 3)
 * 
 * Run with: npx tsx src/scripts/test-intent-extraction.ts
 * 
 * Requires OPENAI_API_KEY in .env.local
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { testIntentExtraction } from '../services/resources';

async function main() {
    try {
        await testIntentExtraction();
        console.log('\n✓ Intent extraction test passed');
    } catch (error) {
        console.error('\n✗ Intent extraction test failed:');
        console.error(error);
        process.exit(1);
    }
}

main();
