document.getElementById("ano").textContent = new Date().getFullYear();

/* ---------- LINKEDIN: placeholder ainda não preenchido ---------- */
const linkedinLink = document.getElementById("linkedinLink");
if (linkedinLink) {
  linkedinLink.addEventListener("click", (e) => {
    if (linkedinLink.getAttribute("href") === "#") e.preventDefault();
  });
}

/* ---------- PRE-LOADER: CONSTELAÇÃO ---------- */
const preloader = document.getElementById("preloader");
const preloaderCanvas = document.getElementById("preloaderCanvas");
const loaderPct = document.getElementById("loaderPct");

function dismissPreloader() {
  preloader.classList.add("hide");
  setTimeout(() => preloader.remove(), 700);
}

if (preloaderCanvas && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const pctx = preloaderCanvas.getContext("2d");
  let pw = 0, ph = 0, pdpr = Math.min(window.devicePixelRatio || 1, 2);

  function presize() {
    pw = window.innerWidth;
    ph = window.innerHeight;
    preloaderCanvas.width = pw * pdpr;
    preloaderCanvas.height = ph * pdpr;
    preloaderCanvas.style.width = pw + "px";
    preloaderCanvas.style.height = ph + "px";
    pctx.setTransform(pdpr, 0, 0, pdpr, 0, 0);
  }
  presize();
  window.addEventListener("resize", presize);

  const pParticles = Array.from({ length: 90 }, () => ({
    x: Math.random() * pw,
    y: Math.random() * ph,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    r: Math.random() * 1.4 + 0.6,
    c: Math.random() < 0.5 ? "45,212,191" : "79,143,240",
  }));

  const PLINK = 150;
  const startTime = performance.now();
  const DURATION_MS = 1700;
  let dismissed = false;

  function drawPreloader() {
    pctx.clearRect(0, 0, pw, ph);
    for (const p of pParticles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > pw) p.vx *= -1;
      if (p.y < 0 || p.y > ph) p.vy *= -1;
      pctx.beginPath();
      pctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      pctx.fillStyle = `rgba(${p.c},0.85)`;
      pctx.fill();
    }
    for (let i = 0; i < pParticles.length; i++) {
      for (let j = i + 1; j < pParticles.length; j++) {
        const a = pParticles[i], b = pParticles[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < PLINK) {
          pctx.beginPath();
          pctx.moveTo(a.x, a.y);
          pctx.lineTo(b.x, b.y);
          pctx.strokeStyle = `rgba(45,212,191,${0.16 * (1 - d / PLINK)})`;
          pctx.lineWidth = 1;
          pctx.stroke();
        }
      }
    }

    const elapsed = performance.now() - startTime;
    const pct = Math.min(100, Math.round((elapsed / DURATION_MS) * 100));
    loaderPct.textContent = pct + "%";

    if (!dismissed) requestAnimationFrame(drawPreloader);
  }
  requestAnimationFrame(drawPreloader);

  window.addEventListener("load", () => {
    const remaining = Math.max(0, DURATION_MS - (performance.now() - startTime));
    setTimeout(() => {
      dismissed = true;
      dismissPreloader();
    }, remaining);
  });
} else {
  window.addEventListener("load", () => setTimeout(dismissPreloader, 300));
}

setTimeout(dismissPreloader, 4500);

/* ---------- SCROLL REVEAL ---------- */
const revealEls = document.querySelectorAll(".reveal");
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);
revealEls.forEach((el) => revealObserver.observe(el));

/* ---------- HERO: PAPEL GIRATÓRIO ---------- */
const roleTextEl = document.getElementById("roleText");

if (roleTextEl) {
  const roles = ["Web", "Mobile", "Automações", "Banco de Dados"];
  let roleIndex = 0;

  setInterval(() => {
    roleTextEl.classList.add("swap");
    setTimeout(() => {
      roleIndex = (roleIndex + 1) % roles.length;
      roleTextEl.textContent = roles[roleIndex];
      roleTextEl.classList.remove("swap");
    }, 250);
  }, 2400);
}

/* ---------- HERO: REDE DE PARTÍCULAS ---------- */
const heroCanvas = document.getElementById("heroCanvas");

if (heroCanvas && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const ctx = heroCanvas.getContext("2d");
  const heroSection = heroCanvas.closest(".hero");
  let particles = [];
  let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);

  const COLORS = ["45,212,191", "79,143,240"];
  const LINK_DIST = 140;
  const MOUSE_DIST = 160;

  const mouse = { x: null, y: null };

  function countFor(width, height) {
    const area = width * height;
    return Math.min(110, Math.max(40, Math.round(area / 16000)));
  }

  function resize() {
    w = heroSection.offsetWidth;
    h = heroSection.offsetHeight;
    heroCanvas.width = w * dpr;
    heroCanvas.height = h * dpr;
    heroCanvas.style.width = w + "px";
    heroCanvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const target = countFor(w, h);
    if (particles.length === 0) {
      particles = Array.from({ length: target }, () => spawn());
    } else if (particles.length < target) {
      particles.push(...Array.from({ length: target - particles.length }, () => spawn()));
    } else {
      particles.length = target;
    }
  }

  function spawn() {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.4 + 0.6,
      c: COLORS[Math.random() < 0.5 ? 0 : 1],
    };
  }

  function step() {
    ctx.clearRect(0, 0, w, h);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;

      if (mouse.x !== null) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const d = Math.hypot(dx, dy);
        if (d < MOUSE_DIST) {
          const force = (MOUSE_DIST - d) / MOUSE_DIST * 0.03;
          p.vx += (dx / d) * force;
          p.vy += (dy / d) * force;
        }
      }
      p.vx *= 0.995;
      p.vy *= 0.995;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.c},0.8)`;
      ctx.fill();
    }

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d < LINK_DIST) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(45,212,191,${0.14 * (1 - d / LINK_DIST)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(step);
  }

  heroSection.addEventListener("mousemove", (e) => {
    const rect = heroSection.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  heroSection.addEventListener("mouseleave", () => {
    mouse.x = null;
    mouse.y = null;
  });

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(step);
}

/* ---------- TRAJETÓRIA: SCROLL-SPY ---------- */
const trajCases = document.querySelectorAll(".traj-case");
const trajPathItems = document.querySelectorAll(".path-item");

if (trajCases.length && trajPathItems.length) {
  const trajObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          trajPathItems.forEach((item) => {
            item.classList.toggle("active", item.dataset.target === id);
          });
        }
      });
    },
    { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
  );
  trajCases.forEach((el) => trajObserver.observe(el));
}

/* ---------- MODAL: CASE COMPLETO ---------- */
const PROJECTS = {
  "proj-01": {
    category: "Engenharia de Software · Saúde",
    title: "Fila Prioritária — Pronto-Socorro",
    role: "Como Product Owner do time, defini as regras de priorização clínica, desenhei o protótipo das telas e modelei o banco de dados — depois acompanhei a equipe de back-end e front-end na implementação.",
    desc: [
      "O desafio era substituir a fila por ordem de chegada de um pronto-socorro por uma fila que prioriza de verdade quem está pior — sem perder transparência para quem está esperando.",
      "O sistema cuida da triagem (sintomas e sinais vitais viram uma classificação de risco), direciona cada ficha para a especialidade certa e mostra as chamadas num painel público que nunca expõe nome ou CPF.",
    ],
    tech: "Por trás da tela: front-end em Reflex, back-end em Xano com 19 tabelas já publicadas, e a primeira fatia (cadastro de pacientes e ficha de atendimento) já em produção.",
    images: [
      { src: "assets/projetos/ps-fila-totem.png", alt: "Totem de autoatendimento do pronto-socorro" },
      { src: "assets/projetos/ps-fila-painel.png", alt: "Painel público de chamadas" },
      { src: "assets/projetos/ps-fila-admin.png", alt: "Tela do administrador — fila e equipe" },
    ],
    tags: ["Reflex", "Xano", "OpenSpec"],
    link: { href: "https://github.com/leonardo-sferreira/ps-fila-prioritaria", text: "Ver repositório →" },
  },
  "proj-02": {
    category: "Engenharia de Software · RH",
    title: "ConectaRH",
    role: "Participei do desenho das regras de negócio e do modelo de dados, além de construir boa parte das telas em Streamlit e a integração com o backend em Xano.",
    desc: [
      "O ConectaRH nasceu pra tirar RH, gestores e colaboradores das planilhas e do e-mail — um lugar só para ponto, férias, documentos e desligamento, onde cada perfil vê só o que pode ver.",
      "Toda decisão importante (aprovar férias, corrigir ponto, mudar um dado cadastral) fica registrada: quem fez, quando e por quê.",
    ],
    tech: "Por trás da tela: backend com 59 tabelas e 228 endpoints no Xano, frontend com 22 telas em Streamlit, e 909 verificações automatizadas rodando a cada Pull Request.",
    images: [
      { src: "assets/projetos/conectarh-inicio.png", alt: "Tela inicial do ConectaRH" },
      { src: "assets/projetos/conectarh-perfil.png", alt: "Tela de perfil do colaborador" },
      { src: "assets/projetos/conectarh-ponto.png", alt: "Tela de ponto eletrônico" },
    ],
    tags: ["Streamlit", "Xano", "Supabase"],
    link: { href: "https://github.com/leonardo-sferreira/conectahr", text: "Ver repositório →" },
  },
  "proj-03": {
    category: "UX/UI · Prototipação",
    title: "Sabor Local",
    role: "Fiz o design de ponta a ponta no Figma — fluxos, telas e protótipo navegável — pensando numa experiência de delivery tão fluida quanto a de apps grandes como o iFood.",
    desc: [
      "O Sabor Local é um protótipo de app de delivery de comida mineira, pensado pra ter a mesma fluidez de apps grandes como o iFood — do cardápio ao acompanhamento do pedido no mapa.",
      "Desenhei o fluxo inteiro: login, cardápio por categoria com sugestão do chef, carrinho, pagamento, endereço e avaliação da entrega.",
    ],
    tech: "Por trás da tela: protótipo navegável completo no Figma, organizado por fluxo (acesso, cardápio, pagamento, endereço, pedido e perfil), pronto para virar implementação real.",
    images: [
      { src: "assets/projetos/sabor-local-home.png", alt: "Tela inicial do app com cardápio" },
      { src: "assets/projetos/sabor-local-carrinho.png", alt: "Tela de carrinho de compras" },
      { src: "assets/projetos/sabor-local-pagamento.png", alt: "Tela de pagamento" },
    ],
    tags: ["Figma", "FlutterFlow", "UX/UI"],
    link: { href: "https://www.figma.com/design/iRn8igu0iCwyqYTathrz9P/Sabor-local?node-id=0-1", text: "Ver protótipo →" },
  },
  "proj-04": {
    category: "Automação · Uso pessoal",
    title: "Bot de Finanças",
    role: "Projetei e implementei sozinho, do fluxo de conversa no Telegram até a integração com a API do Notion.",
    desc: [
      "Criei esse bot pra resolver um problema bem pessoal: parar de esquecer de anotar gasto. Ele entende uma mensagem curta, tipo '45,90 almoço', e já guarda tudo organizado.",
      "Também avisa sozinho quando uma fatura ou parcela tá perto de vencer, pergunta no fim do dia se eu lancei meus gastos, manda um resumo da semana e fecha o mês sozinho.",
    ],
    tech: "Por trás da tela: bot em Python integrado à API do Telegram e à API do Notion. Repositório privado, sem prints públicos por enquanto.",
    images: [],
    tags: ["Python", "Telegram Bot API", "Notion API"],
    link: null,
  },
};

const modalOverlay = document.getElementById("modalOverlay");
const modalImg = document.getElementById("modalImg");
const modalGallery = document.getElementById("modalGallery");
const galDots = document.getElementById("galDots");
const modalCategory = document.getElementById("modalCategory");
const modalTitle = document.getElementById("modalTitle");
const modalRole = document.getElementById("modalRole");
const modalDesc = document.getElementById("modalDesc");
const modalTags = document.getElementById("modalTags");
const modalLink = document.getElementById("modalLink");

if (modalOverlay) {
  let galImages = [];
  let galIndex = 0;
  let lastFocused = null;
  const modalEl = document.querySelector(".modal");

  function renderGallery() {
    if (!galImages.length) {
      modalGallery.style.display = "none";
      return;
    }
    modalGallery.style.display = "flex";
    modalImg.src = galImages[galIndex].src;
    modalImg.alt = galImages[galIndex].alt;
    galDots.innerHTML = "";
    galImages.forEach((_, i) => {
      const dot = document.createElement("span");
      if (i === galIndex) dot.classList.add("active");
      dot.addEventListener("click", () => { galIndex = i; renderGallery(); });
      galDots.appendChild(dot);
    });
    const showNav = galImages.length > 1;
    document.getElementById("galPrev").style.display = showNav ? "block" : "none";
    document.getElementById("galNext").style.display = showNav ? "block" : "none";
  }

  function openModal(id) {
    const p = PROJECTS[id];
    if (!p) return;
    galImages = p.images;
    galIndex = 0;
    renderGallery();
    modalCategory.textContent = p.category;
    modalTitle.textContent = p.title;
    modalRole.textContent = p.role;
    modalDesc.innerHTML = p.desc.map((para) => `<p>${para}</p>`).join("") +
      (p.tech ? `<p class="tech-note">${p.tech}</p>` : "");
    modalTags.innerHTML = p.tags.map((t) => `<li>${t}</li>`).join("");
    if (p.link) {
      modalLink.style.display = "inline-flex";
      modalLink.href = p.link.href;
      modalLink.textContent = p.link.text;
    } else {
      modalLink.style.display = "none";
    }
    modalOverlay.classList.add("open");
    document.body.style.overflow = "hidden";

    const modalBody = document.querySelector(".modal-body");
    modalBody.classList.remove("anim-in");
    void modalBody.offsetWidth;
    modalBody.classList.add("anim-in");

    lastFocused = document.activeElement;
    requestAnimationFrame(() => document.getElementById("modalClose").focus());
  }

  function closeModal() {
    modalOverlay.classList.remove("open");
    document.body.style.overflow = "";
    if (lastFocused) lastFocused.focus();
  }

  function getFocusable() {
    return Array.from(
      modalEl.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
    ).filter((el) => el.offsetParent !== null);
  }

  modalEl.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const focusable = getFocusable();
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  document.querySelectorAll(".btn-case").forEach((btn) => {
    btn.addEventListener("click", () => openModal(btn.dataset.project));
  });
  document.querySelectorAll(".traj-media[data-project]").forEach((media) => {
    media.addEventListener("click", () => openModal(media.dataset.project));
    media.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openModal(media.dataset.project);
      }
    });
  });
  document.getElementById("modalClose").addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalOverlay.classList.contains("open")) closeModal();
  });
  document.getElementById("galPrev").addEventListener("click", () => {
    galIndex = (galIndex - 1 + galImages.length) % galImages.length;
    renderGallery();
  });
  document.getElementById("galNext").addEventListener("click", () => {
    galIndex = (galIndex + 1) % galImages.length;
    renderGallery();
  });
}

/* ---------- SERVIÇOS SWITCHER ---------- */
const switcher = document.querySelector(".servicos-switcher");

if (switcher) {
  const tabs = Array.from(switcher.querySelectorAll(".tab-item"));
  const panels = Array.from(switcher.querySelectorAll(".tab-panel"));
  const progressFill = document.getElementById("servicosProgress");
  const AUTOPLAY_MS = 5000;
  let currentIndex = 0;
  let autoplayTimer = null;

  function activate(index) {
    currentIndex = index;
    const key = tabs[index].dataset.tab;

    tabs.forEach((t, i) => {
      t.classList.toggle("active", i === index);
      t.setAttribute("aria-selected", i === index ? "true" : "false");
    });
    panels.forEach((p, i) => p.classList.toggle("active", i === index));
    switcher.setAttribute("data-active", key);

    restartProgress();
  }

  function restartProgress() {
    if (!progressFill) return;
    progressFill.classList.remove("animate");
    // força reflow para reiniciar a animação da barra
    void progressFill.offsetWidth;
    progressFill.classList.add("animate");
  }

  function next() {
    activate((currentIndex + 1) % tabs.length);
  }

  function startAutoplay() {
    stopAutoplay();
    autoplayTimer = setInterval(next, AUTOPLAY_MS);
  }

  function stopAutoplay() {
    if (autoplayTimer) clearInterval(autoplayTimer);
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => {
      activate(i);
      startAutoplay();
    });
  });

  // pausa o autoplay quando o mouse está sobre o switcher
  switcher.addEventListener("mouseenter", stopAutoplay);
  switcher.addEventListener("mouseleave", startAutoplay);

  activate(0);
  startAutoplay();
}
