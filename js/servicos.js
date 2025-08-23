import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, collection, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

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
const db = getFirestore(app);

const listaServicos = document.getElementById("lista-servicos");
const inputPesquisa = document.getElementById("pesquisa");
const selectCategoria = document.getElementById("categoria");
const btnFiltrar = document.getElementById("btn-filtrar");

let servicos = [];

async function carregarServicos() {
  listaServicos.innerHTML = "<p>Carregando serviços...</p>";
  try {
    const q = query(collection(db, "servicos"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    servicos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderizarServicos(servicos);

  } catch (err) {
    console.error(err);
    listaServicos.innerHTML = "<p>Erro ao carregar os serviços.</p>";
  }
}

function renderizarServicos(arrayServicos) {
  listaServicos.innerHTML = "";
  if (arrayServicos.length === 0) {
    listaServicos.innerHTML = "<p>Nenhum serviço encontrado.</p>";
    return;
  }

  arrayServicos.forEach(s => {
    const card = document.createElement("div");
    card.classList.add("servico-card");

    card.innerHTML = `
      <img src="${s.imagens && s.imagens[0] ? s.imagens[0] : 'https://via.placeholder.com/300x180?text=Sem+Imagem'}" alt="Imagem">
      <h3>${s.titulo}</h3>
      <p class="preco">R$ ${s.preco}</p>
      <p><strong>Categoria:</strong> ${s.categoria}</p>
      <p><strong>Autor:</strong> ${s.userName || "Anônimo"}</p>
      <button onclick="verDetalhes('${s.id}')">Ver Detalhes</button>
    `;
    listaServicos.appendChild(card);
  });
}

btnFiltrar.addEventListener("click", () => {
  const texto = inputPesquisa.value.toLowerCase();
  const categoria = selectCategoria.value;

  const filtrados = servicos.filter(s => {
    const tituloMatch = s.titulo.toLowerCase().includes(texto);
    const categoriaMatch = categoria ? s.categoria === categoria : true;
    return tituloMatch && categoriaMatch;
  });

  renderizarServicos(filtrados);
});

window.verDetalhes = function(id) {
  window.location.href = `servico.html?id=${id}`;
}

carregarServicos();
