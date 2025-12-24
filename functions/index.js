const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const https = require("https");
const fs = require("fs");
const path = require("path");

admin.initializeApp();

// Toss Login Cloud Function
// Exchanges authorizationCode for userKey and creates Firebase custom token
exports.tossLogin = functions.region("asia-northeast3").runWith({
    timeoutSeconds: 60,
    memory: '256MB'
}).https.onCall(async (data, context) => {
    console.log('🔵 tossLogin called with data:', JSON.stringify(data));

    const { authorizationCode, referrer } = data;

    if (!authorizationCode || !referrer) {
        console.error('❌ Missing parameters:', { authorizationCode: !!authorizationCode, referrer: !!referrer });
        throw new functions.https.HttpsError('invalid-argument', 'authorizationCode and referrer are required');
    }

    try {
        // Load mTLS Certificates
        let httpsAgent = null;
        try {
            const certPath = path.join(__dirname, "certs");
            const privateKey = fs.readFileSync(path.join(certPath, "miracle-3min_private.key"));
            const publicCert = fs.readFileSync(path.join(certPath, "miracle-3min_public.crt"));

            httpsAgent = new https.Agent({
                cert: publicCert,
                key: privateKey,
            });
        } catch (filesErr) {
            console.error('❌ Failed to load certificates:', filesErr.message);
            throw new functions.https.HttpsError('internal', 'Server configuration error: Certificates missing');
        }

        // 1. Exchange authorizationCode for Access Token (WITH mTLS)
        console.log('🔄 Calling Toss API to generate token...');

        const tokenResponse = await axios.post(
            "https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/user/oauth2/generate-token",
            {
                authorizationCode: authorizationCode,
                referrer: referrer
            },
            {
                headers: {
                    "Content-Type": "application/json"
                },
                httpsAgent: httpsAgent,
                timeout: 10000
            }
        );

        console.log('📥 Token response:', JSON.stringify(tokenResponse.data));

        if (tokenResponse.data.resultType !== "SUCCESS") {
            console.error('❌ Token generation failed:', tokenResponse.data);
            throw new Error(tokenResponse.data.error || "Token generation failed");
        }

        const accessToken = tokenResponse.data.success.accessToken;
        const refreshToken = tokenResponse.data.success.refreshToken;

        // 2. Get User Info (userKey) (WITH mTLS)
        console.log('🔄 Calling Toss API to get user info (mTLS)...');
        const userResponse = await axios.get(
            "https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/user/oauth2/login-me",
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                },
                httpsAgent: httpsAgent, // mTLS Agent
                timeout: 10000
            }
        );

        console.log('📥 User response:', JSON.stringify(userResponse.data));

        if (userResponse.data.resultType !== "SUCCESS") {
            throw new Error(userResponse.data.error || "User info fetch failed");
        }

        const userKey = userResponse.data.success.userKey;
        console.log('✅ UserKey received:', userKey);

        // 3. Create Firebase Custom Token
        const firebaseToken = await admin.auth().createCustomToken(String(userKey));

        return {
            token: firebaseToken,
            userKey: userKey,
            refreshToken: refreshToken
        };

    } catch (error) {
        console.error("❌ Toss Login Error Name:", error.name);
        console.error("❌ Toss Login Error Message:", error.message);
        console.error("❌ Toss Login Error Code:", error.code); // ETIMEDOUT, ECONNRESET etc.

        if (error.response) {
            console.error("HTTP Status:", error.response.status);
            console.error("Response Data:", JSON.stringify(error.response.data));
            throw new functions.https.HttpsError('internal', `Toss API Error: ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
            console.error("No response received. Possible mTLS/Network issue.");
        }

        if (error.response?.data?.error === "invalid_grant") {
            throw new functions.https.HttpsError('invalid-argument', 'Authorization code expired or already used');
        }

        throw new functions.https.HttpsError('internal', `Login Failed (${error.code || 'UNKNOWN'}): ${error.message}`);
    }
});

exports.cleanupOldHistory = functions.region("asia-northeast3").pubsub.schedule("0 0 1 * *")
    .timeZone("Asia/Seoul")
    .onRun(async (context) => {
        const db = admin.firestore();
        const now = new Date();
        const cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        try {
            const snapshot = await db.collectionGroup("history")
                .where("date", "<", admin.firestore.Timestamp.fromDate(cutoffDate))
                .get();
            if (snapshot.empty) return null;
            const batchSize = 500;
            let batch = db.batch();
            let count = 0;
            for (const doc of snapshot.docs) {
                batch.delete(doc.ref);
                count++;
                if (count >= batchSize) {
                    await batch.commit();
                    batch = db.batch();
                    count = 0;
                }
            }
            if (count > 0) await batch.commit();
            return null;
        } catch (error) {
            console.error("❌ Cleanup Batch Error:", error);
            return null;
        }
    });


// Emotion Account Login (Separate Certs)
exports.emotionLogin = functions.region("asia-northeast3").runWith({
    timeoutSeconds: 60,
    memory: '256MB'
}).https.onCall(async (data, context) => {
    console.log('🔵 emotionLogin called with data:', JSON.stringify(data));

    const { authorizationCode, referrer } = data;

    if (!authorizationCode || !referrer) {
        throw new functions.https.HttpsError('invalid-argument', 'authorizationCode and referrer are required');
    }

    try {
        let httpsAgent = null;
        try {
            const certPath = path.join(__dirname, "certs");
            const privateKey = fs.readFileSync(path.join(certPath, "emotion-acct_private.key"));
            const publicCert = fs.readFileSync(path.join(certPath, "emotion-acct_public.crt"));

            httpsAgent = new https.Agent({
                cert: publicCert,
                key: privateKey,
            });
        } catch (filesErr) {
            console.error('❌ Failed to load emotion-acct certificates:', filesErr.message);
            throw new functions.https.HttpsError('internal', 'Server configuration error: Certificates missing');
        }

        // 1. Exchange Code
        const tokenResponse = await axios.post(
            "https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/user/oauth2/generate-token",
            { authorizationCode, referrer },
            {
                headers: { "Content-Type": "application/json" },
                httpsAgent: httpsAgent,
                timeout: 10000
            }
        );

        if (tokenResponse.data.resultType !== "SUCCESS") {
            throw new Error(tokenResponse.data.error || "Token generation failed");
        }

        const accessToken = tokenResponse.data.success.accessToken;
        const refreshToken = tokenResponse.data.success.refreshToken;

        // 2. Get User Info
        const userResponse = await axios.get(
            "https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/user/oauth2/login-me",
            {
                headers: { Authorization: `Bearer ${accessToken}` },
                httpsAgent: httpsAgent,
                timeout: 10000
            }
        );

        if (userResponse.data.resultType !== "SUCCESS") {
            throw new Error(userResponse.data.error || "User info fetch failed");
        }

        const userKey = userResponse.data.success.userKey;
        console.log('✅ Emotion UserKey:', userKey);

        // 3. Create Custom Token
        const firebaseToken = await admin.auth().createCustomToken(String(userKey));

        return {
            token: firebaseToken,
            userKey: userKey,
            refreshToken: refreshToken
        };

    } catch (error) {
        console.error("❌ Emotion Login Error:", error.message);
        if (error.response?.data?.error === "invalid_grant") {
            throw new functions.https.HttpsError('invalid-argument', 'Authorization code expired or already used');
        }
        throw new functions.https.HttpsError('internal', `Login Failed: ${error.message}`);
    }
});
