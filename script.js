/* Abrir sempre no início: sem isso o navegador devolve a pessoa ao ponto onde parou
   (por exemplo, em Serviços) ao recarregar ou reabrir a aba. Links com âncora (#projetos) continuam valendo. */
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
if (!location.hash) window.scrollTo(0, 0);
window.addEventListener("pageshow", () => {
  if (!location.hash) window.scrollTo(0, 0);
});

document.getElementById("ano").textContent = new Date().getFullYear();

/* ---------- BARRA DE PROGRESSO ---------- */
const scrollProgress = document.getElementById("scrollProgress");
if (scrollProgress) {
  const updateProgress = () => {
    const h = document.documentElement;
    const scrolled = h.scrollTop;
    const total = h.scrollHeight - h.clientHeight;
    scrollProgress.style.width = (total > 0 ? (scrolled / total) * 100 : 0) + "%";
  };
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
  updateProgress();
}

/* ---------- GLITCH NO HOVER (menu e logo) ---------- */
const GLITCH_CHARS = "!<>-_\\/[]{}—=+*^?#01";
function attachGlitch(el) {
  const original = el.textContent;
  let frame = null;
  el.addEventListener("mouseenter", () => {
    if (frame) cancelAnimationFrame(frame);
    let iteration = 0;
    const totalSteps = 10;
    function step() {
      el.textContent = original
        .split("")
        .map((ch, i) => {
          if (ch === " ") return " ";
          const revealAt = (i / original.length) * totalSteps;
          if (iteration >= revealAt) return original[i];
          return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        })
        .join("");
      iteration += 1;
      if (iteration <= totalSteps) {
        frame = requestAnimationFrame(() => setTimeout(step, 28));
      } else {
        el.textContent = original;
      }
    }
    step();
  });
}
document.querySelectorAll(".navbar nav a, .logo").forEach(attachGlitch);

/* ---------- ÍCONES: DESENHO (SVG DRAW-IN) ---------- */
function prepareDraw(svg) {
  const shapes = svg.querySelectorAll("path, line, polyline, circle, ellipse, rect");
  shapes.forEach((shape) => {
    if (typeof shape.getTotalLength !== "function") return;
    let len;
    try {
      len = shape.getTotalLength();
    } catch (e) {
      return;
    }
    shape.style.strokeDasharray = `${len}`;
    shape.style.strokeDashoffset = `${len}`;
    shape.style.transition = "stroke-dashoffset 0.9s ease";
  });
}
function playDraw(svg) {
  svg.querySelectorAll("path, line, polyline, circle, ellipse, rect").forEach((shape) => {
    shape.style.strokeDashoffset = "0";
  });
}
function resetDraw(svg) {
  svg.querySelectorAll("path, line, polyline, circle, ellipse, rect").forEach((shape) => {
    const len = shape.style.strokeDasharray;
    if (len) shape.style.strokeDashoffset = len;
  });
}
document.querySelectorAll(".stage-icon, .diagram-icon, .diagram-arrow").forEach(prepareDraw);


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

/* ---------- TEXTO: REVELO POR PALAVRA ---------- */
const splitEls = document.querySelectorAll(".split-text");
splitEls.forEach((el) => {
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words
    .map((w, i) => `<span class="word"><span class="word-inner" style="--wi:${i * 0.05}s">${w}</span></span>`)
    .join(" ");
});

const splitObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        splitObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.4 }
);
splitEls.forEach((el) => splitObserver.observe(el));

/* ---------- NÚMEROS: CONTADOR ---------- */
const counterEls = document.querySelectorAll(".stat-number[data-count]");
const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = Number(el.dataset.count);
        const suffix = el.dataset.suffix || "";
        const duration = 1200;
        const start = performance.now();
        function tick(now) {
          const p = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(eased * target) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        counterObserver.unobserve(el);
      }
    });
  },
  { threshold: 0.5 }
);
counterEls.forEach((el) => counterObserver.observe(el));

/* ---------- IMAGENS DOS PROJETOS: WIPE AO ENTRAR NA TELA ---------- */
const wipeCards = document.querySelectorAll(".traj-media");
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  wipeCards.forEach((card) => card.querySelector(".device-viewport")?.classList.add("wipe-ready"));
  const wipeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.querySelector(".device-viewport")?.classList.add("wipe-done");
          entry.target.querySelectorAll(".diagram-icon, .diagram-arrow").forEach(playDraw);
          wipeObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.3 }
  );
  wipeCards.forEach((card) => wipeObserver.observe(card));
}

/* ---------- IMAGENS DOS PROJETOS: TILT 3D ---------- */
if (window.matchMedia("(pointer: fine)").matches) {
  document.querySelectorAll(".traj-media").forEach((media) => {
    media.addEventListener("mousemove", (e) => {
      const rect = media.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      media.style.transition = "transform 0.1s ease-out";
      media.style.transform = `perspective(800px) rotateX(${(-y * 10).toFixed(2)}deg) rotateY(${(x * 10).toFixed(2)}deg)`;
    });
    media.addEventListener("mouseleave", () => {
      media.style.transition = "transform 0.5s ease";
      media.style.transform = "";
    });
  });
}

/* ---------- BOTÕES MAGNÉTICOS ---------- */
if (window.matchMedia("(pointer: fine)").matches) {
  document.querySelectorAll(".btn-primary, .btn-secondary").forEach((btn) => {
    btn.addEventListener("mousemove", (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transition = "transform 0.15s ease-out";
      btn.style.transform = `translate(${(x * 0.3).toFixed(1)}px, ${(y * 0.35).toFixed(1)}px)`;
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transition = "transform 0.4s cubic-bezier(.22,1.4,.4,1)";
      btn.style.transform = "";
    });
  });
}

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
      "Projeto finalizado: todas as funcionalidades planejadas foram entregues, testadas no sistema integrado e validadas por mim como PO. O sistema ganhou o nome de Prioriza e tem manual do usuário e documentação técnica publicados.",
    ],
    tech: "Por trás da tela: front-end em Reflex com 33 telas, back-end em Xano com 23 tabelas e 71 endpoints, 127 requisitos especificados no OpenSpec e 486 testes catalogados.",
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
      "Projeto finalizado e publicado: as 40 entregas planejadas foram concluídas, testadas e arquivadas. O app está no ar, com contas de demonstração para os quatro perfis, manual do usuário e documentação técnica.",
    ],
    tech: "Por trás da tela: 55 telas em Streamlit, backend no Xano com 80 tabelas e 316 endpoints, arquivos no Supabase e 52 verificações automatizadas no CI a cada Pull Request.",
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

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SLIDE_MS = 320;
  const SLIDE_EASE = "cubic-bezier(.22,1,.36,1)";
  let sliding = false;

  function updateDots() {
    galDots.querySelectorAll("span").forEach((dot, i) => dot.classList.toggle("active", i === galIndex));
  }

  function renderGallery() {
    if (!galImages.length) {
      modalGallery.style.display = "none";
      return;
    }
    modalGallery.style.display = "flex";
    modalImg.style.transition = "none";
    modalImg.style.transform = "";
    modalImg.style.opacity = "";
    modalImg.src = galImages[galIndex].src;
    modalImg.alt = galImages[galIndex].alt;
    galDots.innerHTML = "";
    galImages.forEach((_, i) => {
      const dot = document.createElement("span");
      dot.addEventListener("click", () => goTo(i, i > galIndex ? 1 : -1));
      galDots.appendChild(dot);
    });
    updateDots();
    galImages.forEach((img) => { new Image().src = img.src; }); // pré-carrega para a troca não piscar
    const showNav = galImages.length > 1;
    document.getElementById("galPrev").style.display = showNav ? "block" : "none";
    document.getElementById("galNext").style.display = showNav ? "block" : "none";
  }

  /* troca de foto deslizando: a atual sai para um lado e a próxima entra pelo outro */
  function goTo(index, dir) {
    const next = (index + galImages.length) % galImages.length;
    if (sliding || next === galIndex || galImages.length < 2) return;
    galIndex = next;
    updateDots();

    if (reduceMotion) {
      modalImg.src = galImages[galIndex].src;
      modalImg.alt = galImages[galIndex].alt;
      modalImg.style.transform = "";
      return;
    }

    sliding = true;
    const width = modalGallery.offsetWidth;
    modalImg.style.transition = `transform ${SLIDE_MS * 0.7}ms ease-in, opacity ${SLIDE_MS * 0.7}ms ease-in`;
    modalImg.style.transform = `translateX(${-dir * width * 0.35}px)`;
    modalImg.style.opacity = "0";

    setTimeout(() => {
      modalImg.style.transition = "none";
      modalImg.src = galImages[galIndex].src;
      modalImg.alt = galImages[galIndex].alt;
      modalImg.style.transform = `translateX(${dir * width * 0.35}px)`;
      void modalImg.offsetWidth;
      modalImg.style.transition = `transform ${SLIDE_MS}ms ${SLIDE_EASE}, opacity ${SLIDE_MS}ms ease`;
      modalImg.style.transform = "translateX(0)";
      modalImg.style.opacity = "1";
      setTimeout(() => { sliding = false; }, SLIDE_MS);
    }, SLIDE_MS * 0.7);
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
    if (!modalOverlay.classList.contains("open")) return;
    if (e.key === "Escape") closeModal();
    else if (e.key === "ArrowLeft") goTo(galIndex - 1, -1);
    else if (e.key === "ArrowRight") goTo(galIndex + 1, 1);
  });
  document.getElementById("galPrev").addEventListener("click", () => goTo(galIndex - 1, -1));
  document.getElementById("galNext").addEventListener("click", () => goTo(galIndex + 1, 1));

  /* arrastar/deslizar a galeria: a foto acompanha o ponteiro e, ao soltar, troca ou volta */
  const DRAG_THRESHOLD = 60;
  let dragStartX = null;
  let dragDelta = 0;

  function endDrag(commit) {
    if (dragStartX === null) return;
    modalGallery.classList.remove("dragging");
    const delta = dragDelta;
    dragStartX = null;
    dragDelta = 0;

    if (commit && Math.abs(delta) > DRAG_THRESHOLD) {
      goTo(galIndex + (delta < 0 ? 1 : -1), delta < 0 ? 1 : -1);
    } else {
      modalImg.style.transition = `transform ${SLIDE_MS}ms ${SLIDE_EASE}, opacity ${SLIDE_MS}ms ease`;
      modalImg.style.transform = "translateX(0)";
      modalImg.style.opacity = "1";
    }
  }

  modalGallery.addEventListener("pointerdown", (e) => {
    // setas e bolinhas têm o próprio clique; capturar o ponteiro aqui roubaria esse clique
    if (galImages.length < 2 || sliding || e.target.closest(".modal-nav, .modal-dots")) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragStartX = e.clientX;
    dragDelta = 0;
    modalGallery.setPointerCapture(e.pointerId);
    modalGallery.classList.add("dragging");
    modalImg.style.transition = "none";
  });
  modalGallery.addEventListener("pointermove", (e) => {
    if (dragStartX === null) return;
    dragDelta = e.clientX - dragStartX;
    const width = modalGallery.offsetWidth || 1;
    modalImg.style.transform = `translateX(${dragDelta}px)`;
    modalImg.style.opacity = String(1 - Math.min(0.5, Math.abs(dragDelta) / width));
  });
  modalGallery.addEventListener("pointerup", () => endDrag(true));
  modalGallery.addEventListener("pointercancel", () => endDrag(false));
}

/* ---------- SERVIÇOS: SCROLL PINADO ---------- */
const scrolly = document.getElementById("scrolly");

if (scrolly) {
  const STAGE_COLORS = ["#2dd4bf", "#4f8ff0", "#f2c14e", "#22d3ee"];
  const STAGES = 4;
  const RING_CIRC = 464.96;

  const sticky = document.getElementById("stickyBox");
  const ringFill = document.getElementById("ringFill");
  const copies = scrolly.querySelectorAll(".stage-copy");
  const icons = scrolly.querySelectorAll(".stage-icon");
  const dots = scrolly.querySelectorAll(".rail-dot");

  function updateScrolly() {
    const rect = scrolly.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const scrolled = Math.min(Math.max(-rect.top, 0), total);
    const progress = total > 0 ? scrolled / total : 0;
    const stage = Math.min(STAGES - 1, Math.floor(progress * STAGES));

    sticky.style.setProperty("--stage-color", STAGE_COLORS[stage]);
    ringFill.style.strokeDashoffset = String(RING_CIRC * (1 - progress));

    copies.forEach((c) => c.classList.toggle("active", Number(c.dataset.stage) === stage));
    icons.forEach((i) => {
      const isActive = Number(i.dataset.stage) === stage;
      i.classList.toggle("active", isActive);
      if (isActive) playDraw(i);
      else resetDraw(i);
    });
    dots.forEach((d) => d.classList.toggle("active", Number(d.dataset.stage) === stage));
  }

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateScrolly();
        ticking = false;
      });
      ticking = true;
    }
  });
  updateScrolly();
}
