const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const https = require("https");
const fs = require("fs");
const path = require("path");

admin.initializeApp();

// Configuration - REPLACE THESE
const CLIENT_ID = "codacreative";
const CLIENT_SECRET = "0VB3nMauoDze7UPpniY-mLWmJwSzxYvaRlQYW6ifC_E";

exports.tossLogin = functions.region("asia-northeast3").https.onCall(async (data, context) => {
    const authCode = data.code;
    if (!authCode) {
        throw new functions.https.HttpsError('invalid-argument', 'Authorization code is missing');
    }

    try {
        // 1. Load mTLS Certificates
        const certPath = path.join(__dirname, "certs");

        let cert, key;
        try {
            cert = fs.readFileSync(path.join(certPath, "codacreative_public.crt"));
            key = fs.readFileSync(path.join(certPath, "codacreative_private.key"));
        } catch (e) {
            throw new functions.https.HttpsError('internal', 'mTLS Certificates not found in functions/certs/');
        }

        const httpsAgent = new https.Agent({
            cert: cert,
            key: key,
            // passphrase: "If your key has a password, put it here"
        });

        // 2. Exchange Auth Code for Access Token
        // Docs: https://developers-apps-in-toss.toss.im/login/develop.html#_2-accesstoken-받기
        const tokenResponse = await axios.post(
            "https://api-partner.toss.im/api-partner/v1/apps-in-toss/user/oauth2/generate-token",
            {
                grant_type: "authorization_code",
                code: authCode,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET
            },
            {
                httpsAgent: httpsAgent,
                headers: { "Content-Type": "application/json" }
            }
        );

        const accessToken = tokenResponse.data.success.accessToken;

        // 3. Get User Info (User Key)
        // Docs: https://developers-apps-in-toss.toss.im/login/develop.html#_4-사용자-정보-받기
        const userResponse = await axios.get(
            "https://api-partner.toss.im/api-partner/v1/apps-in-toss/user/oauth2/login-me",
            {
                httpsAgent: httpsAgent,
                headers: { Authorization: `Bearer ${accessToken}` }
            }
        );

        const userKey = userResponse.data.success.userKey; // Unique User ID

        // 4. Create Firebase Custom Token
        const firebaseToken = await admin.auth().createCustomToken(String(userKey));

        console.log(`✅ Toss Login Success for UserKey: ${userKey}`);

        return {
            token: firebaseToken,
            userKey: userKey
        };

    } catch (error) {
        console.error("Toss Login Error:", error.response ? error.response.data : error.message);
        throw new functions.https.HttpsError('internal', 'Login Failed', error.message);
    }
});

// Scheduled Batch: Cleanup Old History
// Run every month on the 1st at 00:00 KST (Asia/Seoul)
exports.cleanupOldHistory = functions.region("asia-northeast3").pubsub.schedule("0 0 1 * *")
    .timeZone("Asia/Seoul")
    .onRun(async (context) => {
        const db = admin.firestore();
        const now = new Date();

        // Target: Keep "This Month" and "Last Month". Delete everything before "Last Month 1st".
        // Example: If now is Dec 1st. Keep Dec & Nov. Cutoff is Nov 1st.
        // getMonth() is 0-indexed. 
        // Dec (11) -> diff 1 -> 10 (Nov).
        const cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        console.log(`🧹 Starting Cleanup Batch. Cutoff Date: ${cutoffDate.toISOString()}`);

        try {
            // Collection Group Query to find ALL 'history' docs across all users
            const snapshot = await db.collectionGroup("history")
                .where("date", "<", admin.firestore.Timestamp.fromDate(cutoffDate))
                .get();

            if (snapshot.empty) {
                console.log("✅ No old records founds to delete.");
                return null;
            }

            console.log(`🗑️ Found ${snapshot.size} old records to delete.`);

            // Batch Delete (Max 500 ops per batch)
            const batchSize = 500;
            let batch = db.batch();
            let count = 0;
            let batchCount = 0;

            for (const doc of snapshot.docs) {
                batch.delete(doc.ref);
                count++;

                if (count >= batchSize) {
                    await batch.commit();
                    batchCount++;
                    console.log(`   - Committed Batch #${batchCount} (${count} docs)`);
                    batch = db.batch();
                    count = 0;
                }
            }

            if (count > 0) {
                await batch.commit();
                console.log(`   - Committed Final Batch (${count} docs)`);
            }

            console.log("✅ Cleanup Complete Successfully.");
            return null;

        } catch (error) {
            console.error("❌ Cleanup Batch Error:", error);
            return null;
        }
    });
