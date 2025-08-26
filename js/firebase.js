import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyA2Nr4gt15T9NITDm_-wwMo-8ZWjhYVfxc",
  authDomain: "taskup-ef916.firebaseapp.com",
  projectId: "taskup-ef916",
  storageBucket: "taskup-ef916.firebasestorage.app",
  messagingSenderId: "912665332450",
  appId: "1:912665332450:web:ada344cbdf4e8928b72cbb",
  measurementId: "G-PR8YZT3DSR",
};

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
