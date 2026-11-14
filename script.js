document.getElementById("ano").textContent = new Date().getFullYear();

/* ---------- PRE-LOADER ---------- */
const preloader = document.getElementById("preloader");

window.addEventListener("load", () => {
  setTimeout(() => preloader.classList.add("hide"), 700);
});
setTimeout(() => preloader.classList.add("hide"), 4000);

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

/* ---------- CURSOR DOT ---------- */
const cursorDot = document.getElementById("cursorDot");
if (window.matchMedia("(pointer: fine)").matches && cursorDot) {
  window.addEventListener("mousemove", (e) => {
    cursorDot.style.left = e.clientX + "px";
    cursorDot.style.top = e.clientY + "px";
  });
  document.querySelectorAll("a, button").forEach((el) => {
    el.addEventListener("mouseenter", () => {
      cursorDot.style.width = "24px";
      cursorDot.style.height = "24px";
      cursorDot.style.background = "transparent";
      cursorDot.style.border = "1.5px solid var(--accent-light)";
    });
    el.addEventListener("mouseleave", () => {
      cursorDot.style.width = "10px";
      cursorDot.style.height = "10px";
      cursorDot.style.background = "var(--accent-light)";
      cursorDot.style.border = "none";
    });
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
