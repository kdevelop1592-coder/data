import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBTVAcIW4-lZnXn5_ilHJobuIgi6zPaT3g",
    authDomain: "data-test-96fc2.firebaseapp.com",
    projectId: "data-test-96fc2",
    storageBucket: "data-test-96fc2.firebasestorage.app",
    messagingSenderId: "249421840962",
    appId: "1:249421840962:web:23f3e9bbddab151cfc63db",
    measurementId: "G-DS4WG7MH0S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUser = null;

// DOM Elements
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userInfoDisplay = document.getElementById('user-info');
const policyModal = document.getElementById('policy-modal');
const policyAgreeBtn = document.getElementById('policy-agree-btn');
const policyCancelBtn = document.getElementById('policy-cancel-btn');

let pendingCreds = null; // To hold user info temporarily before policy agreement

function updateUI(user, dbUser) {
    if (user && dbUser) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (userInfoDisplay) {
            userInfoDisplay.textContent = `${dbUser.name}님 환영합니다! (최고점: ${dbUser.score || 0})`;
            userInfoDisplay.style.display = 'inline-block';
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userInfoDisplay) userInfoDisplay.style.display = 'none';
    }
}

async function checkUserStatus(user) {
    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
        const userData = docSnap.data();
        if (userData.status === 'blocked' || userData.status === 'deleted') {
            alert('이용이 정지되거나 퇴장당한 계정입니다.');
            await signOut(auth);
            return null;
        }
        return userData;
    } else {
        // Show policy modal for new users
        if (policyModal) {
            policyModal.style.display = 'flex';
            pendingCreds = user;
        }
        return null;
    }
}

if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            const userData = await checkUserStatus(user);
            if (userData) {
                currentUser = { ...user, dbData: userData };
                updateUI(user, userData);
            }
        } catch (error) {
            console.error("Login failed", error);
            alert("로그인에 실패했습니다.");
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await signOut(auth);
    });
}

if (policyAgreeBtn) {
    policyAgreeBtn.addEventListener('click', async () => {
        if (!pendingCreds) return;

        const isConsentChecked = document.getElementById('policy-consent').checked;
        if (!isConsentChecked) {
            alert('개인정보 수집 및 이용에 동의하셔야 가입이 가능합니다.');
            return;
        }

        try {
            const newUser = {
                uid: pendingCreds.uid,
                email: pendingCreds.email,
                name: pendingCreds.displayName,
                score: 0,
                status: 'active',
                createdAt: new Date()
            };

            await setDoc(doc(db, 'users', pendingCreds.uid), newUser);
            policyModal.style.display = 'none';
            currentUser = { ...pendingCreds, dbData: newUser };
            updateUI(pendingCreds, newUser);
            pendingCreds = null;
            alert('가입이 완료되었습니다!');
        } catch (error) {
            console.error('Error saving user data:', error);
            alert('사용자 정보 저장 중 오류가 발생했습니다.');
        }
    });
}

if (policyCancelBtn) {
    policyCancelBtn.addEventListener('click', async () => {
        policyModal.style.display = 'none';
        pendingCreds = null;
        await signOut(auth);
    });
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userData = await checkUserStatus(user);
        if (userData) {
            currentUser = { ...user, dbData: userData };
            updateUI(user, userData);
        } else if (!pendingCreds) {
            // Document doesn't exist and modal isn't showing, effectively logged out
            currentUser = null;
            updateUI(null, null);
        }
    } else {
        currentUser = null;
        updateUI(null, null);
    }
});

export { auth, db, currentUser };
