import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";

// Configuração do Firebase
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
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const form = document.querySelector("form");
const grid = document.getElementById('image-grid');
const maxImages = 3;

// Verifica se o usuário está logado
onAuthStateChanged(auth, (user) => {
  if (!user) window.location.href = "login.html";
});

// Envia formulário
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const titulo = document.getElementById("titulo").value.trim();
  const descricao = document.getElementById("descricao").value.trim();
  const preco = document.getElementById("preco").value.trim();
  const categoria = document.getElementById("categoria").value;

  if (!titulo || !descricao || !preco || !categoria) {
    alert("Preencha todos os campos!");
    return;
  }

  try {
    const user = auth.currentUser;
    const imageUrls = [];

    const slots = grid.querySelectorAll('.image-slot img');
    for (let i = 0; i < slots.length; i++) {
      const imgElement = slots[i];
      const blob = await fetch(imgElement.src).then(r => r.blob());
      const storageRef = ref(storage, `servicos/${user.uid}/${Date.now()}_${i}.png`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      imageUrls.push(url);
    }

    await addDoc(collection(db, "servicos"), {
      titulo,
      descricao,
      preco,
      categoria,
      imagens: imageUrls,
      userId: user.uid,
      userName: user.displayName || user.email,
      createdAt: serverTimestamp()
    });

    alert("Serviço publicado com sucesso!");
    form.reset();
    grid.innerHTML = '';
    grid.appendChild(createSlot(0));
    window.location.href = "servicos.html";

  } catch (error) {
    console.error(error);
    alert("Erro ao publicar serviço: " + error.message);
  }
});

function createSlot(index) {
  const slot = document.createElement('div');
  slot.classList.add('image-slot', 'add');
  slot.id = `slot-${index}`;

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.id = `upload-${index}`;

  const label = document.createElement('label');
  label.htmlFor = input.id;
  label.innerHTML = '<span>+</span>';

  input.addEventListener('change', () => handleUpload(input, slot));

  slot.appendChild(input);
  slot.appendChild(label);

  return slot;
}

function handleUpload(input, slot) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = () => {
      const imgSlot = document.createElement('div');
      imgSlot.classList.add('image-slot');
      const img = document.createElement('img');
      img.src = reader.result;
      imgSlot.appendChild(img);

      const removeBtn = document.createElement('button');
      removeBtn.innerHTML = '&times;';
      removeBtn.classList.add('remove-btn');
      removeBtn.addEventListener('click', () => {
        imgSlot.remove();
        updateSlots();
      });
      imgSlot.appendChild(removeBtn);

      grid.appendChild(imgSlot);

      if (grid.querySelectorAll('.image-slot.add').length < maxImages) {
        const nextSlot = createSlot(grid.querySelectorAll('.image-slot').length);
        grid.appendChild(nextSlot);
      }

      slot.remove();
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function updateSlots() {
  if (grid.querySelectorAll('.image-slot.add').length === 0 &&
    grid.querySelectorAll('.image-slot').length < maxImages) {
    const nextSlot = createSlot(grid.querySelectorAll('.image-slot').length);
    grid.appendChild(nextSlot);
  }
}

grid.innerHTML = '';
grid.appendChild(createSlot(0));
