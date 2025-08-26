import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

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

// Pega ID do serviço na URL
const urlParams = new URLSearchParams(window.location.search);
const servicoId = urlParams.get("id");

let imagens = [];
let currentIndex = 0;

async function carregarServico() {
  if (!servicoId) return alert("Serviço não encontrado!");

  try {
    const docRef = doc(db, "servicos", servicoId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return alert("Serviço não encontrado!");

    const s = docSnap.data();

    // Preenche elementos da página
    tituloEl.textContent = s.titulo;
    precoEl.textContent = `R$ ${s.preco}`;
    categoriaEl.textContent = `Categoria: ${s.categoria}`;
    descricaoEl.textContent = s.descricao;
    autorEl.textContent = `Publicado por: ${s.userName || "Anônimo"}`;

    imagens = s.imagens || [];
    renderSlideshow();

  } catch (err) {
    console.error(err);
    alert("Erro ao carregar serviço.");
  }
}

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

btnChat.addEventListener("click", () => {
  const user = autorEl.textContent.replace("Publicado por: ", "");
  alert(`Abrir chat com ${user}`);
});


carregarServico();
