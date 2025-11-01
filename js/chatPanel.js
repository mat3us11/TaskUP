import { db } from "./firebase.js";
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

const auth = getAuth();
const listaChatsEl = document.getElementById("lista-chats");
const LAST_READ_PREFIX = "chat:lastRead:";

function timestampToMillis(timestamp) {
  if (!timestamp) return null;
  if (typeof timestamp === "number") return timestamp;
  if (typeof timestamp.toMillis === "function") {
    try {
      return timestamp.toMillis();
    } catch (err) {
      console.warn("Falha ao converter timestamp via toMillis:", err);
    }
  }
  if (typeof timestamp.seconds === "number") {
    const nanos = typeof timestamp.nanoseconds === "number" ? timestamp.nanoseconds : 0;
    return timestamp.seconds * 1000 + Math.round(nanos / 1e6);
  }
  const data = new Date(timestamp);
  return Number.isNaN(data.getTime()) ? null : data.getTime();
}

function obterUltimoLido(chatId) {
  if (!chatId) return null;
  try {
    const valor = localStorage.getItem(`${LAST_READ_PREFIX}${chatId}`);
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : null;
  } catch (err) {
    console.warn("Não foi possível ler o último timestamp de leitura:", err);
    return null;
  }
}

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    alert("Você precisa estar logado para ver seus chats.");
    return;
  }

  const chatsRef = collection(db, "chats");
  const q = query(
    chatsRef,
    where("participantesIds", "array-contains", user.uid),
    orderBy("lastTimestamp", "desc")
  );

  onSnapshot(q, async (snapshot) => {
    listaChatsEl.innerHTML = "";

    const promises = snapshot.docs.map(async (docSnap) => {
      const chat = docSnap.data();
      const chatId = docSnap.id;

      // Outro participante
      const outro = chat.participantesInfo.find(p => p.uid !== user.uid);
      const outroNome = outro?.nome || "Usuário";
      const outroId = outro?.uid;

      // Foto do outro participante
      let fotoUrl = "./img/perfilPadrao.webp";
      if (outroId) {
        const userDoc = await getDoc(doc(db, "usuarios", outroId));
        if (userDoc.exists() && userDoc.data().photoURL) {
          fotoUrl = userDoc.data().photoURL;
        }
      }

      // Título do serviço
      let tituloServico = "";
      if (chat.servicoId) {
        const servicoDoc = await getDoc(doc(db, "servicos", chat.servicoId));
        if (servicoDoc.exists()) {
          tituloServico = servicoDoc.data().titulo || "";
        }
      }

      // Última mensagem e horário
      const ultimoTexto = chat.lastMessage || "";
      const lastTimestampMillis = timestampToMillis(chat.lastTimestamp);
      const timestamp = lastTimestampMillis
        ? new Date(lastTimestampMillis).toLocaleString()
        : "";
      const ultimoLido = obterUltimoLido(chatId);
      const temNaoLidas = Boolean(
        lastTimestampMillis && (!ultimoLido || lastTimestampMillis > ultimoLido)
      );

      // Monta o chat
      const div = document.createElement("div");
      div.classList.add("chat-item");
      div.innerHTML = `
        <img class="user-photo" src="${fotoUrl}" alt="${outroNome}">
        <div class="chat-info">
          <p class="nome">${outroNome}</p>
          ${tituloServico ? `<p class="servico-titulo">${tituloServico}</p>` : ""}
          <p class="ultima-msg">${ultimoTexto}</p>
          <p class="timestamp">${timestamp}</p>
        </div>
        <button class="btn-excluir">Excluir</button>
      `;

      if (temNaoLidas) {
        div.classList.add("chat-unread");
        const badge = document.createElement("span");
        badge.className = "unread-badge";
        badge.textContent = "Novo";
        const deleteBtn = div.querySelector(".btn-excluir");
        if (deleteBtn) {
          div.insertBefore(badge, deleteBtn);
        } else {
          div.appendChild(badge);
        }
        const ultimaMsgEl = div.querySelector(".ultima-msg");
        if (ultimaMsgEl) {
          ultimaMsgEl.classList.add("ultima-msg-nova");
        }
      }

      // Abrir chat
      div.querySelector(".chat-info").addEventListener("click", () => {
        window.location.href = `chat.html?chatId=${chatId}&contratado=${encodeURIComponent(outroNome)}&contratadoId=${outroId}`;
      });

      // Excluir conversa
      div.querySelector(".btn-excluir").addEventListener("click", async (e) => {
        e.stopPropagation();
        if (confirm("Deseja realmente excluir esta conversa?")) {
          await deleteDoc(doc(db, "chats", chatId));
          alert("Conversa excluída!");
        }
      });

      return div;
    });

    const chatDivs = await Promise.all(promises);
    chatDivs.forEach(div => listaChatsEl.appendChild(div));
  });
});
