import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

const auth = getAuth();

const urlParams = new URLSearchParams(window.location.search);
const chatId = urlParams.get("chatId");
const contratadoNome = urlParams.get("contratado");
const contratadoId = urlParams.get("contratadoId");
const anuncioId = urlParams.get("anuncioId");

document.getElementById("chat-com").textContent = `Chat com ${contratadoNome}`;

const mensagensEl = document.getElementById("mensagens");
const msgInput = document.getElementById("msgInput");
const btnEnviar = document.getElementById("btnEnviar");

const chatDocRef = doc(db, "chats", chatId);
const mensagensRef = collection(db, "chats", chatId, "mensagens");
const LAST_READ_KEY = chatId ? `chat:lastRead:${chatId}` : null;
const tituloOriginal = document.title;
let ultimaMensagemTimestamp = null;
let notificacoesPendentes = 0;
let primeiraCargaMensagens = true;
let audioContext;

solicitarPermissaoNotificacoes();

// ---------------------------
// Utilitarios de notificacao
// ---------------------------
function solicitarPermissaoNotificacoes() {
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}

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

function obterUltimoLido() {
  if (!LAST_READ_KEY) return null;
  const valor = localStorage.getItem(LAST_READ_KEY);
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function atualizarUltimoLido(millis) {
  if (!LAST_READ_KEY) return;
  if (!Number.isFinite(millis)) return;
  try {
    localStorage.setItem(LAST_READ_KEY, String(millis));
  } catch (err) {
    console.warn("Nao foi possivel salvar o ultimo timestamp lido:", err);
  }
}

function resetarIndicadoresDeNotificacao() {
  notificacoesPendentes = 0;
  document.title = tituloOriginal;
}

function marcarChatComoLido() {
  if (ultimaMensagemTimestamp == null) return;
  atualizarUltimoLido(ultimaMensagemTimestamp);
  resetarIndicadoresDeNotificacao();

  if (chatId) {
    window.dispatchEvent(new CustomEvent("chat:lastReadUpdated", {
      detail: { chatId, timestamp: ultimaMensagemTimestamp }
    }));
  }
}

function tocarSomNotificacao() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  try {
    if (!audioContext) {
      audioContext = new AudioCtx();
    }

    const duracao = 0.4;
    const agora = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1047, agora);
    gainNode.gain.setValueAtTime(0.0001, agora);
    gainNode.gain.exponentialRampToValueAtTime(0.05, agora + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, agora + duracao);

    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);

    osc.start(agora);
    osc.stop(agora + duracao);
  } catch (err) {
    console.warn("Nao foi possivel reproduzir o som de notificacao:", err);
  }
}

function mostrarNotificacaoDesktop(msg) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  if (!document.hidden) return;

  const texto = (msg?.texto || "").toString();
  const corpo = texto.length > 120 ? `${texto.slice(0, 117)}...` : texto;

  try {
    new Notification(`Nova mensagem de ${contratadoNome || "contato"}`, {
      body: corpo,
      icon: document.getElementById("anuncio-img")?.src || "./img/perfilPadrao.webp",
      tag: chatId
    });
  } catch (err) {
    console.warn("Falha ao exibir a notificacao desktop:", err);
  }
}

function notificarNovaMensagem(msg) {
  tocarSomNotificacao();

  if (document.hidden || !document.hasFocus()) {
    notificacoesPendentes += 1;
    document.title = `(${notificacoesPendentes}) Nova mensagem - taskUP`;
    mostrarNotificacaoDesktop(msg);
  }
}

window.addEventListener("focus", () => {
  marcarChatComoLido();
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    marcarChatComoLido();
  }
});

// ---------------------------
// Carregar informacoes do anuncio + foto do contratado
// ---------------------------
async function carregarAnuncio() {
  let fotoUrl = "./img/perfilPadrao.webp";

  if (contratadoId) {
    const userDoc = await getDoc(doc(db, "usuarios", contratadoId));
    if (userDoc.exists() && userDoc.data().photoURL) {
      fotoUrl = userDoc.data().photoURL;
    }
  }

  document.getElementById("anuncio-img").src = fotoUrl;

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
// Cria chat se nao existir
// ---------------------------
async function criarChatSeNaoExistir() {
  const user = auth.currentUser;
  if (!user) return;

  await setDoc(chatDocRef, {
    participantesIds: [user.uid, contratadoId],
    participantesInfo: [
      { uid: user.uid, nome: user.displayName || "Voce" },
      { uid: contratadoId, nome: contratadoNome }
    ],
    lastMessage: "",
    lastTimestamp: null,
    lastSenderId: null
  }, { merge: true });
}

// ---------------------------
// Escuta mensagens
// ---------------------------
function escutarMensagens() {
  const q = query(mensagensRef, orderBy("timestamp", "asc"));
  onSnapshot(q, (snapshot) => {
    mensagensEl.innerHTML = "";
    const fragment = document.createDocumentFragment();

    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();
      const div = document.createElement("div");
      div.classList.add("mensagem");
      div.classList.add(msg.userId === auth.currentUser?.uid ? "enviada" : "recebida");
      div.textContent = msg.texto;
      fragment.appendChild(div);
    });

    mensagensEl.appendChild(fragment);
    mensagensEl.scrollTop = mensagensEl.scrollHeight;

    const ultimaMensagemDoc = snapshot.docs[snapshot.docs.length - 1];
    if (ultimaMensagemDoc) {
      const timestampMillis = timestampToMillis(ultimaMensagemDoc.data().timestamp) ?? Date.now();
      ultimaMensagemTimestamp = timestampMillis;

      if (!document.hidden && document.hasFocus()) {
        marcarChatComoLido();
      }
    }

    if (!primeiraCargaMensagens) {
      snapshot.docChanges().forEach((change) => {
        if (change.type !== "added") return;
        const novaMensagem = change.doc.data();
        if (novaMensagem.userId === auth.currentUser?.uid) return;

        const mensagemMillis = timestampToMillis(novaMensagem.timestamp);
        const ultimoLido = obterUltimoLido();
        if (ultimoLido && mensagemMillis && mensagemMillis <= ultimoLido) return;

        notificarNovaMensagem(novaMensagem);
      });
    } else {
      primeiraCargaMensagens = false;
    }
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
      lastTimestamp: new Date(),
      lastSenderId: user.uid
    });

    msgInput.value = "";
  } catch (err) {
    console.error("Erro ao enviar mensagem:", err);
    alert("Nao foi possivel enviar a mensagem.");
  }
}

msgInput.addEventListener("keypress", (e) => { if (e.key === "Enter") enviarMensagem(); });
btnEnviar.addEventListener("click", enviarMensagem);

// ---------------------------
// Inicializacao
// ---------------------------
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    alert("Voce precisa estar logado para acessar o chat.");
    return;
  }

  await criarChatSeNaoExistir();
  escutarMensagens();
  carregarAnuncio();
});

