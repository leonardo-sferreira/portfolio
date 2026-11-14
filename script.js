document.getElementById("ano").textContent = new Date().getFullYear();

const preloader = document.getElementById("preloader");

window.addEventListener("load", () => {
  setTimeout(() => {
    preloader.classList.add("hide");
  }, 900);
});

// fallback: caso algo trave o load, remove o preloader depois de 4s
setTimeout(() => preloader.classList.add("hide"), 4000);
