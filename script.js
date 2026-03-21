const lines = document.getElementById("lines");
const code = document.getElementById("code");
const divider = document.querySelector(".middle-edit-view");
const editorViewer = document.querySelector(".code-editor-viewer");
const codeInput = document.querySelector(".code-input");
const codeOutput = document.querySelector(".code-output");
const addFileBtn = document.getElementById("addFileBtn");
const fileDropdown = document.getElementById("fileDropdown");
const fileContainer = document.querySelector(".files");
const addFileMenu = document.querySelector(".add-file-menu");
const autocomplete = document.getElementById("autocomplete");
const highlighting = document.getElementById("highlighting");

const storageKey = "code-editor-files";
const cppAutocompleteTrie =
  typeof cppKeywordTrie !== "undefined" ? cppKeywordTrie : null;
const cppPrimitiveTypeSet = new Set(
  typeof cppPrimitiveTypes !== "undefined" ? cppPrimitiveTypes : [],
);

const updateLines = () => {
  if (!lines || !code) {
    return;
  }

  const count = code.value.split("\n").length;
  let numbers = "";

  for (let i = 1; i <= count; i++) {
    numbers += `${i}<br>`;
  }

  lines.innerHTML = numbers;
};

const highlightLine = () => {
  if (!code) {
    return;
  }

  const start = code.selectionStart;
  const text = code.value.substring(0, start);
  const line = text.split("\n").length;

  const styles = window.getComputedStyle(code);
  const lineHeight = parseFloat(styles.lineHeight);
  const paddingTop = parseFloat(styles.paddingTop);
  const offset = paddingTop + (line - 1) * lineHeight;

  code.style.background = `linear-gradient(
    to bottom,
    transparent ${offset}px,
    rgba(0, 0, 255, 0.12) ${offset}px,
    rgba(0, 0, 255, 0.12) ${offset + lineHeight}px,
    transparent ${offset + lineHeight}px
  )`;
};

const renderCodeView = (fileName = "") => {
  if (!highlighting || !code) {
    return;
  }

  if (fileName.endsWith(".cpp") && typeof highlightCppCode === "function") {
    highlighting.innerHTML = highlightCppCode(code.value);
  } else if (typeof escapeHtml === "function") {
    highlighting.innerHTML = escapeHtml(code.value) || " ";
  } else {
    highlighting.textContent = code.value || " ";
  }
};

if (lines && code) {
  code.addEventListener("scroll", () => {
    lines.scrollTop = code.scrollTop;

    if (highlighting) {
      highlighting.scrollTop = code.scrollTop;
      highlighting.scrollLeft = code.scrollLeft;
    }
  });

  code.addEventListener("click", highlightLine);
  code.addEventListener("keyup", highlightLine);
}

if (fileContainer && addFileMenu && code) {
  let files = [];
  let activeFileId = null;
  let activeSuggestions = [];
  let selectedSuggestionIndex = 0;
  let currentSymbolTrie = null;
  let currentSymbols = new Map();

  const createFileId = () =>
    `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const saveFiles = () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        files,
        activeFileId,
      }),
    );
  };

  const getStoredState = () => {
    try {
      const rawState = localStorage.getItem(storageKey);

      if (!rawState) {
        return null;
      }

      return JSON.parse(rawState);
    } catch (error) {
      console.error("Unable to parse saved editor state.", error);
      return null;
    }
  };

  const getDomFiles = () =>
    Array.from(fileContainer.querySelectorAll(".file-btn")).map((button) => ({
      id: createFileId(),
      name: button.textContent.trim(),
      content: "",
    }));

  const getActiveFile = () => files.find((file) => file.id === activeFileId);

  const isCppFileActive = () => getActiveFile()?.name.endsWith(".cpp");

  const escapeHtml = (value) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

  const getCurrentWord = () => {
    const beforeCursor = code.value.slice(0, code.selectionStart);
    const match = beforeCursor.match(/[A-Za-z_][A-Za-z0-9_]*$/);
    return match ? match[0] : "";
  };

  const addSymbol = (symbols, name, kind) => {
    if (!name || cppWords.includes(name)) {
      return;
    }

    if (!symbols.has(name)) {
      symbols.set(name, kind);
    }
  };

  const extractCppSymbols = (source) => {
    const symbols = new Map();
    const cleanedSource = source
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/\/\/.*$/gm, " ")
      .replace(/"(?:\\.|[^"\\])*"/g, " ")
      .replace(/'(?:\\.|[^'\\])*'/g, " ");

    const classRegex = /\b(class|struct|enum|namespace)\s+([A-Za-z_]\w*)/g;
    const functionRegex =
      /\b(?:[A-Za-z_]\w*(?:::[A-Za-z_]\w*)*[\s*&]+)+([A-Za-z_]\w*)\s*\([^;{}]*\)\s*(?:const)?\s*(?:\{|$)/gm;
    const declarationRegex =
      /\b(?:const\s+|constexpr\s+|static\s+|mutable\s+|unsigned\s+|signed\s+|long\s+|short\s+)*([A-Za-z_]\w*(?:::[A-Za-z_]\w*)*)\s+([^;{}()]+);/gm;

    for (const match of cleanedSource.matchAll(classRegex)) {
      addSymbol(symbols, match[2], match[1]);
    }

    for (const match of cleanedSource.matchAll(functionRegex)) {
      addSymbol(symbols, match[1], "function");
    }

    for (const match of cleanedSource.matchAll(declarationRegex)) {
      const declaredType = match[1].split("::").pop();
      const declarators = match[2].split(",");

      declarators.forEach((declarator) => {
        const variableMatch = declarator.match(/([A-Za-z_]\w*)\s*(?:=|\[|$)/);

        if (!variableMatch) {
          return;
        }

        const variableName = variableMatch[1];

        if (
          variableName === declaredType ||
          cppPrimitiveTypeSet.has(variableName)
        ) {
          return;
        }

        addSymbol(symbols, variableName, "variable");
      });
    }

    const stdItemRegex = /\bstd::([A-Za-z_]\w*)/g;

    for (const match of cleanedSource.matchAll(stdItemRegex)) {
      addSymbol(symbols, match[1], "std");
    }

    return symbols;
  };

  const refreshSymbolIndex = () => {
    const activeFile = getActiveFile();

    if (!activeFile || !isCppFileActive()) {
      currentSymbols = new Map();
      currentSymbolTrie = null;
      return;
    }

    currentSymbols = extractCppSymbols(activeFile.content);
    currentSymbolTrie = buildTrie(Array.from(currentSymbols.keys()));
  };

  const hideAutocomplete = () => {
    activeSuggestions = [];
    selectedSuggestionIndex = 0;
    autocomplete?.classList.add("hidden");

    if (autocomplete) {
      autocomplete.innerHTML = "";
    }
  };

  const renderAutocomplete = () => {
    if (!autocomplete || !activeSuggestions.length) {
      hideAutocomplete();
      return;
    }

    autocomplete.innerHTML = activeSuggestions
      .map(
        (suggestion, index) => `
          <div
            class="autocomplete-item${index === selectedSuggestionIndex ? " active" : ""}"
            data-index="${index}"
          >
            <span class="autocomplete-word">${escapeHtml(suggestion.label)}</span>
            <span class="autocomplete-kind">${escapeHtml(suggestion.kind)}</span>
          </div>
        `,
      )
      .join("");

    autocomplete.classList.remove("hidden");
  };

  const updateAutocomplete = () => {
    if (!isCppFileActive()) {
      hideAutocomplete();
      return;
    }

    const currentWord = getCurrentWord().toLowerCase();

    if (!currentWord) {
      hideAutocomplete();
      return;
    }

    if (!cppAutocompleteTrie || typeof getTrieSuggestions !== "function") {
      hideAutocomplete();
      return;
    }

    refreshSymbolIndex();

    const symbolSuggestions = currentSymbolTrie
      ? getTrieSuggestions(currentSymbolTrie, currentWord, 8).map((label) => ({
          label,
          kind: currentSymbols.get(label) || "symbol",
          source: "symbol",
        }))
      : [];

    const keywordSuggestions = getTrieSuggestions(cppAutocompleteTrie, currentWord, 8).map(
      (label) => ({
        label,
        kind: "keyword",
        source: "keyword",
      }),
    );

    const mergedSuggestions = [];
    const seenLabels = new Set();

    [...symbolSuggestions, ...keywordSuggestions].forEach((suggestion) => {
      if (seenLabels.has(suggestion.label)) {
        return;
      }

      seenLabels.add(suggestion.label);
      mergedSuggestions.push(suggestion);
    });

    activeSuggestions = mergedSuggestions.slice(0, 8);

    selectedSuggestionIndex = 0;
    renderAutocomplete();
  };

  const insertSuggestion = (suggestion) => {
    const currentWord = getCurrentWord();

    if (!suggestion || !currentWord) {
      return;
    }

    const start = code.selectionStart - currentWord.length;
    const end = code.selectionStart;

    code.setRangeText(suggestion.label, start, end, "end");
    code.focus();

    const activeFile = getActiveFile();

    if (activeFile) {
      activeFile.content = code.value;
      saveFiles();
      renderCodeView(activeFile.name);
    } else {
      renderCodeView();
    }

    updateLines();
    highlightLine();
    updateAutocomplete();
  };

  const setActiveButton = () => {
    const buttons = fileContainer.querySelectorAll(".file-btn");

    buttons.forEach((button) => {
      button.classList.toggle("active", button.dataset.fileId === activeFileId);
    });
  };

  const loadActiveFile = () => {
    const activeFile = getActiveFile();

    if (!activeFile) {
      return;
    }

    code.value = activeFile.content;
    code.scrollTop = 0;
    lines.scrollTop = 0;
    renderCodeView(activeFile.name);

    if (highlighting) {
      highlighting.scrollTop = 0;
      highlighting.scrollLeft = 0;
    }

    updateLines();
    highlightLine();
    updateAutocomplete();
    setActiveButton();
  };

  const renderTabs = () => {
    fileContainer.querySelectorAll(".file-btn").forEach((button) => {
      button.remove();
    });

    files.forEach((file) => {
      const button = document.createElement("button");
      button.className = "file-btn";
      button.dataset.fileId = file.id;
      button.textContent = file.name;
      fileContainer.insertBefore(button, addFileMenu);
    });

    setActiveButton();
  };

  const switchFile = (fileId) => {
    const currentFile = getActiveFile();

    if (currentFile) {
      currentFile.content = code.value;
    }

    activeFileId = fileId;
    loadActiveFile();
    saveFiles();
  };

  const createFile = (name, extension) => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    const fullName = `${trimmedName}${extension}`;
    const duplicateFile = files.find((file) => file.name === fullName);

    if (duplicateFile) {
      switchFile(duplicateFile.id);
      return;
    }

    const newFile = {
      id: createFileId(),
      name: fullName,
      content: "",
    };

    files.push(newFile);
    renderTabs();
    switchFile(newFile.id);
  };

  const storedState = getStoredState();

  if (storedState?.files?.length) {
    files = storedState.files;
    activeFileId = storedState.activeFileId || storedState.files[0].id;
    renderTabs();
    loadActiveFile();
  } else {
    files = getDomFiles();
    activeFileId = files[0]?.id || null;
    renderTabs();
    loadActiveFile();
    saveFiles();
  }

  code.addEventListener("input", () => {
    const activeFile = getActiveFile();

    if (activeFile) {
      activeFile.content = code.value;
      saveFiles();
      renderCodeView(activeFile.name);
    } else {
      renderCodeView();
    }

    updateLines();
    highlightLine();
    updateAutocomplete();
  });

  code.addEventListener("keydown", (event) => {
    if (!activeSuggestions.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      selectedSuggestionIndex =
        (selectedSuggestionIndex + 1) % activeSuggestions.length;
      renderAutocomplete();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      selectedSuggestionIndex =
        (selectedSuggestionIndex - 1 + activeSuggestions.length) %
        activeSuggestions.length;
      renderAutocomplete();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      insertSuggestion(activeSuggestions[selectedSuggestionIndex]);
      hideAutocomplete();
      return;
    }

    if (event.key === "Escape") {
      hideAutocomplete();
    }
  });

  code.addEventListener("click", updateAutocomplete);
  code.addEventListener("blur", () => {
    setTimeout(() => {
      hideAutocomplete();
    }, 120);
  });

  autocomplete?.addEventListener("mousedown", (event) => {
    event.preventDefault();
    const item = event.target.closest(".autocomplete-item");

    if (!item) {
      return;
    }

    const suggestion = activeSuggestions[Number(item.dataset.index)];
    insertSuggestion(suggestion);
    hideAutocomplete();
  });

  fileContainer.addEventListener("click", (event) => {
    const fileButton = event.target.closest(".file-btn");

    if (fileButton) {
      switchFile(fileButton.dataset.fileId);
      return;
    }

    if (!event.target.closest(".add-file-menu")) {
      fileDropdown?.classList.add("hidden");
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".add-file-menu")) {
      fileDropdown?.classList.add("hidden");
    }
  });

  if (addFileBtn && fileDropdown) {
    addFileBtn.addEventListener("click", () => {
      fileDropdown.classList.toggle("hidden");
    });

    fileDropdown.addEventListener("click", (event) => {
      const item = event.target.closest(".dropdown-item");

      if (!item) {
        return;
      }

      const extension = item.dataset.extension;
      const fileName = prompt(`Enter file name (without ${extension})`);

      if (!fileName) {
        return;
      }

      createFile(fileName, extension);
      fileDropdown.classList.add("hidden");
    });
  }
}

if (divider && editorViewer && codeInput && codeOutput) {
  const minPanelWidth = 180;
  let isDragging = false;

  const stopDragging = () => {
    isDragging = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  const resizePanels = (clientX) => {
    const viewerRect = editorViewer.getBoundingClientRect();
    const dividerWidth = divider.offsetWidth;
    const maxLeftWidth = viewerRect.width - dividerWidth - minPanelWidth;
    const leftWidth = Math.min(
      Math.max(clientX - viewerRect.left, minPanelWidth),
      maxLeftWidth,
    );

    codeInput.style.flexBasis = `${leftWidth}px`;
    codeOutput.style.flexBasis = `${viewerRect.width - dividerWidth - leftWidth}px`;
  };

  divider.addEventListener("pointerdown", (event) => {
    isDragging = true;
    divider.setPointerCapture(event.pointerId);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  });

  divider.addEventListener("pointermove", (event) => {
    if (!isDragging) {
      return;
    }

    resizePanels(event.clientX);
  });

  divider.addEventListener("pointerup", stopDragging);
  divider.addEventListener("pointercancel", stopDragging);
}
