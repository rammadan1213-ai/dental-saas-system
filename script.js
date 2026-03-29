// ==================== FIREBASE CONFIGURATION (FIXED) ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    onSnapshot, 
    doc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where,
    Timestamp,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCnVrv-PkGB_s_RW6ILTuK5W_H1rR07diY",
  authDomain: "dentalcare-pro-d5c6d.firebaseapp.com",
  databaseURL: "https://dentalcare-pro-d5c6d-default-rtdb.firebaseio.com",
  projectId: "dentalcare-pro-d5c6d",
  storageBucket: "dentalcare-pro-d5c6d.firebasestorage.app",
  messagingSenderId: "484161565673",
  appId: "1:484161565673:web:52bf7f19b45e7d7abed178"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==================== SUPER ADMIN CONFIGURATION ====================
const SUPER_ADMIN_EMAIL = "rammadan1213@gmail.com"; 

// ==================== PERMISSIONS SYSTEM ====================
const PERMISSIONS = {
    superadmin: [
        'view_dashboard', 'view_patients', 'add_patients', 'edit_patients', 'delete_patients',
        'view_appointments', 'add_appointments', 'edit_appointments', 'delete_appointments',
        'view_treatments', 'add_treatments', 'edit_treatments', 'delete_treatments',
        'view_billing', 'add_billing', 'edit_billing', 'delete_billing',
        'view_inventory', 'add_inventory', 'edit_inventory', 'delete_inventory',
        'manage_users', 'manage_hospitals'
    ],
    admin: [
        'view_dashboard', 'view_patients', 'add_patients', 'edit_patients', 'delete_patients',
        'view_appointments', 'add_appointments', 'edit_appointments', 'delete_appointments',
        'view_treatments', 'add_treatments', 'edit_treatments', 'delete_treatments',
        'view_billing', 'add_billing', 'edit_billing', 'delete_billing',
        'view_inventory', 'add_inventory', 'edit_inventory', 'delete_inventory',
        'manage_users'
    ],
    dentist: [
        'view_dashboard', 'view_patients', 'add_patients', 'edit_patients',
        'view_appointments', 'add_appointments', 'edit_appointments',
        'view_treatments', 'add_treatments', 'edit_treatments',
        'view_billing'
    ],
    receptionist: [
        'view_dashboard', 'view_patients', 'add_patients', 'edit_patients',
        'view_appointments', 'add_appointments', 'edit_appointments', 'delete_appointments',
        'view_billing', 'add_billing'
    ]
};

let currentUser = null;
let currentUserRole = null;
let currentHospitalId = null;

// ==================== HELPER FUNCTIONS ====================
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    notification.textContent = message;
    notification.style.borderLeftColor = type === 'error' ? '#ef4444' : '#10b981';
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 3000);
}

function sanitize(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function hasPermission(permission) {
    if (!currentUserRole) return false;
    return PERMISSIONS[currentUserRole]?.includes(permission) || false;
}

function isSuperAdmin() {
    return currentUser?.email === SUPER_ADMIN_EMAIL;
}

function getHospitalFilter() {
    if (isSuperAdmin()) return [];
    if (currentHospitalId) return [where("hospitalId", "==", currentHospitalId)];
    return [where("hospitalId", "==", "none")];
}

// ==================== AUTHENTICATION ====================
async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    
    if (!email || !password) {
        errorDiv.textContent = 'Please enter email and password';
        errorDiv.style.display = 'block';
        return;
    }
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        let userRole = 'receptionist';
        let hospitalId = null;

        if (email === SUPER_ADMIN_EMAIL) {
            userRole = 'superadmin';
        } else {
            const userQuery = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
            if (!userQuery.empty) {
                const userData = userQuery.docs[0].data();
                userRole = userData.role;
                hospitalId = userData.hospitalId;
            }

            if (hospitalId) {
                const hospitalDoc = await getDocs(query(collection(db, 'hospitals'), where('hospitalId', '==', hospitalId)));
                if (!hospitalDoc.empty) {
                    const hospital = hospitalDoc.docs[0].data();
                    if (hospital.status !== 'active') {
                        await signOut(auth);
                        throw new Error('Clinic account suspended.');
                    }
                }
            }
        }
        
        currentUser = { uid: user.uid, email: user.email, role: userRole };
        currentUserRole = userRole;
        currentHospitalId = hospitalId;
        
        localStorage.setItem('dentalUser', JSON.stringify(currentUser));
        showApp();
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
    }
}

async function handleLogout() {
    await signOut(auth);
    localStorage.removeItem('dentalUser');
    location.reload();
}

function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainContainer').classList.remove('show');
}

function showApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainContainer').classList.add('show');
    updateUserInfo();
    setupNavigationPermissions();
    loadDashboard();
    loadPatients();
}

function updateUserInfo() {
    const userInfoDiv = document.getElementById('userInfo');
    if (!userInfoDiv) return;
    const roleDisplay = isSuperAdmin() ? 'SUPER ADMIN' : currentUserRole?.toUpperCase();
    userInfoDiv.innerHTML = `<div>${sanitize(currentUser?.email)}</div><small>${roleDisplay}</small>`;
}

function setupNavigationPermissions() {
    document.querySelectorAll('.nav-link[data-permission]').forEach(link => {
        const permission = link.getAttribute('data-permission');
        link.style.display = hasPermission(permission) ? 'block' : 'none';
    });
}

// ==================== DASHBOARD & PATIENTS ====================
async function loadDashboard() {
    if (!hasPermission('view_dashboard')) return;
    const display = document.getElementById('hospitalNameDisplay');
    if (display) {
        display.innerHTML = isSuperAdmin() ? "<h3>👑 All Hospitals</h3>" : "<h3>🏥 Clinic Dashboard</h3>";
    }
}

async function loadPatients() {
    if (!hasPermission('view_patients')) return;
    let q = collection(db, 'patients');
    const filters = getHospitalFilter();
    if (filters.length > 0) q = query(q, ...filters);

    onSnapshot(q, (snapshot) => {
        const tbody = document.getElementById('patientsTableBody');
        if (!tbody) return;
        tbody.innerHTML = snapshot.docs.map(doc => {
            const p = doc.data();
            return `<tr><td>${sanitize(p.name)}</td><td>${sanitize(p.phone)}</td><td>${sanitize(p.email)}</td></tr>`;
        }).join('') || '<tr><td colspan="3">No patients found</td></tr>';
    });
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            const stored = JSON.parse(localStorage.getItem('dentalUser'));
            if (stored) {
                currentUser = stored;
                currentUserRole = stored.role;
                showApp();
            }
        } else {
            showLogin();
        }
    });

    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) loginBtn.onclick = handleLogin;
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.onclick = () => {
            if (link.classList.contains('logout-btn')) handleLogout();
        };
    });
});
