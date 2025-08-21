document.addEventListener("DOMContentLoaded", () => {
  // Funzione per capire se il dispositivo ha tastiera
  function hasKeyboard() {
    // Mobile e tablet di solito non hanno tastiera fisica
    // Usiamo l'userAgent come base
    return !/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  if (!hasKeyboard()) {
    createTouchControls();
  }

  function createTouchControls() {
    // Contenitore dei controlli
    const controlsContainer = document.createElement("div");
    controlsContainer.style.position = "fixed";
    controlsContainer.style.bottom = "20px";
    controlsContainer.style.left = "0";
    controlsContainer.style.width = "100%";
    controlsContainer.style.height = "150px";
    controlsContainer.style.pointerEvents = "none"; // non blocca la canvas
    controlsContainer.style.zIndex = "9999"; // sopra tutto
    document.body.appendChild(controlsContainer);

    // Funzione per creare un bottone
    function createButton(label, side, onPressKey) {
      const btn = document.createElement("div");
      btn.innerText = label;
      btn.style.position = "absolute";
      btn.style.bottom = "30px";
      btn.style.width = "60px";
      btn.style.height = "60px";
      btn.style.borderRadius = "50%";
      btn.style.background = "rgba(0,0,0,0.5)";
      btn.style.color = "white";
      btn.style.display = "flex";
      btn.style.alignItems = "center";
      btn.style.justifyContent = "center";
      btn.style.fontSize = "30px";
      btn.style.userSelect = "none";
      btn.style.pointerEvents = "auto"; // attivo al tocco

      if (side === "left") {
        btn.style.left = "30px";
      } else if (side === "right") {
        btn.style.right = "30px";
      } else if (side === "center") {
        btn.style.left = "50%";
        btn.style.transform = "translateX(-50%)";
      }

      const style = document.createElement("style");
      style.textContent = `
        .touch-button-active {
          background: rgba(255, 255, 255, 0.8) !important;
          color: black !important;
          transform: scale(1.1);
          transition: transform 0.1s;
        }
      `;
      document.head.appendChild(style);

      // Gestione evento pressione (simula keydown / keyup)
      btn.addEventListener("touchstart", (e) => {
      e.preventDefault();
        btn.classList.add("touch-button-active");
        sendKey(onPressKey, "keydown");  // mantiene isDown = true
      });

      btn.addEventListener("touchend", (e) => {
        e.preventDefault();
        btn.classList.remove("touch-button-active");
        sendKey(onPressKey, "keyup");    // qui diventa false
      });

      btn.addEventListener("touchcancel", (e) => {
        btn.classList.remove("touch-button-active");
        sendKey(onPressKey, "keyup");
      });

      controlsContainer.appendChild(btn);
      return btn;
    }

    // Funzione per simulare tasti
    function sendKey(key, type) {
      if (!window.cursors) return; // cursors deve essere globale

      let isDown = (type === "keydown");
      let isUp = !isDown;

      switch (key) {
        case "ArrowLeft":
          window.cursors.left.isDown = isDown;
          window.cursors.left.isUp = isUp;
          break;
        case "ArrowRight":
          window.cursors.right.isDown = isDown;
          window.cursors.right.isUp = isUp;
          break;
        case "ArrowUp":
        case " ":
          window.cursors.up.isDown = isDown;
          window.cursors.up.isUp = isUp;
          break;
      }
    }

    // Creo i tre pulsanti
    createButton("→", "right", "ArrowRight");
    createButton("←", "right", "ArrowLeft").style.right = "110px"; // un po’ più a sinistra
    createButton("⭡", "left", "ArrowUp"); // salto con freccia su
  }
});
