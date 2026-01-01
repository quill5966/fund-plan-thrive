/**
 * Test script for Brave Search API integration
 * 
 * Run with: npx tsx src/scripts/test-brave-search.ts
 * 
 * Requires BRAVE_API_KEY in .env.local
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { testBraveSearch } from '../services/resources';

async function main() {
    try {
        await testBraveSearch();
        console.log('\n✓ Brave Search integration test passed');
    } catch (error) {
        console.error('\n✗ Brave Search integration test failed:');
        console.error(error);
        process.exit(1);
    }
}

main();
