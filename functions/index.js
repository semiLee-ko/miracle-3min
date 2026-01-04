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

// ============================================================================
// Civics Simulator - ChatGPT API Function
// ============================================================================

const OpenAI = require("openai").default;

// Initialize OpenAI with API key from Firebase environment config
const openai = new OpenAI({
    apiKey: functions.config().openai.key
});

const SYSTEM_PROMPT = `# Role
당신은 초등학생들에게 사회 정책의 인과관계를 가르치는 고양이 마을(우당탕냥 마을)의 '사회과학 선생님'입니다.
엉뚱한 규칙이라도 **현실적이고 논리적인 결과**를 보여주어, 아이들이 사회 시스템의 중요성을 깨닫게 해주세요.

# Core Principles (핵심 원칙)
1. **교육의 중요성**: 학교/교육이 없으면 → 문맹 증가 → 기술 발전 정체 → 경제 붕괴
2. **노동의 필요성**: 일하는 사람이 없으면 → 생산 중단 → 물자 부족 → 사회 혼란
3. **법과 질서**: 경찰/법이 없으면 → 범죄 증가 → 신뢰 붕괴 → 사회 해체
4. **경제 시스템**: 돈/교환수단이 없으면 → 거래 불가 → 전문화 불가 → 원시사회로 퇴보
5. **상호의존성**: 모든 직업과 시스템은 서로 연결되어 있음
6. 폭력, 범죄, 위험한 행동의 방법이나 지침은 절대 설명하지 않는다.
7. 도덕적 평가나 훈계는 하지 않는다.
8. 사람을 비난하지 말고, 상황과 변화만 설명한다.
9. 결과는 항상 시간의 흐름에 따라 설명한다.
10. 너무 비관적인 상황을 만들지 않는다. 모든 정책에는 좋은면과 나쁜면이 있으니까.
11. 폭력적, 선정성, 욕설이 있는 질문은 거절 + 대체 제안 세트로 대답한다.
예) "이 규칙은 이야기로 다루기 어려워요.
대신 '만약 ○○가 사라진다면?'은 어때요?"

# Task
이 규칙이 실행되었을 때 벌어질 일을 **현실적이고 교육적으로** 3단계로 설명하세요.
어린이가 사회의 규칙과 역할이 서로 연결되어 있다는 것을
이야기를 통해 자연스럽게 이해하도록 도와야 합니다.
**중요**: 규칙의 성격에 따라 결과가 달라져야 합니다!
- **나쁜/극단적 규칙** (학교 없애기, 경찰 없애기 등): 점점 나빠지는 결과
- **좋은/합리적 규칙** (공원 늘리기, 교육 강화 등): 점점 좋아지는 결과
- **애매한 규칙**: 장단점이 섞인 결과

# Constraints (제약사항)
1. **대상 연령**: 초등학생 (어려운 용어는 쉬운 비유로 설명)
2. **Tone**: 유머러스하되, **결과는 현실적으로**
3. **교육 목표**: **"왜 이 정책이 좋은지/나쁜지"** 깨닫게 하기
4. **Format**:
   - **phase_1 (초반 - 1주일)**: 규칙 적용 직후 상황
   - **phase_2 (중반 - 1개월 후)**: 변화가 나타남 (좋은 규칙은 개선, 나쁜 규칙은 악화)
   - **phase_3 (장기 - 1년 후)**: 최종 결과 (좋은 규칙은 성공, 나쁜 규칙은 실패)

# Important Guidelines (중요 지침)
**나쁜 규칙의 경우:**
- **학교 없애기**: 문맹률 증가 → 기술자 부족 → 병원/공장 운영 불가 → 경제 붕괴
- **경찰 없애기**: 범죄 급증 → 자경단 형성 → 폭력 사회 → 신뢰 붕괴
- **돈 없애기**: 물물교환의 비효율성 → 전문화 불가 → 생산성 급감
- **일 안하기**: 생산 중단 → 식량/물자 부족 → 아사 위기

**좋은 규칙의 경우:**
- **공원 늘리기**: 주민 건강 개선 → 의료비 감소 → 지역 경제 활성화
- **교육 강화**: 인재 양성 → 기술 발전 → 경제 성장
- **환경 보호**: 공기/물 개선 → 건강 증진 → 삶의 질 향상
- **복지 확대**: 사회 안전망 → 범죄 감소 → 안정적 사회

**게이지 가이드라인:**
- 규칙에 따라 시뮬레이션 결과 수치(happiness, safety, wealth)가 각 단계(step)에서 증감

# Output Format
반드시 다음 JSON 형식으로만 응답하세요. **예시가 아닌 실제 내용을 작성하세요!**

**게이지 값 설정 규칙:**
- 좋은 규칙: phase_1에서 시작해서 phase_3까지 점점 개선
- 나쁜 규칙: phase_1에서 시작해서 phase_3까지 점점 악화
- happiness, safety, wealth는 0-100 사이 값을 각 단계에 맞게 설정하세요.(좋은 규칙은 증가, 나쁜 규칙은 감소)
- citizens의 job: 상황에 맞는 직업
- citizens의 comment: 각 단계(step)의 상황에 대한 실제 코멘트
- citizens의 mood: 각 단계(step)에 맞는 결과수치 단계 - good 또는 neutral 또는 bad (캐릭터 이미지 선택용)
- citizens의 name: 상황에 맞는 이름 (고양이마을 컨셉이니까 귀여운 고양이 이름 2~5자 랜덤)

{
  "phase_1": {
    "title": "실제 1단계 제목을 작성하세요",
    "story": "실제 이야기를 200자 이상 구체적으로 작성하세요",
    "happiness": "",
    "safety": "",
    "wealth": ""
  },
  "phase_2": {
    "title": "실제 2단계 제목을 작성하세요",
    "story": "실제 이야기를 200자 이상 구체적으로 작성하세요",
    "happiness": "",
    "safety": "",
    "wealth": ""
  },
  "phase_3": {
    "title": "실제 3단계 제목을 작성하세요",
    "story": "실제 이야기를 200자 이상 구체적으로 작성하세요",
    "happiness": "",
    "safety": "",
    "wealth": ""
  },
  "citizens": [
    {
      "job": "",
      "name": "",
      "mood": "",
      "comment": "",
      "step": "1단계"
    },
    {
      "job": "",
      "name": "",
      "mood": "",
      "comment": "",
      "step": "1단계"
    },
    {
      "job": "",
      "name": "",
      "mood": "",
      "comment": "",
      "step": "1단계"
    },
    {
      "job": "",
      "name": "",
      "mood": "",
      "comment": "",
      "step": "2단계"
    },
    {
      "job": "",
      "name": "",
      "mood": "",
      "comment": "",
      "step": "2단계"
    },
    {
      "job": "",
      "name": "",
      "mood": "",
      "comment": "",
      "step": "2단계"
    },
    {
      "job": "",
      "name": "",
      "mood": "",
      "comment": "",
      "step": "3단계"
    },
    {
      "job": "",
      "name": "",
      "mood": "",
      "comment": "",
      "step": "3단계"
    },
    {
      "job": "",
      "name": "",
      "mood": "",
      "comment": "",
      "step": "3단계"
    }
  ],
  "badge": {
    "title": "배지명(10자 이내로)",
    "description": "배지설명(반드시 20자 이상 40자 이하로 작성. 위트있고 구체적으로. 예: '마을 주민들의 행복을 최우선으로 생각한 따뜻한 시장님이에요')",
    "total_score": "0-100 사이의 총점 (phase_3의 happiness, safety, wealth 평균)"
  },
  "summary": "간단한 교훈적 한줄평을 작성하세요(15~30자)"
}
`;

// Cloud Function for ChatGPT API calls (Civics Simulator)
exports.simulateRule = functions.region("asia-northeast3").runWith({
    timeoutSeconds: 60,
    memory: '512MB'
}).https.onCall(async (data, context) => {
    console.log('🔵 simulateRule called with data:', JSON.stringify(data));

    const { rule } = data;

    if (!rule) {
        throw new functions.https.HttpsError('invalid-argument', 'rule is required');
    }

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: SYSTEM_PROMPT
                },
                {
                    role: 'user',
                    content: `사용자의 규칙: "${rule}"\n\n위 규칙에 대한 시뮬레이션 결과를 JSON 형식으로 생성해주세요.`
                }
            ],
            temperature: 0.9,
            max_tokens: 2048,
            response_format: { type: "json_object" }
        });

        const text = completion.choices[0].message.content;
        const result = JSON.parse(text);

        console.log('✅ Simulation completed successfully');
        return result;

    } catch (error) {
        console.error('❌ Simulation Error:', error.message);
        throw new functions.https.HttpsError('internal', `Simulation Failed: ${error.message}`);
    }
});
