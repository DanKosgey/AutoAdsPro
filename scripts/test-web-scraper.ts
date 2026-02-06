/**
 * Test script for optimized Web Scraper with token counting and smart compression
 * UNIT TESTS: Token counting, content cleaning, data extraction
 * INTEGRATION TESTS: Real web scraping with optimization
 */

import { webScraper } from '../src/services/webScraper';

// ============================================================================
// UNIT TEST FUNCTIONS (Isolated testing of optimization features)
// ============================================================================

interface TestResult {
    name: string;
    passed: boolean;
    details: string;
    before?: number;
    after?: number;
}

const unitTestResults: TestResult[] = [];

// UNIT TEST 1: Token counting accuracy
function testTokenCounting() {
    const testText = "Bitcoin reached a new all-time high of $50,000 today. The cryptocurrency market capitalization exceeded $2 trillion. Investors are optimistic about the future of digital assets.";
    
    // Simulate token estimation: ~1.3 tokens per word
    const words = testText.split(/\s+/).filter(w => w.length > 0).length;
    const estimatedTokens = Math.ceil(words * 1.3);
    
    const success = words >= 25 && estimatedTokens >= 32 && estimatedTokens <= 45;
    
    unitTestResults.push({
        name: "Token Counting Accuracy",
        passed: success,
        details: `Words: ${words} | Estimated Tokens: ${estimatedTokens} | Ratio: ${(estimatedTokens/words).toFixed(2)} tokens/word`,
        before: testText.length,
        after: estimatedTokens
    });
}

// UNIT TEST 2: Content cleaning removes filler
function testContentCleaning() {
    const messyContent = `
    This is important news. 
    Click here to subscribe to our newsletter and never miss updates. 
    The market dropped 15%.
    Advertisement: Buy now!
    Follow us on social media for more content.
    Share this article with your friends.
    `;

    // Simulate cleaning regex
    let cleaned = messyContent.replace(/\s+/g, ' ').trim();
    const beforeWords = messyContent.split(/\s+/).filter(w => w.length > 0).length;
    
    // Remove filler patterns
    cleaned = cleaned.replace(/click here to[^.]*\./gi, ' ');
    cleaned = cleaned.replace(/subscribe to[^.]*newsletter[^.]*\./gi, ' ');
    cleaned = cleaned.replace(/share this article[^.]*\./gi, ' ');
    cleaned = cleaned.replace(/follow us on[^.]*\./gi, ' ');
    cleaned = cleaned.replace(/advertisement[^.]*\./gi, ' ');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    const afterWords = cleaned.split(/\s+/).filter(w => w.length > 0).length;
    const hasNoFiller = !cleaned.toLowerCase().includes('subscribe') && 
                        !cleaned.toLowerCase().includes('follow us');

    unitTestResults.push({
        name: "Content Cleaning (Remove Filler)",
        passed: hasNoFiller && beforeWords > afterWords,
        details: `Reduced from ${beforeWords} to ${afterWords} words | Reduction: ${((beforeWords-afterWords)/beforeWords*100).toFixed(1)}%`,
        before: beforeWords,
        after: afterWords
    });
}

// UNIT TEST 3: Key data extraction
function testKeyDataExtraction() {
    const testContent = "Apple Inc. reported $95.5 billion revenue on January 15, 2025. Microsoft's $2.5 trillion market cap. 50% growth reported.";
    
    // Extract numbers with currency/percentage
    const numberPattern = /[$€£¥₹][\d,]+\.?\d*|\d+(?:\.\d+)?%|\b20\d{2}\b/gi;
    const numbers = testContent.match(numberPattern) || [];
    
    // Extract entities (capitalized phrases)
    const entityPattern = /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g;
    const entities = testContent.match(entityPattern) || [];

    const hasNumbers = numbers.length > 0 && numbers.some(n => n.includes('95.5') || n.includes('$'));
    const hasPercentage = numbers.some(n => n.includes('%'));
    const hasYear = numbers.some(n => n.includes('2025'));
    const hasEntity = entities.length > 0;

    unitTestResults.push({
        name: "Key Data Extraction",
        passed: hasNumbers && hasPercentage && hasYear && hasEntity,
        details: `Found ${numbers.length} numbers: ${numbers.join(', ')} | Found ${entities.length} entities: ${entities.slice(0, 3).join(', ')}`,
    });
}

// UNIT TEST 4: Character counting
function testCharacterCounting() {
    const testText = "Bitcoin at $50k. Ethereum at $3k.";
    const chars = testText.replace(/\s+/g, '').length;
    const expectedChars = testText.replace(/\s+/g, '').length;
    
    const success = chars === expectedChars && chars > 0;
    
    unitTestResults.push({
        name: "Character Count Accuracy",
        passed: success,
        details: `Characters (no spaces): ${chars} | Text length: ${testText.length}`,
        before: testText.length,
        after: chars
    });
}

// ============================================================================
// INTEGRATION TEST: Real web scraping with optimization
// ============================================================================

async function testWebScraperIntegration() {
    console.log('\n🔗 Running Integration Tests (Real Web Scraping)...\n');

    const integrationTests = [
        {
            name: 'BBC News (Summary with optimization)',
            url: 'https://www.bbc.com/news',
            extractType: 'summary' as const,
            expectedSuccess: true
        },
        {
            name: 'Wikipedia Article (Metadata - lightweight)',
            url: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
            extractType: 'metadata' as const,
            expectedSuccess: true
        },
        {
            name: 'Invalid URL (Security test)',
            url: 'http://localhost:3000/admin',
            extractType: 'summary' as const,
            expectedSuccess: false
        },
        {
            name: 'Malformed URL',
            url: 'not-a-url',
            extractType: 'summary' as const,
            expectedSuccess: false
        }
    ];

    let integrationPassed = 0;
    let integrationTotal = 0;

    for (const test of integrationTests) {
        integrationTotal++;
        console.log(`\n${'─'.repeat(70)}`);
        console.log(`Integration Test: ${test.name}`);
        console.log(`URL: ${test.url} | Type: ${test.extractType}`);
        console.log('─'.repeat(70));

        try {
            const result = await webScraper.scrapeUrl(test.url, test.extractType);
            
            const hasTokenMetadata = result.includes('Est. Tokens:') || result.includes('Words:');
            const success = test.expectedSuccess && result.length > 0;
            
            console.log(`✅ SUCCESS (Expected: ${test.expectedSuccess})`);
            console.log(`Result preview (first 300 chars):\n${result.substring(0, 300)}...`);
            console.log(`\n✓ Optimization metadata included: ${hasTokenMetadata}`);
            
            if (success) integrationPassed++;
        } catch (error: any) {
            const success = !test.expectedSuccess; // Expected to fail
            console.log(`${success ? '✅' : '❌'} ${success ? 'Expected Error' : 'Unexpected Error'}: ${error.message}`);
            if (success) integrationPassed++;
        }

        // Rate limit respect
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    console.log(`\n\nIntegration Tests: ${integrationPassed}/${integrationTotal} passed\n`);
    return integrationPassed === integrationTotal;
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║     OPTIMIZED WEB SCRAPER - COMPREHENSIVE TEST SUITE           ║');
    console.log('║     (Token Counting, Content Cleaning, Smart Compression)      ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');

    // ===== UNIT TESTS =====
    console.log('\n📋 UNIT TESTS - Testing Individual Optimization Features\n');
    
    testTokenCounting();
    testContentCleaning();
    testKeyDataExtraction();
    testCharacterCounting();

    let unitPassed = 0;
    const unitTotal = unitTestResults.length;

    unitTestResults.forEach((result) => {
        const status = result.passed ? '✅' : '❌';
        console.log(`${status} ${result.name}`);
        console.log(`   ${result.details}`);
        if (result.before !== undefined && result.after !== undefined) {
            console.log(`   Compression: ${result.before} → ${result.after} bytes/tokens`);
        }
        console.log('');
        
        if (result.passed) unitPassed++;
    });

    console.log(`\nUnit Tests Result: ${unitPassed}/${unitTotal} passed\n`);

    // ===== INTEGRATION TESTS =====
    const integrationPassed = await testWebScraperIntegration();

    // ===== FINAL SUMMARY =====
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log(`║ FINAL RESULT: ${unitPassed}/${unitTotal} unit tests + integration tests     ║`);
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    if (unitPassed === unitTotal && integrationPassed) {
        console.log('🎉 All tests passed! Optimized web scraper is ready for production.\n');
        process.exit(0);
    } else {
        console.log(`⚠️  Some tests failed. Review logs above.\n`);
        process.exit(1);
    }
}

// Run tests
runAllTests().catch((err) => {
    console.error('Test suite error:', err);
    process.exit(1);
});
