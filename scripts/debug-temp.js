const fs = require('fs');
const path = require('path');

const tempDir = path.join(process.cwd(), 'temp');
console.log(`Checking contents of: ${tempDir}`);

if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir);
    console.log(`Files found (${files.length}):`);
    files.forEach(file => console.log(` - ${file}`));
} else {
    console.log('Temp directory does not exist.');
}
