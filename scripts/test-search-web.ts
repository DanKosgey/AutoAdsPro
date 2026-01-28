/**
 * Test script for the search_web AI tool
 */

import { webScraper } from '../src/services/webScraper';

async function testSearchWeb() {
    console.log('🔍 Testing Intelligent Web Search Tool...\n');

    const tests = [
        {
            name: 'General News Query',
            query: 'latest world news',
            category: undefined
        },
        {
            name: 'Tech News',
            query: 'latest AI developments',
            category: 'tech'
        },
        {
            name: 'Crypto/Finance',
            query: 'Bitcoin price',
            category: undefined
        },
        {
            name: 'Sports',
            query: 'Premier League scores',
            category: 'sports'
        },
        {
            name: 'Weather',
            query: 'weather forecast',
            category: 'weather'
        }
    ];

    for (const test of tests) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Test: ${test.name}`);
        console.log(`Query: "${test.query}"`);
        if (test.category) console.log(`Category: ${test.category}`);
        console.log('='.repeat(60));

        try {
            const result = await webScraper.searchWeb(test.query, test.category);
            console.log('\n✅ SUCCESS:');
            console.log(result.substring(0, 400) + (result.length > 400 ? '...' : ''));
        } catch (error: any) {
            console.log('\n❌ ERROR:');
            console.log(error.message);
        }

        // Wait between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n\n✅ All search tests completed!');
}

testSearchWeb().catch(console.error);
