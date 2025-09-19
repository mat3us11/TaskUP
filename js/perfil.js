import { auth, db, storage } from "./firebase.js";
import { 
  onAuthStateChanged, 
  updateProfile 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { 
  doc, getDoc, setDoc, collection, getDocs, query, where, deleteDoc, updateDoc 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { 
  ref, uploadBytes, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";

const nomeUsuario = document.getElementById("nomeUsuario");
const emailUsuario = document.getElementById("emailUsuario");
const cursoUsuario = document.getElementById("cursoUsuario");
const fotoPerfil = document.getElementById("fotoPerfil");
const btnEditarFoto = document.getElementById("editarFoto");
const uploadFoto = document.getElementById("uploadFoto");
const btnEditarPerfil = document.getElementById("editarPerfil");
const modalPerfil = document.getElementById("modalEditar");
const spanClosePerfil = modalPerfil.querySelector(".close");
const nomeInput = document.getElementById("nomeInput");
const cursoInput = document.getElementById("cursoInput");
const fotoInputModal = document.getElementById("fotoInput");
const btnSalvarPerfil = document.getElementById("salvarPerfil");

const meusServicos = document.getElementById("meusServicos");
const modalServico = document.getElementById("modalServico");
const btnCloseServico = modalServico.querySelector(".close");
const tituloInput = document.getElementById("tituloServicoInput");
const descricaoInput = document.getElementById("descricaoServicoInput");
const precoInput = document.getElementById("precoServicoInput");
const categoriaInput = document.getElementById("categoriaServicoInput");
const imagensInput = document.getElementById("imagensServicoInput");
const btnSalvarServico = document.getElementById("salvarServico");

const avaliacoesEl = document.getElementById("avaliacoes");
const mediaAvaliacoesEl = document.getElementById("mediaAvaliacoes");

let servicoAtualId = null;
let imagensAtual = [];

// ====================== AUTENTICAÇÃO ======================
onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location.href = "login.html";

  emailUsuario.textContent = user.email;
  nomeUsuario.textContent = user.displayName || "Sem nome definido";
  fotoPerfil.src = user.photoURL || "img/perfilPadrao.webp";

  // Garante que o documento do usuário exista no Firestore
  const userRef = doc(db, "usuarios", user.uid);
  const userDoc = await getDoc(userRef);
  if (!userDoc.exists()) {
    await setDoc(userRef, { curso: "", photoURL: user.photoURL || "img/perfil.jpg" }, { merge: true });
  }
  cursoUsuario.textContent = userDoc.exists() ? userDoc.data().curso || "Não informado" : "";

  await carregarServicos(user.uid);
  await carregarAvaliacoes(user.uid);
});

// ====================== SERVIÇOS ======================
async function carregarServicos(userId) {
  const q = query(collection(db, "servicos"), where("userId", "==", userId));
  const snapshot = await getDocs(q);

  meusServicos.innerHTML = "";
  if (snapshot.empty) meusServicos.innerHTML = "<p>Você não publicou nenhum serviço ainda.</p>";

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const card = document.createElement("div");
    card.classList.add("servico-card");
    card.innerHTML = `
      <img src="${data.imagens?.[0] || 'img/semImagem.jpg'}" alt="Serviço">
      <h4>${data.titulo}</h4>
      <p>${data.descricao}</p>
      <p><strong>R$ ${data.preco}</strong></p>
      <button class="btn-editar" data-id="${docSnap.id}">Editar</button>
      <button class="btn-excluir" data-id="${docSnap.id}">Excluir</button>
    `;
    meusServicos.appendChild(card);
  });

  document.querySelectorAll(".btn-editar").forEach(btn => {
    btn.addEventListener("click", async () => {
      servicoAtualId = btn.dataset.id;
      const docRef = doc(db, "servicos", servicoAtualId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return alert("Serviço não encontrado!");

      const data = docSnap.data();
      tituloInput.value = data.titulo;
      descricaoInput.value = data.descricao;
      precoInput.value = data.preco;
      categoriaInput.value = data.categoria;
      imagensAtual = data.imagens || [];

      modalServico.style.display = "block";
    });
  });

  document.querySelectorAll(".btn-excluir").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      await deleteDoc(doc(db, "servicos", id));
      alert("Serviço excluído!");
      window.location.reload();
    });
  });
}

// ====================== AVALIAÇÕES ======================
async function carregarAvaliacoes(userId) {
  avaliacoesEl.innerHTML = "<p>Carregando avaliações...</p>";
  let avaliacoes = [];

  // busca todos os serviços do usuário
  const servicosSnap = await getDocs(query(collection(db, "servicos"), where("userId", "==", userId)));
  
  for (const servicoDoc of servicosSnap.docs) {
    const avaliacoesSnap = await getDocs(collection(db, "servicos", servicoDoc.id, "avaliacoes"));
    avaliacoesSnap.forEach(a => {
      avaliacoes.push(a.data());
    });
  }

  if (avaliacoes.length === 0) {
    avaliacoesEl.innerHTML = "<p>Sem avaliações ainda.</p>";
    mediaAvaliacoesEl.textContent = "⭐ Sem avaliações";
    return;
  }

  // calcula média
  let media = avaliacoes.reduce((acc, a) => acc + a.rating, 0) / avaliacoes.length;
  mediaAvaliacoesEl.textContent = `⭐ ${media.toFixed(1)} (${avaliacoes.length} avaliações)`;

  avaliacoesEl.innerHTML = "";
  avaliacoes.forEach(av => {
    const div = document.createElement("div");
    div.classList.add("avaliacao-card");
    div.innerHTML = `
      <p><strong>${av.userName}</strong> avaliou com ${av.rating} ★</p>
      <p>${av.comentario}</p>
      <small>${av.timestamp?.toDate ? av.timestamp.toDate().toLocaleString() : ""}</small>
    `;
    avaliacoesEl.appendChild(div);
  });
}

// ====================== FOTO PERFIL ======================
btnEditarFoto.addEventListener("click", () => uploadFoto.click());
uploadFoto.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const user = auth.currentUser;
  const storageRef = ref(storage, `usuarios/${user.uid}/perfil.jpg`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  await updateProfile(user, { photoURL: url });
  await setDoc(doc(db, "usuarios", user.uid), { photoURL: url }, { merge: true });
  fotoPerfil.src = url;
  alert("Foto atualizada!");
});

// ====================== EDITAR PERFIL ======================
btnEditarPerfil.onclick = async () => {
  const user = auth.currentUser;
  nomeInput.value = user.displayName || "";
  const userDoc = await getDoc(doc(db, "usuarios", user.uid));
  cursoInput.value = userDoc.exists() ? userDoc.data().curso || "" : "";
  modalPerfil.style.display = "block";
};

spanClosePerfil.onclick = () => modalPerfil.style.display = "none";
window.onclick = (e) => { 
  if (e.target == modalPerfil) modalPerfil.style.display = "none"; 
  if (e.target == modalServico) modalServico.style.display = "none"; 
};

// salvar perfil
btnSalvarPerfil.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  const novoNome = nomeInput.value.trim();
  const novoCurso = cursoInput.value.trim();

  let novoFotoURL = user.photoURL;
  if (fotoInputModal.files.length > 0) {
    const file = fotoInputModal.files[0];
    const storageRef = ref(storage, `usuarios/${user.uid}/perfil.jpg`);
    await uploadBytes(storageRef, file);
    novoFotoURL = await getDownloadURL(storageRef);
  }

  await updateProfile(user, { displayName: novoNome, photoURL: novoFotoURL });
  await setDoc(doc(db, "usuarios", user.uid), {
    curso: novoCurso,
    photoURL: novoFotoURL 
  }, { merge: true });

  nomeUsuario.textContent = novoNome;
  cursoUsuario.textContent = novoCurso;
  fotoPerfil.src = novoFotoURL;

  alert("Perfil atualizado com sucesso!");
  modalPerfil.style.display = "none";
});

// ====================== MODAL SERVIÇOS ======================
btnCloseServico.onclick = () => modalServico.style.display = "none";

// salvar serviço editado
btnSalvarServico.addEventListener("click", async () => {
  if (!servicoAtualId) return;

  const novoTitulo = tituloInput.value.trim();
  const novaDescricao = descricaoInput.value.trim();
  const novoPreco = precoInput.value.trim();
  const novaCategoria = categoriaInput.value.trim();

  if (imagensInput.files.length > 0) {
    imagensAtual = [];
    const user = auth.currentUser;
    for (let i = 0; i < imagensInput.files.length; i++) {
      const file = imagensInput.files[i];
      const storageRef = ref(storage, `servicos/${user.uid}/${servicoAtualId}_${Date.now()}_${i}.jpg`);
      await uploadBytes(storageRef, file);
      imagensAtual.push(await getDownloadURL(storageRef));
    }
  }

  const servicoRef = doc(db, "servicos", servicoAtualId);

  const updateData = {
    titulo: novoTitulo,
    descricao: novaDescricao,
    preco: novoPreco,
    categoria: novaCategoria,
    imagens: imagensAtual,
  };

  await updateDoc(servicoRef, updateData);
  alert("Serviço atualizado com sucesso!");
  modalServico.style.display = "none";
  window.location.reload();
});
