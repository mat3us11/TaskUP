import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// ===== Elementos do header =====
const userArea = document.getElementById("user-area");
const mobileUserArea = document.getElementById("mobileUserArea");
const linkChat = document.getElementById("link-chat");
const linkServicos = document.getElementById("link-servicos");
const linkPublicar = document.getElementById("link-publicar");
const btnServicos = document.getElementById("btn-servicos");
const btnPublicar = document.getElementById("btn-publicar");

// Menu mobile
const hamburger = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobileMenu");
const closeBtn = document.getElementById("closeMenuBtn");
const overlay = document.getElementById("menuOverlay");

if (hamburger && mobileMenu && closeBtn && overlay) {
  hamburger.addEventListener("click", () => {
    mobileMenu.classList.add("active");
    overlay.classList.add("active");
    hamburger.classList.add("hidden");
  });

  closeBtn.addEventListener("click", () => {
    mobileMenu.classList.remove("active");
    overlay.classList.remove("active");
    hamburger.classList.remove("hidden");
  });

  overlay.addEventListener("click", () => {
    mobileMenu.classList.remove("active");
    overlay.classList.remove("active");
    hamburger.classList.remove("hidden");
  });
}

// ===== Notificacoes globais de chat =====
const LAST_READ_PREFIX = "chat:lastRead:";
const chatLinkSelector = 'a[href$="painel-chat.html"], a[href$="painel-chat.html#"]';
const chatLinkBadges = new Map();
let unsubscribeChats = null;
let currentUserId = null;
let unreadMessageMap = new Map();
let latestChatDocs = new Map();
let hamburgerBadge = null;

const toastManager = createToastManager();
injectNotificationStyles();
prepareChatLinks();
updateHamburgerBadge(0, "0");

window.addEventListener("chat:lastReadUpdated", (event) => {
  if (!event.detail?.chatId) return;
  handleLocalReadUpdate(event.detail.chatId);
});

window.addEventListener("storage", (event) => {
  if (!event.key || !event.key.startsWith(LAST_READ_PREFIX)) return;
  const chatId = event.key.slice(LAST_READ_PREFIX.length);
  handleLocalReadUpdate(chatId);
});

function prepareChatLinks() {
  document.querySelectorAll(chatLinkSelector).forEach((link) => {
    if (chatLinkBadges.has(link)) return;
    link.classList.add("nav-chat-link");

    const badge = document.createElement("span");
    badge.className = "chat-count-badge";
    badge.setAttribute("aria-hidden", "true");
    link.appendChild(badge);

    chatLinkBadges.set(link, badge);
  });
}

function updateChatBadges(unreadCount) {
  prepareChatLinks();
  const text = unreadCount > 9 ? "9+" : String(unreadCount);

  chatLinkBadges.forEach((badge) => {
    if (unreadCount > 0) {
      badge.textContent = text;
      badge.classList.add("is-visible");
    } else {
      badge.textContent = "";
      badge.classList.remove("is-visible");
    }
  });

  updateHamburgerBadge(unreadCount, text);
}

function ensureHamburgerBadge() {
  if (!hamburger) return null;
  if (hamburgerBadge && hamburger.contains(hamburgerBadge)) return hamburgerBadge;

  const badge = document.createElement("span");
  badge.className = "chat-mobile-badge";
  badge.setAttribute("aria-hidden", "true");
  hamburger.appendChild(badge);
  hamburgerBadge = badge;
  return badge;
}

function updateHamburgerBadge(unreadCount, text) {
  if (!hamburger) return;
  const badge = ensureHamburgerBadge();
  if (!badge) return;

  if (unreadCount > 0) {
    badge.textContent = text;
    badge.classList.add("is-visible");
  } else {
    badge.textContent = "";
    badge.classList.remove("is-visible");
  }
}

function getUnreadTotal() {
  let total = 0;
  unreadMessageMap.forEach((value) => {
    total += Number.isFinite(value) ? value : 0;
  });
  return total;
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

function obterUltimoLido(chatId) {
  if (!chatId) return null;
  try {
    const valor = localStorage.getItem(`${LAST_READ_PREFIX}${chatId}`);
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : null;
  } catch (err) {
    console.warn("Nao foi possivel ler o ultimo timestamp de leitura:", err);
    return null;
  }
}

function buildChatUrl(chatId, nome, contratadoId) {
  const params = new URLSearchParams({ chatId, contratado: nome || "Contato" });
  if (contratadoId) params.set("contratadoId", contratadoId);
  return `chat.html?${params.toString()}`;
}

function handleLocalReadUpdate(chatId) {
  if (!chatId) return;
  const chat = latestChatDocs.get(chatId);
  if (!chat) {
    unreadMessageMap.set(chatId, 0);
    updateChatBadges(getUnreadTotal());
    return;
  }

  const lastMillis = timestampToMillis(chat.lastTimestamp);
  const ultimoLido = obterUltimoLido(chatId);
  const lastSenderId = chat.lastSenderId;
  const fromOther = !lastSenderId || lastSenderId !== currentUserId;

  if (!fromOther || !lastMillis || (ultimoLido && lastMillis <= ultimoLido)) {
    unreadMessageMap.set(chatId, 0);
    updateChatBadges(getUnreadTotal());
  }
}

function subscribeToChatNotifications(user) {
  if (unsubscribeChats) {
    unsubscribeChats();
    unsubscribeChats = null;
  }

  unreadMessageMap = new Map();
  latestChatDocs = new Map();

  if (!user) {
    updateChatBadges(0);
    toastManager.clear();
    return;
  }

  const userId = user.uid;
  const chatsRef = collection(db, "chats");
  const q = query(chatsRef, where("participantesIds", "array-contains", userId));
  let isInitialSnapshot = true;

  unsubscribeChats = onSnapshot(q, (snapshot) => {
    snapshot.forEach((docSnap) => {
      const chat = docSnap.data();
      latestChatDocs.set(docSnap.id, chat);

      if (!unreadMessageMap.has(docSnap.id)) {
        unreadMessageMap.set(docSnap.id, 0);
      }

      if (isInitialSnapshot) {
        const lastMillis = timestampToMillis(chat.lastTimestamp);
        const ultimoLido = obterUltimoLido(docSnap.id);
        const lastSenderId = chat.lastSenderId;
        const fromOther = !lastSenderId || lastSenderId !== userId;

        if (lastMillis && fromOther && (!ultimoLido || lastMillis > ultimoLido)) {
          unreadMessageMap.set(docSnap.id, Math.max(unreadMessageMap.get(docSnap.id) || 0, 1));
        }
      }
    });

    if (!isInitialSnapshot) {
      const currentChatId = new URLSearchParams(window.location.search).get("chatId");
      const isOnChatPage = window.location.pathname.endsWith("/chat.html") || window.location.pathname.endsWith("chat.html");

      snapshot.docChanges().forEach((change) => {
        const chatId = change.doc.id;

        if (change.type === "removed") {
          unreadMessageMap.delete(chatId);
          latestChatDocs.delete(chatId);
          return;
        }

        if (change.type !== "added" && change.type !== "modified") return;

        const chat = change.doc.data();
        latestChatDocs.set(chatId, chat);

        const lastMillis = timestampToMillis(chat.lastTimestamp);
        const ultimoLido = obterUltimoLido(chatId);
        const lastSenderId = chat.lastSenderId;
        const fromOther = !lastSenderId || lastSenderId !== userId;

        if (!fromOther) {
          unreadMessageMap.set(chatId, 0);
          return;
        }
        if (!lastMillis || (ultimoLido && lastMillis <= ultimoLido)) {
          unreadMessageMap.set(chatId, 0);
          return;
        }

        const previous = unreadMessageMap.get(chatId) || 0;
        unreadMessageMap.set(chatId, previous + 1);

        if (isOnChatPage && currentChatId && currentChatId === chatId) {
          return;
        }

        const outro = Array.isArray(chat.participantesInfo)
          ? chat.participantesInfo.find((p) => p.uid && p.uid !== userId)
          : null;
        const outroNome = outro?.nome || "Contato";
        const outroId = outro?.uid;
        const texto = chat.lastMessage || "Nova mensagem";

        toastManager.enqueue({ chatId, outroNome, outroId, texto });
      });
    }

    updateChatBadges(getUnreadTotal());
    isInitialSnapshot = false;
  }, (error) => {
    console.error("Falha ao observar chats:", error);
  });
}

function injectNotificationStyles() {
  const styleId = "chat-notification-styles";
  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    .nav-chat-link {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .mobile-menu a.nav-chat-link {
      display: flex;
      width: 100%;
      justify-content: space-between;
      align-items: center;
    }

    .hamburger {
      position: relative;
    }

    .chat-mobile-badge {
      display: none;
      position: absolute;
      top: -6px;
      right: -6px;
      min-width: 18px;
      height: 18px;
      padding: 2px 5px;
      border-radius: 999px;
      background: #25d366;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      line-height: 1;
      align-items: center;
      justify-content: center;
    }

    .chat-mobile-badge.is-visible {
      display: inline-flex;
    }

    .chat-count-badge {
      display: none;
      min-width: 20px;
      padding: 2px 6px;
      border-radius: 999px;
      background: #25d366;
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      line-height: 1;
    }

    .chat-count-badge.is-visible {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .global-chat-toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      max-width: 320px;
      padding: 16px 18px;
      background: #202c33;
      color: #fff;
      box-shadow: 0 14px 40px rgba(0, 0, 0, 0.25);
      border-radius: 16px;
      opacity: 0;
      transform: translateY(20px);
      pointer-events: none;
      transition: opacity 0.25s ease, transform 0.25s ease;
      z-index: 2000;
      cursor: pointer;
    }

    .global-chat-toast.visible {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    .global-chat-toast strong {
      display: block;
      font-size: 15px;
      margin-bottom: 6px;
    }

    .global-chat-toast p {
      margin: 0;
      font-size: 14px;
      line-height: 1.4;
      color: #f5f5f5;
      word-break: break-word;
    }

    @media (max-width: 600px) {
      .global-chat-toast {
        left: 16px;
        right: 16px;
        bottom: 18px;
      }
    }
  `;

  document.head.appendChild(style);
}

function createToastManager() {
  let element = null;
  let currentTimeout = null;
  const queue = [];
  let isVisible = false;

  function ensureElement() {
    if (element) return element;

    element = document.createElement("div");
    element.className = "global-chat-toast";
    element.setAttribute("role", "alert");
    element.setAttribute("aria-live", "assertive");
    element.innerHTML = `
      <strong></strong>
      <p></p>
    `;

    element.addEventListener("click", () => {
      if (!element?.dataset?.targetUrl) return;
      window.location.href = element.dataset.targetUrl;
    });

    document.body.appendChild(element);
    return element;
  }

  function hide() {
    const el = ensureElement();
    el.classList.remove("visible");
    isVisible = false;
    clearTimeout(currentTimeout);
    currentTimeout = null;

    if (queue.length > 0) {
      const next = queue.shift();
      show(next);
    }
  }

  function show(data) {
    const el = ensureElement();
    const strongEl = el.querySelector("strong");
    const pEl = el.querySelector("p");

    strongEl.textContent = `Nova mensagem de ${data.outroNome}`;
    const texto = data.texto || "Nova mensagem";
    pEl.textContent = texto.length > 120 ? `${texto.slice(0, 117)}...` : texto;

    el.dataset.targetUrl = buildChatUrl(data.chatId, data.outroNome, data.outroId);

    el.classList.add("visible");
    isVisible = true;

    clearTimeout(currentTimeout);
    currentTimeout = setTimeout(() => hide(), 6000);
  }

  return {
    enqueue(data) {
      if (isVisible) {
        queue.push(data);
      } else {
        show(data);
      }
    },
    clear() {
      queue.length = 0;
      if (!element) return;
      element.classList.remove("visible");
      isVisible = false;
      clearTimeout(currentTimeout);
      currentTimeout = null;
    }
  };
}

// ===== Login / Logout =====
onAuthStateChanged(auth, (user) => {
  if (unsubscribeChats) {
    unsubscribeChats();
    unsubscribeChats = null;
  }

  currentUserId = user?.uid || null;

  if (user) {
    const nome = user.displayName || "Usuario";

    if (userArea) {
      userArea.innerHTML = `
        <a href="perfil.html" class="user-link">
          <span class="user-name"> Ola, ${nome}</span>
          <i class="ph ph-user"></i>
        </a>
      `;
    }

    if (mobileUserArea) {
      mobileUserArea.innerHTML = `
        <a href="perfil.html" class="user-link">
          <span class="user-name"> Ola, ${nome}</span>
          <i class="ph ph-user"></i>
        </a>
      `;
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn && !logoutBtn.dataset.boundLogout) {
      logoutBtn.dataset.boundLogout = "true";
      logoutBtn.addEventListener("click", async (event) => {
        event.preventDefault();
        await signOut(auth);
        window.location.href = "login.html";
      });
    }

    subscribeToChatNotifications(user);
  } else {
    unreadMessageMap = new Map();
    latestChatDocs = new Map();
    toastManager.clear();
    updateChatBadges(0);

    if (userArea) userArea.innerHTML = `<a href="login.html" id="loginLink">Login</a>`;
    if (mobileUserArea) mobileUserArea.innerHTML = `<a href="login.html" id="mobileLoginLink">Login</a>`;

    const redirectToLogin = (event) => {
      event.preventDefault();
      window.location.href = "login.html";
    };

    [linkChat, linkServicos, linkPublicar].forEach((link) => {
      link?.addEventListener("click", redirectToLogin);
    });
    [btnServicos, btnPublicar].forEach((btn) => {
      btn?.addEventListener("click", redirectToLogin);
    });
    document.getElementById("mobileLoginLink")?.addEventListener("click", redirectToLogin);
  }
});






