const fs = require('fs');

let content = fs.readFileSync('public/app.js', 'utf8');

// First replacement: Add custom profile gathering logic
const pattern1 = `    const eveningTime = document.getElementById('marketing-evening-time').value || '19:00';

    btn.textContent = 'Creating...';`;

const replacement1 = `    const eveningTime = document.getElementById('marketing-evening-time').value || '19:00';

    // Get Custom Profile
    const useCustom = document.getElementById('campaign-custom-profile-check').checked;
    let businessContext = {};
    if (useCustom) {
        businessContext = {
            productInfo: document.getElementById('camp-product').value,
            targetAudience: document.getElementById('camp-audience').value,
            uniqueSellingPoint: document.getElementById('camp-usp').value,
            brandVoice: document.getElementById('camp-voice').value
        };
        if (!businessContext.productInfo) {
            statusMsg.textContent = 'Please enter Product Info for custom profile';
            statusMsg.style.color = 'var(--danger)';
            return;
        }
    }

    btn.textContent = 'Creating...';`;

content = content.replace(pattern1, replacement1);

// Second replacement: Update fetch body
const pattern2 = `            body: JSON.stringify({
                name,
                morningTime,
                afternoonTime,
                eveningTime
            })`;

const replacement2 = `            body: JSON.stringify({
                name,
                morningTime,
                afternoonTime,
                eveningTime,
                ...businessContext
            })`;

content = content.replace(pattern2, replacement2);

fs.writeFileSync('public/app.js', content, 'utf8');
console.log('✅ app.js updated successfully');
