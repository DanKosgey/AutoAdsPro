import { formatPhoneNumber } from '../src/utils/phoneFormatter';

console.log('🧪 Testing Phone Number Formatter...\n');

const testCases = [
    { jid: '254745026933@s.whatsapp.net', expected: '+254745026933' },
    { jid: '178795612995751:25@lid', expected: '+25' },
    { jid: '254729989107824@lid', expected: '+254729989107824' },
    { jid: '247729989107824:254729989107@lid', expected: '+254729989107' },
    { jid: '1234567890@s.whatsapp.net', expected: '+1234567890' },
];

let passed = 0;
let failed = 0;

for (const test of testCases) {
    const result = formatPhoneNumber(test.jid);
    const status = result === test.expected ? '✅' : '❌';

    if (result === test.expected) {
        passed++;
    } else {
        failed++;
    }

    console.log(`${status} Input: ${test.jid}`);
    console.log(`   Expected: ${test.expected}`);
    console.log(`   Got: ${result}\n`);
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
    console.log('✅ All tests passed!');
    process.exit(0);
} else {
    console.log('❌ Some tests failed');
    process.exit(1);
}
