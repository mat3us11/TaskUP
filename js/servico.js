import { db } from "./firebase.js";
import { doc, getDoc, collection, query, where, getDocs, setDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

const auth = getAuth();

const imgMain = document.getElementById("imagem-principal");
const miniaturas = document.getElementById("miniaturas");
const tituloEl = document.getElementById("titulo");
const precoEl = document.getElementById("preco");
const categoriaEl = document.getElementById("categoria");
const descricaoEl = document.getElementById("descricao");
const autorEl = document.getElementById("autor");
const btnChat = document.getElementById("btn-chat");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");

const urlParams = new URLSearchParams(window.location.search);
const servicoId = urlParams.get("id");

let imagens = [];
let currentIndex = 0;
let servicoData = null;

// ---------------------------
// Carrega serviço
// ---------------------------
async function carregarServico() {
  if (!servicoId) return alert("Serviço não encontrado!");

  try {
    const docRef = doc(db, "servicos", servicoId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return alert("Serviço não encontrado!");

    servicoData = docSnap.data();

    tituloEl.textContent = servicoData.titulo;
    precoEl.textContent = `R$ ${servicoData.preco}`;
    categoriaEl.textContent = `Categoria: ${servicoData.categoria}`;
    descricaoEl.textContent = servicoData.descricao;
    autorEl.textContent = `Publicado por: ${servicoData.userName || "Anônimo"}`;

    imagens = servicoData.imagens || [];
    renderSlideshow();
  } catch (err) {
    console.error(err);
    alert("Erro ao carregar serviço.");
  }
}

// ---------------------------
// Slideshow de imagens
// ---------------------------
function renderSlideshow() {
  if (!imagens.length) {
    imgMain.innerHTML = "<p>Sem imagens</p>";
    return;
  }
  miniaturas.innerHTML = "";
  imagens.forEach((url, index) => {
    const thumb = document.createElement("img");
    thumb.src = url;
    thumb.classList.toggle("active", index === 0);
    thumb.addEventListener("click", () => showImage(index));
    miniaturas.appendChild(thumb);
  });
  showImage(0);
}

function showImage(index) {
  currentIndex = index;
  imgMain.innerHTML = `<img src="${imagens[index]}" alt="Imagem">`;
  miniaturas.querySelectorAll("img").forEach((img, i) => {
    img.classList.toggle("active", i === index);
  });
}

prevBtn.addEventListener("click", () => showImage((currentIndex - 1 + imagens.length) % imagens.length));
nextBtn.addEventListener("click", () => showImage((currentIndex + 1) % imagens.length));

// ---------------------------
// Chat automático
// ---------------------------
async function iniciarOuAbrirChat(outroId, outroNome) {
  const user = auth.currentUser;
  if (!user) {
    alert("Você precisa estar logado para iniciar um chat.");
    return;
  }

  const chatsRef = collection(db, "chats");

  // Verifica se já existe chat entre os dois
  const q = query(chatsRef, where("participantesIds", "array-contains", user.uid));
  const snapshot = await getDocs(q);

  let chatId = null;

  snapshot.forEach(docSnap => {
    const chat = docSnap.data();
    if (chat.participantesIds.includes(outroId)) {
      chatId = docSnap.id;
    }
  });

  // Se não existir, cria um novo chat
  if (!chatId) {
    const novoChatRef = doc(chatsRef); // ID gerado automaticamente
    await setDoc(novoChatRef, {
      participantesIds: [user.uid, outroId],
      participantesInfo: [
        { uid: user.uid, nome: user.displayName || "Você" },
        { uid: outroId, nome: outroNome }
      ],
      lastMessage: "",
      lastTimestamp: null
    });
    chatId = novoChatRef.id;
  }

  // Redireciona para o chat
  window.location.href = `chat.html?chatId=${chatId}&contratado=${encodeURIComponent(outroNome)}&contratadoId=${outroId}`;
}

// Botão de chat
btnChat.addEventListener("click", async () => {
  const contratadoId = servicoData.userId;
  const contratadoNome = servicoData.userName || "Anônimo";

  await iniciarOuAbrirChat(contratadoId, contratadoNome);
});

// ---------------------------
// Inicialização
// ---------------------------
carregarServico();
