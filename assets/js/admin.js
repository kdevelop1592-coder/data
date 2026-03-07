import { auth, db } from './auth.js';
import { collection, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const ADMIN_EMAIL = "kdevelop1592@gmail.com";

const accessDeniedDiv = document.getElementById('access-denied');
const adminContentDiv = document.getElementById('admin-content');
const userListTbody = document.getElementById('user-list');

function formatDate(dateItem) {
    if (!dateItem) return '-';
    // Firestore Timestamp 처리
    const date = dateItem.toDate ? dateItem.toDate() : new Date(dateItem);
    return date.toLocaleString('ko-KR');
}

async function fetchUsers() {
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        userListTbody.innerHTML = '';

        querySnapshot.forEach((docSnap) => {
            const userData = docSnap.data();
            const uid = docSnap.id;

            // 어드민 계정은 리스트에서 제외 (원한다면 제거 후 표시 가능)
            if (userData.email === ADMIN_EMAIL) return;

            const tr = document.createElement('tr');

            let statusBadge = '';
            if (userData.status === 'blocked') {
                statusBadge = '<span class="status-badge status-blocked">차단됨</span>';
            } else if (userData.status === 'deleted') {
                statusBadge = '<span class="status-badge status-deleted">퇴장됨</span>';
            } else {
                statusBadge = '<span class="status-badge status-active">정상</span>';
            }

            const isBlocked = userData.status === 'blocked';
            const blockBtnText = isBlocked ? '차단 해제' : '차단 (정지)';
            const blockBtnClass = isBlocked ? 'block-btn unblock' : 'block-btn';

            tr.innerHTML = `
                <td>${userData.name || '-'}</td>
                <td>${userData.email || '-'}</td>
                <td>${formatDate(userData.createdAt)}</td>
                <td>${userData.score || 0}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="action-btn ${blockBtnClass}" onclick="toggleBlockUser('${uid}', ${isBlocked})">${blockBtnText}</button>
                    <button class="action-btn delete-btn" onclick="kickUser('${uid}')">강제 퇴장</button>
                </td>
            `;
            userListTbody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error fetching users:", error);
    }
}

// Global scope에 할당하여 html onclick 이벤트에서 접근할 수 있도록 함
window.toggleBlockUser = async (uid, isCurrentlyBlocked) => {
    if (confirm(isCurrentlyBlocked ? '차단을 해제하시겠습니까?' : '이 사용자를 차단하시겠습니까? (차단 시 앱 이용이 불가해집니다)')) {
        try {
            await updateDoc(doc(db, 'users', uid), {
                status: isCurrentlyBlocked ? 'active' : 'blocked'
            });
            fetchUsers();
            alert('상태가 변경되었습니다.');
        } catch (e) {
            console.error(e);
            alert('처리 중 오류가 발생했습니다.');
        }
    }
};

window.kickUser = async (uid) => {
    if (confirm('이 사용자를 강제 퇴장시키겠습니까? 퇴장 시 유저 데이터가 삭제되어 복구할 수 없습니다.')) {
        try {
            await deleteDoc(doc(db, 'users', uid));
            fetchUsers();
            alert('강제 퇴장 처리되었습니다.');
        } catch (e) {
            console.error(e);
            alert('처리 중 오류가 발생했습니다.');
        }
    }
};

onAuthStateChanged(auth, async (user) => {
    if (user && user.email === ADMIN_EMAIL) {
        if (accessDeniedDiv) accessDeniedDiv.style.display = 'none';
        if (adminContentDiv) adminContentDiv.style.display = 'block';
        fetchUsers();
    } else {
        if (accessDeniedDiv) {
            accessDeniedDiv.style.display = 'block';
            accessDeniedDiv.innerHTML = '<h2>접근 권한이 없습니다.</h2><p>메인 화면에서 관리자 계정으로 로그인 후 다시 접속해주세요.</p>';
        }
        if (adminContentDiv) adminContentDiv.style.display = 'none';
    }
});
