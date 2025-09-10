// header.js
import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

// ===== Elementos do header =====
const userArea = document.getElementById("user-area");
const mobileUserArea = document.getElementById("mobileUserArea");
const linkServicos = document.getElementById("link-servicos");
const linkPublicar = document.getElementById("link-publicar");
const btnServicos = document.getElementById("btn-servicos");
const btnPublicar = document.getElementById("btn-publicar");

// Menu mobile
const hamburger = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobileMenu");
const closeBtn = document.getElementById("closeMenuBtn");
const overlay = document.getElementById("menuOverlay");

if (hamburger && mobileMenu && closeBtn && overlay) {
  // abre menu
  hamburger.addEventListener("click", () => {
    mobileMenu.classList.add("active");
    overlay.classList.add("active");
    hamburger.classList.add("hidden"); // esconde ícone ☰
  });

  // fecha menu com botão X
  closeBtn.addEventListener("click", () => {
    mobileMenu.classList.remove("active");
    overlay.classList.remove("active");
    hamburger.classList.remove("hidden");
  });

  // fecha clicando fora
  overlay.addEventListener("click", () => {
    mobileMenu.classList.remove("active");
    overlay.classList.remove("active");
    hamburger.classList.remove("hidden");
  });
}

// ===== Login / Logout =====
onAuthStateChanged(auth, (user) => {
  if (user) {
    const nome = user.displayName || "Usuário";

    // Área desktop
    if (userArea) {
      userArea.innerHTML = `
        <a href="perfil.html" class="user-link">
          <span class="user-name"> Olá, ${nome}</span>
          <i class="ph ph-user"></i>
        </a>
      `;
    }

    const logoutBtn = document.getElementById("logoutBtn");
      logoutBtn?.addEventListener("click", async () => {
        await signOut(auth);
        window.location.href = "login.html";
      });

    // Área mobile
    if (mobileUserArea) {
      mobileUserArea.innerHTML = `
        <a href="perfil.html" class="user-link">
          <span class="user-name"> Olá, ${nome}</span>
          <i class="ph ph-user"></i>
        </a>
      `;
    }

  } else {
    // Usuário não logado

    // Desktop
    if (userArea) userArea.innerHTML = `<a href="login.html" id="loginLink">Login</a>`;

    // Mobile
    if (mobileUserArea) mobileUserArea.innerHTML = `<a href="login.html" id="mobileLoginLink">Login</a>`;

    const redirectToLogin = (e) => {
      e.preventDefault();
      window.location.href = "login.html";
    };

    if (linkServicos) linkServicos.addEventListener("click", redirectToLogin);
    if (linkPublicar) linkPublicar.addEventListener("click", redirectToLogin);
    if (btnServicos) btnServicos.addEventListener("click", redirectToLogin);
    if (btnPublicar) btnPublicar.addEventListener("click", redirectToLogin);
    document.getElementById("mobileLoginLink")?.addEventListener("click", redirectToLogin);
  }
});
