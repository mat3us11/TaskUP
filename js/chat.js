import { db } from "./firebase.js";
import { 
  collection, addDoc, doc, setDoc, updateDoc, query, orderBy, onSnapshot, getDoc 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

const auth = getAuth();

const urlParams = new URLSearchParams(window.location.search);
const chatId = urlParams.get("chatId");
const contratadoNome = urlParams.get("contratado");
const contratadoId = urlParams.get("contratadoId");
const anuncioId = urlParams.get("anuncioId"); // Passar ID do anúncio

document.getElementById("chat-com").textContent = `Chat com ${contratadoNome}`;

const mensagensEl = document.getElementById("mensagens");
const msgInput = document.getElementById("msgInput");
const btnEnviar = document.getElementById("btnEnviar");

const chatDocRef = doc(db, "chats", chatId);
const mensagensRef = collection(db, "chats", chatId, "mensagens");

// ---------------------------
// Carregar informações do anúncio + foto do contratado
// ---------------------------
async function carregarAnuncio() {
  let fotoUrl = "img/perfilPadrao.jpg";

  if (contratadoId) {
    const userDoc = await getDoc(doc(db, "usuarios", contratadoId));
    if (userDoc.exists() && userDoc.data().photoURL) {
      fotoUrl = userDoc.data().photoURL;
    }
  }

  document.getElementById("anuncio-img").src = fotoUrl;

  // Se quiser carregar título/preço do anúncio
  if (anuncioId) {
    const anuncioDoc = await getDoc(doc(db, "anuncios", anuncioId));
    if (anuncioDoc.exists()) {
      const data = anuncioDoc.data();
      document.getElementById("anuncio-titulo").textContent = data.titulo || "";
      document.getElementById("anuncio-preco").textContent = data.preco ? `R$ ${data.preco}` : "";
    }
  }
}

// ---------------------------
// Cria chat se não existir
// ---------------------------
async function criarChatSeNaoExistir() {
  const user = auth.currentUser;
  if (!user) return;

  await setDoc(chatDocRef, {
    participantesIds: [user.uid, contratadoId],
    participantesInfo: [
      { uid: user.uid, nome: user.displayName || "Você" },
      { uid: contratadoId, nome: contratadoNome }
    ],
    lastMessage: "",
    lastTimestamp: null
  }, { merge: true });
}

// ---------------------------
// Escuta mensagens
// ---------------------------
function escutarMensagens() {
  const q = query(mensagensRef, orderBy("timestamp", "asc"));
  onSnapshot(q, (snapshot) => {
    mensagensEl.innerHTML = "";
    snapshot.forEach((doc) => {
      const msg = doc.data();
      const div = document.createElement("div");
      div.classList.add("mensagem");
      div.classList.add(msg.userId === auth.currentUser?.uid ? "enviada" : "recebida");
      div.textContent = msg.texto;
      mensagensEl.appendChild(div);
    });
    mensagensEl.scrollTop = mensagensEl.scrollHeight;
  });
}

// ---------------------------
// Enviar mensagem
// ---------------------------
async function enviarMensagem() {
  const user = auth.currentUser;
  if (!user) return;

  const texto = msgInput.value.trim();
  if (!texto) return;

  try {
    await addDoc(mensagensRef, {
      userId: user.uid,
      texto,
      timestamp: new Date()
    });

    await updateDoc(chatDocRef, {
      lastMessage: texto,
      lastTimestamp: new Date()
    });

    msgInput.value = "";
  } catch (err) {
    console.error("Erro ao enviar mensagem:", err);
    alert("Não foi possível enviar a mensagem.");
  }
}

msgInput.addEventListener("keypress", e => { if (e.key === "Enter") enviarMensagem(); });
btnEnviar.addEventListener("click", enviarMensagem);

// ---------------------------
// Inicialização
// ---------------------------
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    alert("Você precisa estar logado para acessar o chat.");
    return;
  }

  await criarChatSeNaoExistir();
  escutarMensagens();
  carregarAnuncio();
});
