import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA2Nr4gt15T9NITDm_-wwMo-8ZWjhYVfxc",
  authDomain: "taskup-ef916.firebaseapp.com",
  projectId: "taskup-ef916",
  storageBucket: "taskup-ef916.firebasestorage.app",
  messagingSenderId: "912665332450",
  appId: "1:912665332450:web:ada344cbdf4e8928b72cbb",
  measurementId: "G-PR8YZT3DSR"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector(".botao");
  const msg = document.getElementById("msg");

  if (!btn) {
    console.error("Botão de cadastro não encontrado!");
    return;
  }

  btn.addEventListener("click", async () => {
    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!nome || !email || !password) {
      msg.textContent = "❌ Preencha todos os campos!";
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Salva o nome no perfil do usuário
      await updateProfile(user, { displayName: nome });

      msg.textContent = "✅ Usuário cadastrado com sucesso!";
      console.log("Novo usuário:", user);

      // Redireciona para login
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1500);
    } catch (error) {
      msg.textContent = "❌ Erro: " + error.message;
      console.error(error);
    }
  });
});
