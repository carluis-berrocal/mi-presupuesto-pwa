let deferredPrompt = null;

/* =========================
   DETECCIÓN DE ENTORNO
========================= */

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInAppBrowser() {
  return /(FBAN|FBAV|Instagram|Messenger)/i.test(navigator.userAgent);
}

function isAppInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

/* =========================
   EVENTO PWA NATIVO
========================= */

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  if (!isAppInstalled()) {
    document.getElementById("installBtn").classList.add("show");
  }
});

/* =========================
   MOSTRAR BOTÓN AL CARGAR
========================= */

window.addEventListener("load", () => {
  const btn = document.getElementById("installBtn");

  if (isAppInstalled()) {
    btn.classList.remove("show");
    return;
  }

  btn.classList.add("show");
});

/* =========================
   OCULTAR SI SE INSTALA
========================= */

window
  .matchMedia("(display-mode: standalone)")
  .addEventListener("change", (e) => {
    if (e.matches) {
      document.getElementById("installBtn").classList.remove("show");
    }
  });

/* =========================
   CLICK BOTÓN INSTALAR
========================= */

document.getElementById("installBtn").addEventListener("click", async () => {
  // ✅ Android / PC compatibles
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      document.getElementById("installBtn").classList.remove("show");
    }

    deferredPrompt = null;
    return;
  }

  // 🍏 iPhone
  if (isIOS()) {
    showAlert(
      "En iPhone toca el botón Compartir y luego 'Añadir a pantalla de inicio'",
      "warning",
    );
    return;
  }

  // 🌐 Navegadores internos
  if (isInAppBrowser()) {
    showAlert(
      "Abre esta página en Chrome para poder instalar la app",
      "warning",
    );
    return;
  }

  // 💻 Otros navegadores
  showAlert(
    "Usa el menú del navegador para 'Instalar aplicación' o 'Añadir a inicio'",
    "warning",
  );
});
