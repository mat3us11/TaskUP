import { db } from "./firebase.js";
import { doc, getDoc, collection, query, where, getDocs, setDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
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
const contatosEl = document.getElementById("contatos");

const urlParams = new URLSearchParams(window.location.search);
const servicoId = urlParams.get("id");

const categoriasMap = {
  programacao: "Programação",
  design: "Design",
  edicao: "Edição",
  musica: "Música",
  reforco: "Aulas e Reforço Escolar",
  fotografia: "Fotografia e Vídeo",
  artesanato: "Artesanato e Personalizados",
  tecnlogia: "Tecnologia e Suporte Técnico"
};

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
    categoriaEl.textContent = `Categoria: ${categoriasMap[servicoData.categoria] || servicoData.categoria}`;
    descricaoEl.textContent = servicoData.descricao;
    autorEl.textContent = `Publicado por: ${servicoData.userName || "Anônimo"}`;

    if (servicoData.whatsapp) {
      contatosEl.innerHTML += `
        <p>
          <a href="https://wa.me/55${servicoData.whatsapp}" target="_blank">
            <i class="fab fa-whatsapp" style="color:#25D366;"></i>
          </a>
        </p>`;
    }

    if (servicoData.instagram) {
      contatosEl.innerHTML += `
        <p>
          <a href="https://www.instagram.com/${servicoData.instagram}" target="_blank">
            <i class="fab fa-instagram" style="color:#E4405F;"></i>
          </a>
        </p>`;
    }

    if (servicoData.facebook) {
      contatosEl.innerHTML += `
        <p>
          <a href="https://www.facebook.com/${servicoData.facebook}" target="_blank">
            <i class="fab fa-facebook" style="color:#1877F2;"></i>
          </a>
        </p>`;
    }

    imagens = servicoData.imagens || [];
    renderSlideshow();

    carregarUltimasAvaliacoes();
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
    imgMain.innerHTML = '<img src="img/semImagem.jpg">';
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

  const q = query(chatsRef, where("participantesIds", "array-contains", user.uid));
  const snapshot = await getDocs(q);

  let chatId = null;

  snapshot.forEach(docSnap => {
    const chat = docSnap.data();
    if (chat.participantesIds.includes(outroId)) {
      chatId = docSnap.id;
    }
  });

  if (!chatId) {
    const novoChatRef = doc(chatsRef);
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

  window.location.href = `chat.html?chatId=${chatId}&contratado=${encodeURIComponent(outroNome)}&contratadoId=${outroId}`;
}

btnChat.addEventListener("click", async () => {
  const contratadoId = servicoData.userId;
  const contratadoNome = servicoData.userName || "Anônimo";
  await iniciarOuAbrirChat(contratadoId, contratadoNome);
});

// ---------------------------
// Avaliação (estrelas + comentário)
// ---------------------------
const stars = document.querySelectorAll("#starRating span");
let currentRating = 0;

stars.forEach(star => {
  star.addEventListener("mouseover", () => {
    resetHover();
    highlightHover(star.dataset.value);
  });

  star.addEventListener("mouseout", () => {
    resetHover();
  });

  star.addEventListener("click", () => {
    currentRating = star.dataset.value;
    resetActive();
    highlightActive(currentRating);
  });
});

function highlightHover(rating) {
  stars.forEach(star => {
    if (star.dataset.value <= rating) star.classList.add("hover");
  });
}

function resetHover() {
  stars.forEach(star => star.classList.remove("hover"));
}

function highlightActive(rating) {
  stars.forEach(star => {
    if (star.dataset.value <= rating) star.classList.add("active");
  });
}

function resetActive() {
  stars.forEach(star => star.classList.remove("active"));
}

const sendBtn = document.querySelector(".comentario i");
const comentario = document.querySelector(".comentario textarea");

sendBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Você precisa estar logado para avaliar!");

  if (!currentRating) return alert("Escolha uma quantidade de estrelas!");
  if (comentario.value.trim() === "") return alert("Digite um comentário antes de enviar!");

  try {
    await addDoc(collection(db, "servicos", servicoId, "avaliacoes"), {
      userId: user.uid,
      userName: user.displayName || "Anônimo",
      rating: Number(currentRating),
      comentario: comentario.value.trim(),
      timestamp: serverTimestamp()
    });

    alert("Avaliação enviada com sucesso!");
    comentario.value = "";
    currentRating = 0;
    resetActive();
    carregarUltimasAvaliacoes();
  } catch (err) {
    console.error("Erro ao salvar avaliação:", err);
    alert("Erro ao enviar avaliação.");
  }
});

// ---------------------------
// Mostrar últimas 3 avaliações
// ---------------------------
async function carregarUltimasAvaliacoes() {
  const avaliacoesContainer = document.getElementById("ultimasAvaliacoes");
  avaliacoesContainer.innerHTML = "<p>Carregando avaliações...</p>";

  const q = query(collection(db, "servicos", servicoId, "avaliacoes"));
  const snap = await getDocs(q);

  if (snap.empty) {
    avaliacoesContainer.innerHTML = "<p>Sem avaliações ainda.</p>";
    return;
  }

  let avaliacoes = [];
  snap.forEach(doc => avaliacoes.push(doc.data()));

  avaliacoes.sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds);

  avaliacoesContainer.innerHTML = "";
  avaliacoes.slice(0, 3).forEach(av => {
    const div = document.createElement("div");
    div.classList.add("avaliacao");
    div.innerHTML = `
      <p><strong>${av.userName}</strong> - ${av.rating} ★</p>
      <p>${av.comentario}</p>
    `;
    avaliacoesContainer.appendChild(div);
  });
}

// ---------------------------
// Inicialização
// ---------------------------
carregarServico();
