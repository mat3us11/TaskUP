import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

const form = document.querySelector("form");
const msg = document.getElementById("msg");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    msg.textContent = `✅ Bem-vindo, ${user.displayName || user.email}!`;
    console.log("Usuário logado:", user);

    setTimeout(() => {
      window.location.href = "index.html";
    }, 1500);
  } catch (error) {
    msg.textContent = "❌ Erro: " + error.message;
  }
});

const btnSair = document.getElementById("btnSair");
if (btnSair) {
  btnSair.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "login.html";
  });
}
