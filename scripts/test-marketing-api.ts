import axios from 'axios';
import { spawn } from 'child_process';
import path from 'path';

const API_URL = 'http://localhost:3000/api';

async function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
    console.log("🧪 Testing Marketing Dashboard API...");

    // 1. Start Server
    console.log("🚀 Starting Server...");
    const serverProcess = spawn('npx', ['ts-node', 'src/index.ts'], {
        cwd: process.cwd(),
        shell: true,
        stdio: 'pipe' // Pipe output to see logs if needed
    });

    // Wait for server to be ready
    let serverReady = false;
    serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('[SERVER]', output); // Uncommented for debugging
        if (output.includes('API Server running')) {
            serverReady = true;
        }
    });
    serverProcess.stderr.on('data', (data) => {
        console.error('[SERVER ERROR]', data.toString());
    });

    console.log("⏳ Waiting for server to boot...");
    let retries = 0;
    while (!serverReady && retries < 20) {
        await wait(1000);
        retries++;
    }

    if (!serverReady) {
        console.error("❌ Server failed to start in time.");
        serverProcess.kill();
        process.exit(1);
    }
    console.log("✅ Server is running!");

    try {
        // 2. Test GET Profile
        console.log("\n--- 1. Testing GET Profile ---");
        const getRes = await axios.get(`${API_URL}/marketing/profile`);
        console.log("Status:", getRes.status);
        console.log("Data:", getRes.data);
        if (getRes.status !== 200) throw new Error("GET failed");

        // 3. Test PUT Profile
        console.log("\n--- 2. Testing PUT Profile ---");
        const updateData = {
            productInfo: "API Test Soap",
            targetAudience: "API Testers",
            uniqueSellingPoint: "Automated Testing",
            brandVoice: "technical"
        };
        const putRes = await axios.put(`${API_URL}/marketing/profile`, updateData);
        console.log("Status:", putRes.status);
        console.log("Response:", putRes.data);
        if (putRes.status !== 200 || !putRes.data.success) throw new Error("PUT failed");

        // 4. Verify Update
        console.log("\n--- 3. Verifying Update ---");
        const verifyRes = await axios.get(`${API_URL}/marketing/profile`);
        console.log("Updated Data:", verifyRes.data);
        if (verifyRes.data.productInfo !== updateData.productInfo) throw new Error("Update not persisted");

        // 5. Test Campaign Creation
        console.log("\n--- 4. Testing Campaign Creation ---");
        const campRes = await axios.post(`${API_URL}/marketing/campaign`, { name: "API Test Campaign" });
        console.log("Status:", campRes.status);
        console.log("Response:", campRes.data);
        if (campRes.status !== 200 || !campRes.data.success) throw new Error("Campaign creation failed");

        console.log("\n✅ ALL MARKETING API TESTS PASSED");

    } catch (error: any) {
        console.error("❌ Test Failed:", error.message);
        if (error.response) {
            console.error("Response Data:", error.response.data);
        }
    } finally {
        // Cleanup
        console.log("🛑 Stopping Server...");
        serverProcess.kill();
        // Force kill if needed
        if (process.platform === 'win32') {
            spawn('taskkill', ['/pid', serverProcess.pid?.toString() || '', '/f', '/t']);
        } else {
            process.kill(-serverProcess.pid!);
        }
        process.exit(0);
    }
}

runTest();
