document.getElementById("ano").textContent = new Date().getFullYear();

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
const trajNavItems = document.querySelectorAll(".trajetoria-list li");

if (trajCases.length && trajNavItems.length) {
  const trajObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          trajNavItems.forEach((li) => {
            li.classList.toggle("active", li.dataset.target === id);
          });
        }
      });
    },
    { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
  );
  trajCases.forEach((el) => trajObserver.observe(el));
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
