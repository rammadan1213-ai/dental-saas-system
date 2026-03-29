import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔴 PUT YOUR FIREBASE CONFIG HERE
const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let editId = null;

// LOGIN
loginBtn.onclick = async () => {
  try {
    await signInWithEmailAndPassword(auth, loginEmail.value, loginPassword.value);
  } catch (e) {
    loginError.textContent = e.message;
  }
};

// AUTH STATE
onAuthStateChanged(auth, user => {
  if (user) {
    loginScreen.style.display = "none";
    mainContainer.classList.add("show");
    loadPatients();
  }
});

// NAVIGATION
document.querySelectorAll(".nav-link").forEach(btn => {
  btn.onclick = () => {
    if (btn.classList.contains("logout-btn")) {
      signOut(auth);
      location.reload();
      return;
    }

    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.getElementById(btn.dataset.section).classList.add("active");
  };
});

// SAVE / UPDATE
savePatientBtn.onclick = async () => {
  if (!patientName.value || !patientPhone.value) {
    alert("Name & phone required");
    return;
  }

  if (editId) {
    await updateDoc(doc(db, "patients", editId), {
      name: patientName.value,
      phone: patientPhone.value,
      email: patientEmail.value
    });
    editId = null;
  } else {
    await addDoc(collection(db, "patients"), {
      name: patientName.value,
      phone: patientPhone.value,
      email: patientEmail.value
    });
  }

  patientName.value = "";
  patientPhone.value = "";
  patientEmail.value = "";
};

// LOAD + DASHBOARD
function loadPatients() {
  onSnapshot(collection(db, "patients"), snap => {
    totalPatients.textContent = snap.size;

    patientsTableBody.innerHTML = snap.docs.map(d => {
      const p = d.data();
      return `
        <tr>
          <td>${p.name}</td>
          <td>${p.phone}</td>
          <td>${p.email}</td>
          <td>
            <button onclick="editPatient('${d.id}','${p.name}','${p.phone}','${p.email}')">Edit</button>
            <button onclick="deletePatient('${d.id}')">Delete</button>
          </td>
        </tr>`;
    }).join("");
  });
}

// DELETE
window.deletePatient = async (id) => {
  if (confirm("Delete this patient?")) {
    await deleteDoc(doc(db, "patients", id));
  }
};

// EDIT
window.editPatient = (id, name, phone, email) => {
  editId = id;
  patientName.value = name;
  patientPhone.value = phone;
  patientEmail.value = email;
};
