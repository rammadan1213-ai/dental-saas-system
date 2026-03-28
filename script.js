import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// CONFIG
const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;

// LOGIN
window.login = async () => {
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value);
  } catch (e) {
    error.innerText = e.message;
  }
};

// SESSION
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const snap = await getDocs(
    query(collection(db, "users"), where("__name__", "==", user.uid))
  );

  currentUser = snap.docs[0].data();

  loginScreen.style.display = "none";
  app.classList.add("show");

  loadPatients();
});

// ADD PATIENT (WITH CLINIC)
window.addPatient = async () => {
  if (!name.value) return;

  await addDoc(collection(db, "patients"), {
    name: name.value,
    phone: phone.value,
    clinicId: currentUser.clinicId,
    createdAt: new Date()
  });

  log("add_patient");

  name.value = "";
  phone.value = "";
};

// LOAD PATIENTS (FILTERED BY CLINIC)
function loadPatients() {
  const q = query(
    collection(db, "patients"),
    where("clinicId", "==", currentUser.clinicId)
  );

  onSnapshot(q, (snap) => {
    list.innerHTML = "";
    count.innerText = snap.size;

    snap.forEach(doc => {
      const li = document.createElement("li");
      li.innerText = doc.data().name;
      list.appendChild(li);
    });
  });
}

// LOG SYSTEM
async function log(action) {
  await addDoc(collection(db, "logs"), {
    clinicId: currentUser.clinicId,
    action,
    time: new Date()
  });
}

// ADMIN PAGE
window.goAdmin = () => {
  if (currentUser.role !== "super_admin") {
    alert("Not allowed");
    return;
  }
  window.location.href = "admin.html";
};

// LOGOUT
window.logout = () => signOut(auth);

// NAV
window.show = (id) => {
  document.querySelectorAll(".main > div").forEach(d => d.style.display = "none");
  document.getElementById(id).style.display = "block";
};