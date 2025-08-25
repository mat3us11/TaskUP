import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

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

const userArea = document.getElementById("user-area");
const linkServicos = document.getElementById("link-servicos");
const linkPublicar = document.getElementById("link-publicar");
const btnServicos = document.getElementById("btn-servicos");
const btnPublicar = document.getElementById("btn-publicar");

// Atualiza o header com base no login
onAuthStateChanged(auth, (user) => {
  if (user) {
    const nome = user.displayName || "Usuário";

    userArea.innerHTML = `
      <a href="perfil.html" class="user-link">
      <span class="user-name"> Olá, ${nome}</span>
        <i class="ph ph-user"></i>
      </a>
      <button id="logoutBtn" class="botao-sair">Sair</button>
    `;

    document.getElementById("logoutBtn").addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "login.html";
    });

  } else {
    userArea.innerHTML = `<a href="login.html" id="loginLink">Login</a>`;

    // Redirecionamento se não logado
    const redirectToLogin = (e) => {
      e.preventDefault();
      window.location.href = "login.html";
    };
    if (linkServicos) linkServicos.addEventListener("click", redirectToLogin);
    if (linkPublicar) linkPublicar.addEventListener("click", redirectToLogin);
    if (btnServicos) btnServicos.addEventListener("click", redirectToLogin);
    if (btnPublicar) btnPublicar.addEventListener("click", redirectToLogin);
  }
});
