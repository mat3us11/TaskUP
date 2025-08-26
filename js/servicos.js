import { db } from "./firebase.js"; 
import { getDocs, collection, query, orderBy } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

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
      <img src="${s.imagens?.[0] || 'https://via.placeholder.com/300x180?text=Sem+Imagem'}" alt="Imagem">
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
