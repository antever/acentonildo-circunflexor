document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("input");
  const undoLastBtn = document.getElementById("undo-last");
  const copyTextBtn = document.getElementById("copy-text");
  const clearTextBtn = document.getElementById("clear-text");
  const charButtonsContainer = document.getElementById("char-buttons");
  const statusBox = document.getElementById("status-box");
  const ignoreAcute = document.getElementById("ignore-acute");

  const charGroups = {
    "TIL (~)": ["ã", "õ", "Ã", "Õ"],
    "AGUDO (´)": ["á", "é", "í", "ó", "ú", "Á", "É", "Í", "Ó", "Ú"],
    "GRAVE (`)": ["à", "À"],
    "CIRCUNFLEXO (^)": ["â", "ê", "ô", "Â", "Ê", "Ô"],
    "CEDILHA (ç)": ["ç", "Ç"]
  };

  for (const [label, chars] of Object.entries(charGroups)) {
    const groupDiv = document.createElement("div");
    groupDiv.className = "char-group";
    const title = document.createElement("strong");
    title.textContent = label + ": ";
    groupDiv.appendChild(title);

    chars.forEach(char => {
      const btn = document.createElement("button");
      btn.textContent = char;
      btn.onclick = () => {
        input.value += char;
        input.focus();
      };
      groupDiv.appendChild(btn);
    });

    charButtonsContainer.appendChild(groupDiv);
  }

  let lastText = "";
  let confirmTimeout;
  let backspaceCount = 0;
  let lastKeyTime = 0;

  input.addEventListener("keydown", function (e) {
    const now = Date.now();
    if (e.key === "Backspace") {
      if (now - lastKeyTime < 1000) {
        backspaceCount++;
      } else {
        backspaceCount = 1;
      }

      if (backspaceCount === 4) {
        statusBox.textContent = "Quem é que tá fazendo batucada a essa hora? Segure CTRL+SHIFT e aperte setinha para a esquerda para selecionar palavras inteiras.";
        backspaceCount = 0;
      }
    } else {
      backspaceCount = 0;
    }
    lastKeyTime = now;
  });

  input.addEventListener("keyup", function (e) {
    const triggerKeys = [" ", ",", ".", ";", ":", "?", "!", "\"", "'", ")", "]", "Enter"];
    if (triggerKeys.includes(e.key)) {
      lastText = input.value;
      correctLastWordAtCursor();
    }
  });

  undoLastBtn.addEventListener("click", function () {
    if (lastText) {
      input.value = lastText;
      lastText = "";
      statusBox.textContent = "Ai, nossa. Que desfeita.";
    }
  });

  copyTextBtn.addEventListener("click", function () {
    input.select();
    document.execCommand("copy");
    input.setSelectionRange(input.value.length, input.value.length);
    statusBox.textContent = "Texto copiado para a área de transferência.";

    const extraCopyBtn = document.createElement("button");
    extraCopyBtn.textContent = "Copiar";
    extraCopyBtn.disabled = true;
    extraCopyBtn.style.marginLeft = "0.5em";
    copyTextBtn.after(extraCopyBtn);

    setTimeout(() => {
      extraCopyBtn.remove();
    }, 1000);
  });

  clearTextBtn.addEventListener("click", function () {
    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = "Tem certeza???";
    confirmBtn.id = "confirm-clear";
    confirmBtn.className = "confirm-clear";
    confirmBtn.style.marginRight = "0.5em";
    clearTextBtn.replaceWith(confirmBtn);

    confirmTimeout = setTimeout(() => {
      confirmBtn.replaceWith(clearTextBtn);
    }, 5000);

    confirmBtn.addEventListener("click", function () {
      clearTimeout(confirmTimeout);
      input.value = "";
      statusBox.textContent = "Texto apagado.";

      const messageBtn = document.createElement("button");
      messageBtn.textContent = "Então tá! Limpei tudo. Faz sujeira mais não, tá?";
      messageBtn.disabled = true;
      messageBtn.style.marginRight = "0.5em";
      confirmBtn.replaceWith(messageBtn);

      setTimeout(() => {
        messageBtn.replaceWith(clearTextBtn);
      }, 2000);
    });
  });

  function matchCase(original, corrected) {
    if (original === original.toUpperCase()) {
      return corrected.toUpperCase();
    } else if (original[0] === original[0].toUpperCase()) {
      return corrected.charAt(0).toUpperCase() + corrected.slice(1);
    } else {
      return corrected;
    }
  }

  function cleanWord(word) {
    let normalized = word.normalize('NFD').replace(/[^\w]/g, "").toLowerCase();
    if (ignoreAcute.checked) {
      normalized = normalized.replace(/[\u0301]/g, "");
    }
    return normalized;
  }

  function correctText(text) {
    const baseCorrections = ignoreAcute.checked ? correctionsSemAgudos : corrections;
    const words = text.split(/\b/);
    let status = [];
    for (let i = 0; i < words.length; i++) {
      const raw = words[i];
      const clean = cleanWord(raw);
      if (baseCorrections[clean]) {
        const corrected = matchCase(raw, baseCorrections[clean]);
        if (corrected !== raw) status.push(`${raw} > ${corrected}`);
        words[i] = corrected;
      }
    }
    statusBox.textContent = status.join("\n");
    return words.join("");
  }

  function correctLastWordAtCursor() {
    const baseCorrections = ignoreAcute.checked ? correctionsSemAgudos : corrections;
    const pos = input.selectionStart;
    const text = input.value;
    const before = text.slice(0, pos);
    const after = text.slice(pos);

    const match = before.match(/(\b\w+)([.,;:?!'"()\]\s]*)$/);
    if (!match) return;

    const [fullMatch, lastWord, spacing] = match;
    const clean = cleanWord(lastWord);

    if (baseCorrections[clean]) {
      const corrected = matchCase(lastWord, baseCorrections[clean]);
      if (corrected !== lastWord) {
        statusBox.textContent = `${lastWord} > ${corrected}`;
      }
      const correctedText = before.slice(0, -fullMatch.length) + corrected + spacing + after;
      input.value = correctedText;
      const newPos = before.length - fullMatch.length + corrected.length + spacing.length;
      input.setSelectionRange(newPos, newPos);
    }
  }
});
