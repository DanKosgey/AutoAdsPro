/**
 * Test script for the browse_url AI tool
 */

import { webScraper } from '../src/services/webScraper';

async function testWebScraper() {
    console.log('🌐 Testing Web Scraper Tool...\n');

    const tests = [
        {
            name: 'Wikipedia Article (Summary)',
            url: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
            extractType: 'summary' as const
        },
        {
            name: 'Wikipedia Article (Metadata)',
            url: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
            extractType: 'metadata' as const
        },
        {
            name: 'News Article',
            url: 'https://www.bbc.com/news',
            extractType: 'summary' as const
        },
        {
            name: 'Invalid URL (should fail)',
            url: 'not-a-valid-url',
            extractType: 'summary' as const
        },
        {
            name: 'Localhost (should fail - security)',
            url: 'http://localhost:3000',
            extractType: 'summary' as const
        }
    ];

    for (const test of tests) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Test: ${test.name}`);
        console.log(`URL: ${test.url}`);
        console.log(`Extract Type: ${test.extractType}`);
        console.log('='.repeat(60));

        try {
            const result = await webScraper.scrapeUrl(test.url, test.extractType);
            console.log('\n✅ SUCCESS:');
            console.log(result.substring(0, 500) + (result.length > 500 ? '...' : ''));
        } catch (error: any) {
            console.log('\n❌ ERROR:');
            console.log(error.message);
        }

        // Wait a bit between requests to respect rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n\n✅ All tests completed!');
}

testWebScraper().catch(console.error);
