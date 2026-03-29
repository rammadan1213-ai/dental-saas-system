// ==================== FIREBASE IMPORTS ====================
// We use the CDN version for easy running with Live Server
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

// ==================== FIREBASE CONFIGURATION ====================
// These are your specific project keys
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

function getHospitalFilter(collectionName = null) {
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
        
        const userQuery = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
        let userRole = 'receptionist';
        let hospitalId = null;
        
        if (!userQuery.empty) {
            const userData = userQuery.docs[0].data();
            userRole = userData.role;
            hospitalId = userData.hospitalId;
        }
        
        if (email === SUPER_ADMIN_EMAIL) {
            userRole = 'superadmin';
            hospitalId = null;
        }
        
        currentUser = { uid: user.uid, email: user.email, role: userRole };
        currentUserRole = userRole;
        currentHospitalId = hospitalId;
        
        localStorage.setItem('dentalUser', JSON.stringify(currentUser));
        localStorage.setItem('dentalHospitalId', hospitalId);
        
        showApp();
        showNotification(`Welcome ${email}!`);
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
        setTimeout(() => errorDiv.style.display = 'none', 3000);
    }
}

async function handleLogout() {
    try {
        await signOut(auth);
        localStorage.removeItem('dentalUser');
        localStorage.removeItem('dentalHospitalId');
        currentUser = null;
        currentUserRole = null;
        currentHospitalId = null;
        showLogin();
        showNotification('Logged out successfully');
    } catch (error) {
        showNotification('Logout failed: ' + error.message, 'error');
    }
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
    loadAppointments();
    loadTreatments();
    loadBilling();
    loadInventory();
    loadStaffUsers();
    
    if (isSuperAdmin()) {
        loadHospitals();
        document.getElementById('navHospitals').style.display = 'block';
    } else {
        document.getElementById('navHospitals').style.display = 'none';
    }
}

function updateUserInfo() {
    const userInfoDiv = document.getElementById('userInfo');
    const roleDisplay = isSuperAdmin() ? 'SUPER ADMIN' : currentUserRole?.toUpperCase();
    userInfoDiv.innerHTML = `
        <div style="font-weight: bold;">${sanitize(currentUser?.email || 'User')}</div>
        <div style="font-size: 12px;">${roleDisplay}</div>
        <div class="role-badge role-${isSuperAdmin() ? 'admin' : currentUserRole}">${roleDisplay}</div>
    `;
}

function setupNavigationPermissions() {
    document.querySelectorAll('.nav-link[data-permission]').forEach(link => {
        const permission = link.getAttribute('data-permission');
        if (!hasPermission(permission)) {
            link.style.display = 'none';
        }
    });
}

// ==================== DASHBOARD ====================
async function loadDashboard() {
    if (!hasPermission('view_dashboard')) return;
    
    if (!isSuperAdmin() && currentHospitalId) {
        const hospitalQuery = await getDocs(query(collection(db, 'hospitals'), where('hospitalId', '==', currentHospitalId)));
        if (!hospitalQuery.empty) {
            const hospital = hospitalQuery.docs[0].data();
            document.getElementById('hospitalNameDisplay').innerHTML = `<h3>🏥 ${sanitize(hospital.name)}</h3>`;
        }
    } else if (isSuperAdmin()) {
        document.getElementById('hospitalNameDisplay').innerHTML = `<h3>👑 Super Admin - All Hospitals</h3>`;
    }
    
    await loadPatientSelects();
}

// ==================== PATIENTS CRUD ====================
async function savePatient() {
    if (!hasPermission('add_patients')) {
        showNotification('You don\'t have permission to add patients', 'error');
        return;
    }
    
    const id = document.getElementById('patientId').value;
    const name = document.getElementById('patientName').value.trim();
    const phone = document.getElementById('patientPhone').value.trim();
    const email = document.getElementById('patientEmail').value;
    const address = document.getElementById('patientAddress').value;
    const dob = document.getElementById('patientDob').value;
    const history = document.getElementById('patientHistory').value;
    
    if (!name || !phone) {
        showNotification('Name and phone are required', 'error');
        return;
    }
    
    const patientData = {
        name, phone, email, address, dob, history,
        hospitalId: isSuperAdmin() ? null : currentHospitalId,
        updatedAt: Timestamp.now()
    };
    
    try {
        if (id) {
            await updateDoc(doc(db, 'patients', id), patientData);
            showNotification('Patient updated successfully');
        } else {
            await addDoc(collection(db, 'patients'), {
                ...patientData,
                createdAt: Timestamp.now()
            });
            showNotification('Patient added successfully');
        }
        clearPatientForm();
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
}

function clearPatientForm() {
    document.getElementById('patientId').value = '';
    document.getElementById('patientName').value = '';
    document.getElementById('patientPhone').value = '';
    document.getElementById('patientEmail').value = '';
    document.getElementById('patientAddress').value = '';
    document.getElementById('patientDob').value = '';
    document.getElementById('patientHistory').value = '';
}

async function loadPatients() {
    if (!hasPermission('view_patients')) return;
    
    let patientsQuery = collection(db, 'patients');
    const filters = getHospitalFilter();
    if (filters.length > 0) {
        patientsQuery = query(collection(db, 'patients'), ...filters);
    }
    
    onSnapshot(patientsQuery, (snapshot) => {
        const tbody = document.getElementById('patientsTableBody');
        let html = '';
        
        snapshot.forEach(doc => {
            const p = doc.data();
            html += `
                <tr>
                    <td>${sanitize(p.name)}</td>
                    <td>${sanitize(p.phone)}</td>
                    <td>${sanitize(p.email || 'N/A')}</td>
                    <td>
                        ${hasPermission('edit_patients') ? `<button class="action-btn edit-btn" onclick="editPatient('${doc.id}')">Edit</button>` : ''}
                        ${hasPermission('delete_patients') ? `<button class="action-btn delete-btn" onclick="deletePatient('${doc.id}')">Delete</button>` : ''}
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html || '<tr><td colspan="4" style="text-align: center;">No patients found</td></tr>';
        document.getElementById('totalPatients').textContent = snapshot.size;
    });
}

// ==================== APPOINTMENTS CRUD ====================
async function loadPatientSelects() {
    let patientsQuery = collection(db, 'patients');
    const filters = getHospitalFilter();
    if (filters.length > 0) {
        patientsQuery = query(collection(db, 'patients'), ...filters);
    }
    
    const patientsSnapshot = await getDocs(patientsQuery);
    const options = '<option value="">Select Patient</option>' + 
        patientsSnapshot.docs.map(doc => `<option value="${doc.id}">${sanitize(doc.data().name)}</option>`).join('');
    
    document.getElementById('appointmentPatientId').innerHTML = options;
    document.getElementById('treatmentPatientId').innerHTML = options;
    document.getElementById('billingPatientId').innerHTML = options;
}

async function saveAppointment() {
    if (!hasPermission('add_appointments')) {
        showNotification('You don\'t have permission to add appointments', 'error');
        return;
    }
    
    const patientId = document.getElementById('appointmentPatientId').value;
    const date = document.getElementById('appointmentDate').value;
    const time = document.getElementById('appointmentTime').value;
    const dentist = document.getElementById('appointmentDentist').value;
    const status = document.getElementById('appointmentStatus').value;
    const notes = document.getElementById('appointmentNotes').value;
    
    if (!patientId || !date || !time) {
        showNotification('Patient, date, and time are required', 'error');
        return;
    }
    
    try {
        await addDoc(collection(db, 'appointments'), {
            patientId, date, time, dentist, status, notes,
            hospitalId: isSuperAdmin() ? null : currentHospitalId,
            createdAt: Timestamp.now(),
            createdBy: currentUser?.uid
        });
        showNotification('Appointment scheduled successfully');
        clearAppointmentForm();
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
}

function clearAppointmentForm() {
    document.getElementById('appointmentPatientId').value = '';
    document.getElementById('appointmentDate').value = '';
    document.getElementById('appointmentTime').value = '';
    document.getElementById('appointmentStatus').value = 'scheduled';
    document.getElementById('appointmentNotes').value = '';
}

async function loadAppointments() {
    if (!hasPermission('view_appointments')) return;
    
    let appointmentsQuery = collection(db, 'appointments');
    const filters = getHospitalFilter();
    if (filters.length > 0) {
        appointmentsQuery = query(collection(db, 'appointments'), ...filters);
    }
    
    onSnapshot(appointmentsQuery, async (snapshot) => {
        const tbody = document.getElementById('appointmentsTableBody');
        let html = '';
        
        for (const docSnap of snapshot.docs) {
            const apt = docSnap.data();
            let patientName = 'Unknown';
            
            try {
                const patientDoc = await getDoc(doc(db, 'patients', apt.patientId));
                if (patientDoc.exists()) patientName = patientDoc.data().name;
            } catch (e) {}
            
            html += `
                <tr>
                    <td>${sanitize(patientName)}</td>
                    <td>${apt.date || 'N/A'}</td>
                    <td>${apt.time || 'N/A'}</td>
                    <td>${sanitize(apt.dentist || 'N/A')}</td>
                    <td><span class="status-badge status-${apt.status}">${apt.status || 'scheduled'}</span></td>
                    <td>
                        ${hasPermission('delete_appointments') ? `<button class="action-btn delete-btn" onclick="deleteAppointment('${docSnap.id}')">Delete</button>` : ''}
                    </td>
                </tr>
            `;
        }
        
        tbody.innerHTML = html || '<tr><td colspan="6" style="text-align: center;">No appointments found</td></tr>';
        
        const today = new Date().toISOString().split('T')[0];
        const todayCount = snapshot.docs.filter(d => d.data().date === today).length;
        const totalAptElem = document.getElementById('todayAppointments');
        if (totalAptElem) totalAptElem.textContent = todayCount;
    });
}

// ==================== TREATMENTS CRUD ====================
async function saveTreatment() {
    if (!hasPermission('add_treatments')) {
        showNotification('You don\'t have permission to add treatments', 'error');
        return;
    }
    
    const patientId = document.getElementById('treatmentPatientId').value;
    const type = document.getElementById('treatmentType').value;
    const date = document.getElementById('treatmentDate').value;
    const cost = parseFloat(document.getElementById('treatmentCost').value) || 0;
    const notes = document.getElementById('treatmentNotes').value;
    
    if (!patientId || !type || !date) {
        showNotification('Patient, type, and date are required', 'error');
        return;
    }
    
    try {
        await addDoc(collection(db, 'treatments'), {
            patientId, type, date, cost, notes,
            hospitalId: isSuperAdmin() ? null : currentHospitalId,
            createdAt: Timestamp.now()
        });
        showNotification('Treatment saved successfully');
        clearTreatmentForm();
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
}

function clearTreatmentForm() {
    document.getElementById('treatmentPatientId').value = '';
    document.getElementById('treatmentType').value = 'Cleaning';
    document.getElementById('treatmentDate').value = '';
    document.getElementById('treatmentCost').value = '';
    document.getElementById('treatmentNotes').value = '';
}

async function loadTreatments() {
    if (!hasPermission('view_treatments')) return;
    
    let treatmentsQuery = collection(db, 'treatments');
    const filters = getHospitalFilter();
    if (filters.length > 0) {
        treatmentsQuery = query(collection(db, 'treatments'), ...filters);
    }
    
    onSnapshot(treatmentsQuery, async (snapshot) => {
        const tbody = document.getElementById('treatmentsTableBody');
        let html = '';
        
        for (const docSnap of snapshot.docs) {
            const tx = docSnap.data();
            let patientName = 'Unknown';
            
            try {
                const patientDoc = await getDoc(doc(db, 'patients', tx.patientId));
                if (patientDoc.exists()) patientName = patientDoc.data().name;
            } catch (e) {}
            
            html += `
                <tr>
                    <td>${sanitize(patientName)}</td>
                    <td>${sanitize(tx.type)}</td>
                    <td>${tx.date || 'N/A'}</td>
                    <td>$${tx.cost || 0}</td>
                    <td>
                        <button class="action-btn delete-btn" onclick="deleteTreatment('${docSnap.id}')">Delete</button>
                    </td>
                </tr>
            `;
        }
        
        tbody.innerHTML = html || '<tr><td colspan="5" style="text-align: center;">No treatments found</td></tr>';
    });
}

// ==================== BILLING CRUD ====================
async function saveBilling() {
    if (!hasPermission('add_billing')) {
        showNotification('You don\'t have permission to add billing', 'error');
        return;
    }
    
    const patientId = document.getElementById('billingPatientId').value;
    const amount = parseFloat(document.getElementById('billingAmount').value);
    const status = document.getElementById('billingStatus').value;
    const dueDate = document.getElementById('billingDueDate').value;
    const description = document.getElementById('billingDescription').value;
    
    if (!patientId || !amount) {
        showNotification('Patient and amount are required', 'error');
        return;
    }
    
    try {
        await addDoc(collection(db, 'billing'), {
            patientId, amount, status, dueDate, description,
            hospitalId: isSuperAdmin() ? null : currentHospitalId,
            createdAt: Timestamp.now()
        });
        showNotification('Invoice created successfully');
        clearBillingForm();
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
}

function clearBillingForm() {
    document.getElementById('billingPatientId').value = '';
    document.getElementById('billingAmount').value = '';
    document.getElementById('billingStatus').value = 'pending';
    document.getElementById('billingDueDate').value = '';
    document.getElementById('billingDescription').value = '';
}

async function loadBilling() {
    if (!hasPermission('view_billing')) return;
    
    let billingQuery = collection(db, 'billing');
    const filters = getHospitalFilter();
    if (filters.length > 0) {
        billingQuery = query(collection(db, 'billing'), ...filters);
    }
    
    onSnapshot(billingQuery, async (snapshot) => {
        const tbody = document.getElementById('billingTableBody');
        let html = '';
        let pendingTotal = 0;
        
        for (const docSnap of snapshot.docs) {
            const bill = docSnap.data();
            let patientName = 'Unknown';
            
            try {
                const patientDoc = await getDoc(doc(db, 'patients', bill.patientId));
                if (patientDoc.exists()) patientName = patientDoc.data().name;
            } catch (e) {}
            
            if (bill.status === 'pending') pendingTotal += bill.amount || 0;
            
            html += `
                <tr>
                    <td>${sanitize(patientName)}</td>
                    <td>$${bill.amount || 0}</td>
                    <td><span class="status-badge status-${bill.status}">${bill.status}</span></td>
                    <td>${bill.dueDate || 'N/A'}</td>
                    <td>
                        <button class="action-btn delete-btn" onclick="deleteBilling('${docSnap.id}')">Delete</button>
                    </td>
                </tr>
            `;
        }
        
        tbody.innerHTML = html || '<tr><td colspan="5" style="text-align: center;">No invoices found</td></tr>';
        const pendingElem = document.getElementById('pendingBills');
        const revElem = document.getElementById('monthlyRevenue');
        if (pendingElem) pendingElem.textContent = `$${pendingTotal}`;
        if (revElem) revElem.textContent = `$${pendingTotal}`;
    });
}

// ==================== INVENTORY CRUD ====================
async function saveInventory() {
    if (!hasPermission('add_inventory')) {
        showNotification('You don\'t have permission to add inventory', 'error');
        return;
    }
    
    const name = document.getElementById('inventoryName').value.trim();
    const quantity = parseInt(document.getElementById('inventoryQuantity').value) || 0;
    const price = parseFloat(document.getElementById('inventoryPrice').value) || 0;
    const category = document.getElementById('inventoryCategory').value;
    
    if (!name) {
        showNotification('Item name is required', 'error');
        return;
    }
    
    try {
        await addDoc(collection(db, 'inventory'), {
            name, quantity, price, category,
            hospitalId: isSuperAdmin() ? null : currentHospitalId,
            createdAt: Timestamp.now()
        });
        showNotification('Inventory item added successfully');
        clearInventoryForm();
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
}

function clearInventoryForm() {
    document.getElementById('inventoryName').value = '';
    document.getElementById('inventoryQuantity').value = '';
    document.getElementById('inventoryPrice').value = '';
    document.getElementById('inventoryCategory').value = 'Medication';
}

async function loadInventory() {
    if (!hasPermission('view_inventory')) return;
    
    let inventoryQuery = collection(db, 'inventory');
    const filters = getHospitalFilter();
    if (filters.length > 0) {
        inventoryQuery = query(collection(db, 'inventory'), ...filters);
    }
    
    onSnapshot(inventoryQuery, (snapshot) => {
        const tbody = document.getElementById('inventoryTableBody');
        let html = '';
        
        snapshot.forEach(doc => {
            const item = doc.data();
            html += `
                <tr>
                    <td>${sanitize(item.name)}</td>
                    <td>${item.quantity || 0}</td>
                    <td>$${item.price || 0}</td>
                    <td>${sanitize(item.category)}</td>
                    <td>
                        <button class="action-btn delete-btn" onclick="deleteInventory('${doc.id}')">Delete</button>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html || '<tr><td colspan="5" style="text-align: center;">No inventory items found</td></tr>';
    });
}

// ==================== STAFF USERS MANAGEMENT ====================
async function saveStaffUser() {
    if (!hasPermission('manage_users')) {
        showNotification('You don\'t have permission to manage users', 'error');
        return;
    }
    
    const name = document.getElementById('userName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const password = document.getElementById('userPassword').value;
    const role = document.getElementById('userRole').value;
    
    if (!name || !email || !password) {
        showNotification('All fields are required', 'error');
        return;
    }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await addDoc(collection(db, 'users'), {
            uid: user.uid,
            name: name,
            email: email,
            role: role,
            hospitalId: isSuperAdmin() ? null : currentHospitalId,
            createdAt: Timestamp.now()
        });
        
        showNotification('Staff user created successfully');
        clearUserForm();
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
}

function clearUserForm() {
    document.getElementById('userName').value = '';
    document.getElementById('userEmail').value = '';
    document.getElementById('userPassword').value = '';
    document.getElementById('userRole').value = 'receptionist';
}

async function loadStaffUsers() {
    if (!hasPermission('manage_users')) return;
    
    let usersQuery = collection(db, 'users');
    const filters = getHospitalFilter();
    if (filters.length > 0 && !isSuperAdmin()) {
        usersQuery = query(collection(db, 'users'), ...filters);
    }
    
    onSnapshot(usersQuery, (snapshot) => {
        const tbody = document.getElementById('usersTableBody');
        let html = '';
        
        snapshot.forEach(doc => {
            const user = doc.data();
            html += `
                <tr>
                    <td>${sanitize(user.name)}</td>
                    <td>${sanitize(user.email)}</td>
                    <td><span class="role-badge role-${user.role}">${user.role}</span></td>
                    <td>
                        <button class="action-btn delete-btn" onclick="deleteStaffUser('${doc.id}')">Delete</button>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html || '<tr><td colspan="4" style="text-align: center;">No staff users found</td></tr>';
    });
}

// ==================== HOSPITAL MANAGEMENT (SUPER ADMIN ONLY) ====================
async function saveHospital() {
    if (!isSuperAdmin()) {
        showNotification('Only Super Admin can manage hospitals', 'error');
        return;
    }
    
    const name = document.getElementById('hospitalName').value.trim();
    const adminEmail = document.getElementById('hospitalAdminEmail').value.trim();
    const phone = document.getElementById('hospitalPhone').value;
    const address = document.getElementById('hospitalAddress').value;
    const plan = document.getElementById('hospitalPlan').value;
    const status = document.getElementById('hospitalStatus').value;
    const expiry = document.getElementById('hospitalExpiry').value;
    
    if (!name || !adminEmail) {
        showNotification('Hospital name and admin email are required', 'error');
        return;
    }
    
    try {
        const hospitalId = `hospital_${Date.now()}`;
        
        await addDoc(collection(db, 'hospitals'), {
            hospitalId: hospitalId,
            name: name,
            adminEmail: adminEmail,
            phone: phone,
            address: address,
            plan: plan,
            status: status,
            expiryDate: expiry,
            createdAt: Timestamp.now()
        });
        
        showNotification('Hospital added successfully!');
        clearHospitalForm();
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
}

function clearHospitalForm() {
    document.getElementById('hospitalName').value = '';
    document.getElementById('hospitalAdminEmail').value = '';
    document.getElementById('hospitalPhone').value = '';
    document.getElementById('hospitalAddress').value = '';
    document.getElementById('hospitalPlan').value = 'trial';
    document.getElementById('hospitalStatus').value = 'active';
    document.getElementById('hospitalExpiry').value = '';
}

async function loadHospitals() {
    if (!isSuperAdmin()) return;
    
    onSnapshot(collection(db, 'hospitals'), (snapshot) => {
        const tbody = document.getElementById('hospitalsTableBody');
        let html = '';
        
        snapshot.forEach(doc => {
            const h = doc.data();
            html += `
                <tr>
                    <td>${sanitize(h.name)}</td>
                    <td>${sanitize(h.adminEmail)}</td>
                    <td>${h.plan}</td>
                    <td><span class="status-badge status-${h.status}">${h.status}</span></td>
                    <td>${h.expiryDate || 'N/A'}</td>
                    <td>
                        <button class="action-btn delete-btn" onclick="suspendHospital('${doc.id}')">Suspend</button>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html || '<tr><td colspan="6" style="text-align: center;">No hospitals found</td></tr>';
    });
}

// ==================== GLOBAL ACTIONS ====================
window.deletePatient = async (id) => {
    if (confirm('Delete this patient?')) {
        await deleteDoc(doc(db, 'patients', id));
        showNotification('Patient deleted');
    }
};

window.editPatient = async (id) => {
    const docSnap = await getDoc(doc(db, 'patients', id));
    const p = docSnap.data();
    if (p) {
        document.getElementById('patientId').value = id;
        document.getElementById('patientName').value = p.name;
        document.getElementById('patientPhone').value = p.phone;
        document.getElementById('patientEmail').value = p.email || '';
        document.getElementById('patientAddress').value = p.address || '';
        document.getElementById('patientDob').value = p.dob || '';
        document.getElementById('patientHistory').value = p.history || '';
    }
};

window.deleteAppointment = async (id) => {
    if (confirm('Delete appointment?')) {
        await deleteDoc(doc(db, 'appointments', id));
        showNotification('Appointment deleted');
    }
};

window.deleteTreatment = async (id) => {
    if (confirm('Delete treatment?')) {
        await deleteDoc(doc(db, 'treatments', id));
        showNotification('Treatment deleted');
    }
};

window.deleteBilling = async (id) => {
    if (confirm('Delete billing?')) {
        await deleteDoc(doc(db, 'billing', id));
        showNotification('Invoice deleted');
    }
};

window.deleteInventory = async (id) => {
    if (confirm('Delete item?')) {
        await deleteDoc(doc(db, 'inventory', id));
        showNotification('Item deleted');
    }
};

window.deleteStaffUser = async (id) => {
    if (confirm('Delete user?')) {
        await deleteDoc(doc(db, 'users', id));
        showNotification('User deleted');
    }
};

window.suspendHospital = async (id) => {
    if (confirm('Suspend hospital?')) {
        await updateDoc(doc(db, 'hospitals', id), { status: 'suspended' });
        showNotification('Hospital suspended');
    }
};

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const section = document.getElementById(sectionId);
    if (section) section.classList.add('active');
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userQuery = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
            let userRole = 'receptionist';
            let hospitalId = null;
            
            if (!userQuery.empty) {
                const userData = userQuery.docs[0].data();
                userRole = userData.role;
                hospitalId = userData.hospitalId;
            }
            
            if (user.email === SUPER_ADMIN_EMAIL) {
                userRole = 'superadmin';
                hospitalId = null;
            }
            
            currentUser = { uid: user.uid, email: user.email, role: userRole };
            currentUserRole = userRole;
            currentHospitalId = hospitalId;
            showApp();
        } else {
            showLogin();
        }
    });
    
    document.getElementById('loginBtn').onclick = handleLogin;
    document.getElementById('savePatientBtn').onclick = savePatient;
    document.getElementById('clearPatientBtn').onclick = clearPatientForm;
    document.getElementById('saveAppointmentBtn').onclick = saveAppointment;
    document.getElementById('clearAppointmentBtn').onclick = clearAppointmentForm;
    document.getElementById('saveTreatmentBtn').onclick = saveTreatment;
    document.getElementById('saveBillingBtn').onclick = saveBilling;
    document.getElementById('saveInventoryBtn').onclick = saveInventory;
    document.getElementById('saveUserBtn').onclick = saveStaffUser;
    document.getElementById('saveHospitalBtn').onclick = saveHospital;
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.onclick = () => {
            if (link.classList.contains('logout-btn')) {
                handleLogout();
            } else {
                const section = link.getAttribute('data-section');
                if (section) showSection(section);
            }
        };
    });
});

window.showSection = showSection;
