import { auth } from "./firebase.js";
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

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

      await updateProfile(user, { displayName: nome });
      msg.textContent = "✅ Usuário cadastrado com sucesso!";
      console.log("Novo usuário:", user);

      setTimeout(() => {
        window.location.href = "index.html";
      }, 1500);
    } catch (error) {
      msg.textContent = "❌ Erro: " + error.message;
      console.error(error);
    }
  });
});
