import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, updateDoc, increment, serverTimestamp, collection, addDoc, query, where, getDocs, Timestamp, orderBy } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyALxzp8NTMb05UygqzEQskMsUmF5Si1e-U",
    authDomain: "miracle-3min.firebaseapp.com",
    projectId: "miracle-3min",
    storageBucket: "miracle-3min.firebasestorage.app",
    messagingSenderId: "831208923404",
    appId: "1:831208923404:web:f4a6362be68484d0262929",
    measurementId: "G-XVDZ7518X6"
};

// Singleton pattern for App-in-Toss environment (prevents multiple init errors)
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

let currentUser = null;

// Initialize and Sign In Anonymously
export const initFirebase = () => {
    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                currentUser = user;
                console.log("🔥 Firebase User:", user.uid);
                unsubscribe();
                resolve(user);
            } else {
                signInAnonymously(auth).catch((error) => {
                    console.error("Firebase Login Error", error);
                    reject(error);
                });
            }
        });
    });
};

// Save Game Record (Increment Success & Money + Add History)
export const saveRecord = async (savedMoney, calories) => {
    if (!currentUser) return;

    const userRef = doc(db, "users", currentUser.uid);
    const historyRef = collection(userRef, "history");

    try {
        // 1. Update Aggregates
        await setDoc(userRef, {
            totalSavings: increment(Math.min(savedMoney || 0, 1000000)), // Sanity check
            successCount: increment(1),
            lastPlayed: serverTimestamp()
        }, { merge: true });

        // 2. Add History Record
        await addDoc(historyRef, {
            amount: savedMoney,
            date: serverTimestamp()
        });

        console.log("✅ Record Saved to Firebase");
    } catch (e) {
        console.error("Error saving record:", e);
    }
};

// Get Total Savings
export const getTotalSavings = async () => {
    if (!currentUser) return 0;
    const userRef = doc(db, "users", currentUser.uid);
    try {
        const snap = await getDoc(userRef);
        if (snap.exists()) {
            return snap.data().totalSavings || 0;
        }
        return 0;
    } catch (e) {
        console.error("Error fetching savings:", e);
        return 0;
    }
};

// Get Success Count
export const getSuccessCount = async () => {
    if (!currentUser) return 0;
    const userRef = doc(db, "users", currentUser.uid);
    try {
        const snap = await getDoc(userRef);
        if (snap.exists()) {
            return snap.data().successCount || 0;
        }
        return 0;
    } catch (e) {
        console.error("Error fetching count:", e);
        return 0;
    }
};

// Inject Mock Data (Run once to seed data for charts)
export const injectMockData = async () => {
    if (!currentUser) return;
    const userRef = doc(db, "users", currentUser.uid);
    const historyRef = collection(userRef, "history");

    // 3 weeks ago (approx)
    await addDoc(historyRef, { amount: 12000, date: Timestamp.fromDate(new Date(Date.now() - 21 * 24 * 60 * 60 * 1000)) });
    await addDoc(historyRef, { amount: 8000, date: Timestamp.fromDate(new Date(Date.now() - 22 * 24 * 60 * 60 * 1000)) });

    // 2 weeks ago
    await addDoc(historyRef, { amount: 15000, date: Timestamp.fromDate(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)) });
    await addDoc(historyRef, { amount: 15000, date: Timestamp.fromDate(new Date(Date.now() - 13 * 24 * 60 * 60 * 1000)) });

    // 1 week ago
    await addDoc(historyRef, { amount: 20000, date: Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) });
    await addDoc(historyRef, { amount: 25000, date: Timestamp.fromDate(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)) });

    console.log("✅ Mock Data Injected");
};

// Get Monthly Stats (Current Calendar Month)
export const getMonthlyStats = async () => {
    if (!currentUser) return 0;

    const userRef = doc(db, "users", currentUser.uid);
    const historyRef = collection(userRef, "history");

    // Get First Day of Current Month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const q = query(historyRef, where("date", ">=", Timestamp.fromDate(firstDayOfMonth)));

    try {
        const querySnapshot = await getDocs(q);
        let total = 0;
        querySnapshot.forEach((doc) => {
            total += (doc.data().amount || 0);
        });
        return total;
    } catch (e) {
        console.error("Error fetching monthly stats:", e);
        return 0;
    }
};

// Get Weekly Stats (Last 4 Calendar Weeks: Mon-Sun)
export const getWeeklyStats = async () => {
    if (!currentUser) return [0, 0, 0, 0];

    const userRef = doc(db, "users", currentUser.uid);
    const historyRef = collection(userRef, "history");

    // Helper: Get Monday of the week for a given date
    const getMonday = (d) => {
        d = new Date(d);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        d.setHours(0, 0, 0, 0);
        return new Date(d.setDate(diff));
    };

    const now = new Date();
    const thisMonday = getMonday(now);

    // Calculate start dates for buckets
    const startDates = [
        new Date(thisMonday), // This Week Start
        new Date(thisMonday), // 1 Week Ago Start
        new Date(thisMonday), // 2 Weeks Ago Start
        new Date(thisMonday)  // 3 Weeks Ago Start
    ];

    startDates[1].setDate(startDates[1].getDate() - 7);
    startDates[2].setDate(startDates[2].getDate() - 14);
    startDates[3].setDate(startDates[3].getDate() - 21);

    // Query mostly everything recent (last 30 days is safe buffer)
    const bufferDate = new Date(startDates[3]);

    const q = query(historyRef, where("date", ">=", Timestamp.fromDate(bufferDate)), orderBy("date", "asc"));

    try {
        const querySnapshot = await getDocs(q);
        const stats = [0, 0, 0, 0]; // [3 weeks ago, 2 weeks ago, 1 week ago, This week]

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const date = data.date.toDate();
            const amount = data.amount || 0;

            if (date >= startDates[0]) {
                stats[3] += amount; // This Week
            } else if (date >= startDates[1]) {
                stats[2] += amount; // 1 Week Ago
            } else if (date >= startDates[2]) {
                stats[1] += amount; // 2 Weeks Ago
            } else if (date >= startDates[3]) {
                stats[0] += amount; // 3 Weeks Ago
            }
        });

        return stats;
    } catch (e) {
        console.error("Error fetching weekly stats:", e);
        return [0, 0, 0, 0];
    }
};

// Get Today's Success Count
export const getTodaySuccessCount = async () => {
    if (!currentUser) return 0;
    const userRef = doc(db, "users", currentUser.uid);
    const historyRef = collection(userRef, "history");

    // Start of Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(historyRef, where("date", ">=", Timestamp.fromDate(today)));

    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.size; // Count number of documents
    } catch (e) {
        console.error("Error fetching today stats:", e);
        return 0; // Fail open or closed? Let's say 0 to not block if error.
    }
};
