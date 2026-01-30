import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

async function runTest() {
    console.log("🧪 Testing Marketing Dashboard API (Client Only)...");

    try {
        // 1. Test GET Profile
        console.log("\n--- 1. Testing GET Profile ---");
        const getRes = await axios.get(`${API_URL}/marketing/profile`);
        console.log("Status:", getRes.status);
        console.log("Data:", getRes.data);
        if (getRes.status !== 200) throw new Error("GET failed");

        // 2. Test PUT Profile
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

        // 3. Verify Update
        console.log("\n--- 3. Verifying Update ---");
        const verifyRes = await axios.get(`${API_URL}/marketing/profile`);
        console.log("Updated Data:", verifyRes.data);
        if (verifyRes.data.productInfo !== updateData.productInfo) throw new Error("Update not persisted");

        // 4. Test Campaign Creation
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
        } else if (error.code === 'ECONNREFUSED') {
            console.error("❌ Connection Refused. Is the server running on port 3000?");
        }
    }
}

runTest();
