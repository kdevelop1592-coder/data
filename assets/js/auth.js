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

const passwordModal = document.getElementById('password-modal');
const passwordInput = document.getElementById('secondary-password-input');
const passwordSubmitBtn = document.getElementById('password-submit-btn');
const passwordCancelBtn = document.getElementById('password-cancel-btn');
const passwordModalDesc = document.getElementById('password-modal-desc');
const adminBtn = document.getElementById('admin-btn');

let pendingCreds = null; // To hold user info temporarily before policy agreement
let pendingUserData = null; // For existing users
let isNewUserFlow = false; // Flag to check if setting new password or verifying
let isSecondAuthPassed = false;
function updateUI(user, dbUser) {
    if (user && dbUser && isSecondAuthPassed) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (userInfoDisplay) {
            userInfoDisplay.textContent = `${dbUser.name}님 환영합니다! (최고점: ${dbUser.score || 0})`;
            userInfoDisplay.style.display = 'inline-block';
        }
        if (adminBtn && user.email === 'kdevelop1592@gmail.com') {
            adminBtn.style.display = 'inline-block';
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userInfoDisplay) userInfoDisplay.style.display = 'none';
        if (adminBtn) adminBtn.style.display = 'none';
    }
}

async function initiateAuthFlow(user) {
    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
        const userData = docSnap.data();
        if (userData.status === 'blocked' || userData.status === 'deleted') {
            alert('이용이 정지되거나 퇴장당한 계정입니다.');
            await signOut(auth);
            return;
        }
        pendingCreds = user;
        pendingUserData = userData;
        isNewUserFlow = false;

        if (passwordModal) {
            passwordModal.style.display = 'flex';
            if (passwordInput) passwordInput.value = '';
            if (passwordModalDesc) passwordModalDesc.textContent = '서비스 이용을 위해 설정하신 2차 비밀번호를 입력해주세요.';
        }
    } else {
        // Show policy modal for new users
        pendingCreds = user;
        if (policyModal) {
            policyModal.style.display = 'flex';
        }
    }
}

if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            // initiateAuthFlow는 onAuthStateChanged에서 처리되므로 여기선 팝업만 실행해도 됨.
            // 단, 이미 로그인된 상태에서 버튼을 강제로 누른 경우는 명시적 호출
            if (!isSecondAuthPassed) {
                await initiateAuthFlow(result.user);
            }
        } catch (error) {
            console.error("Login failed", error);
            alert("로그인에 실패했습니다.");
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        isSecondAuthPassed = false;
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

        // 약관 동의 통과 시 2차 비밀번호 설정 창으로 이동
        policyModal.style.display = 'none';
        isNewUserFlow = true;
        if (passwordModal) {
            passwordModal.style.display = 'flex';
            if (passwordInput) passwordInput.value = '';
            if (passwordModalDesc) passwordModalDesc.textContent = '사용하실 2차 비밀번호를 설정해주세요.';
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

if (passwordSubmitBtn) {
    passwordSubmitBtn.addEventListener('click', async () => {
        const pwd = passwordInput.value;
        if (!pwd) {
            alert('비밀번호를 입력해주세요.');
            return;
        }

        if (isNewUserFlow) {
            // 신규 가입 저장 처리
            try {
                const newUser = {
                    uid: pendingCreds.uid,
                    email: pendingCreds.email,
                    name: pendingCreds.displayName,
                    score: 0,
                    status: 'active',
                    password: pwd, // 실 서비스에선 해싱 필요
                    createdAt: new Date()
                };

                await setDoc(doc(db, 'users', pendingCreds.uid), newUser);
                passwordModal.style.display = 'none';
                isSecondAuthPassed = true;
                currentUser = { ...pendingCreds, dbData: newUser };
                updateUI(pendingCreds, newUser);
                pendingCreds = null;
                alert('가입 및 설정이 완료되었습니다!');
            } catch (error) {
                console.error('Error saving user data:', error);
                alert('사용자 정보 저장 중 오류가 발생했습니다.');
            }
        } else {
            // 기존 사용자 검증
            if (pendingUserData.password === pwd) {
                passwordModal.style.display = 'none';
                isSecondAuthPassed = true;
                currentUser = { ...pendingCreds, dbData: pendingUserData };
                updateUI(pendingCreds, pendingUserData);
                pendingCreds = null;
                pendingUserData = null;
            } else {
                alert('비밀번호가 일치하지 않습니다.');
            }
        }
    });
}

if (passwordCancelBtn) {
    passwordCancelBtn.addEventListener('click', async () => {
        passwordModal.style.display = 'none';
        pendingCreds = null;
        pendingUserData = null;
        isSecondAuthPassed = false;
        await signOut(auth);
    });
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        if (!isSecondAuthPassed && !pendingCreds) {
            // 페이지 새로고침 등으로 Firebase Session은 있으나 2차 인증을 안한 경우
            await initiateAuthFlow(user);
        } else if (isSecondAuthPassed) {
            let uData = pendingUserData;
            if (!uData && currentUser) uData = currentUser.dbData;
            updateUI(user, uData);
        }
    } else {
        currentUser = null;
        isSecondAuthPassed = false;
        pendingCreds = null;
        pendingUserData = null;
        updateUI(null, null);
    }
});

export { auth, db, currentUser };
