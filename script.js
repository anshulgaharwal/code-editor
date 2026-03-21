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
const autoClosePairs = {
  "(": ")",
  "[": "]",
  "{": "}",
  '"': '"',
  "'": "'",
};
const bracketPairs = {
  "(": ")",
  "[": "]",
  "{": "}",
};
const closingBracketToOpening = Object.fromEntries(
  Object.entries(bracketPairs).map(([opening, closing]) => [closing, opening]),
);
const indentUnit = "  ";

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

  const bracketMatch = getBracketMatch(code.value, code.selectionStart, code.selectionEnd);

  if (fileName.endsWith(".cpp") && typeof highlightCppCode === "function") {
    highlighting.innerHTML = highlightCppCode(code.value, bracketMatch?.indices || []);
  } else if (typeof escapeHtml === "function") {
    highlighting.innerHTML = renderPlainCode(code.value, bracketMatch?.indices || []);
  } else {
    highlighting.textContent = code.value || " ";
  }
};

const renderPlainCode = (source, markedIndices = []) => {
  if (typeof escapeHtml !== "function") {
    return source || " ";
  }

  if (!markedIndices.length) {
    return escapeHtml(source) || " ";
  }

  const markedIndexSet = new Set(markedIndices);
  let html = "";

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const escapedCharacter = escapeHtml(character);

    if (markedIndexSet.has(index)) {
      html += `<span class="bracket-match">${escapedCharacter}</span>`;
    } else {
      html += escapedCharacter;
    }
  }

  return html || " ";
};

const getBracketMatch = (source, selectionStart, selectionEnd = selectionStart) => {
  if (selectionStart !== selectionEnd) {
    return null;
  }

  const candidateIndices = [selectionStart - 1, selectionStart].filter(
    (index) => index >= 0 && index < source.length,
  );

  for (const index of candidateIndices) {
    const character = source[index];

    if (bracketPairs[character]) {
      const matchIndex = findMatchingBracket(source, index, character, bracketPairs[character], 1);

      if (matchIndex !== -1) {
        return { indices: [index, matchIndex] };
      }
    }

    if (closingBracketToOpening[character]) {
      const matchIndex = findMatchingBracket(
        source,
        index,
        character,
        closingBracketToOpening[character],
        -1,
      );

      if (matchIndex !== -1) {
        return { indices: [matchIndex, index] };
      }
    }
  }

  return null;
};

const findMatchingBracket = (source, startIndex, currentBracket, targetBracket, direction) => {
  let depth = 0;

  for (
    let index = startIndex;
    index >= 0 && index < source.length;
    index += direction
  ) {
    const character = source[index];

    if (character === currentBracket) {
      depth += 1;
    } else if (character === targetBracket) {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
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
  const fileHistories = new Map();
  let suppressInputHandler = false;

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
  const getActiveHistory = () => fileHistories.get(activeFileId) || null;

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

    applyEdit(suggestion.label, start, end, "end");
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

    ensureFileHistory(activeFile.id, activeFile.content);

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

  const createHistorySnapshot = () => ({
    content: code.value,
    selectionStart: code.selectionStart,
    selectionEnd: code.selectionEnd,
  });

  const ensureFileHistory = (fileId, content = "") => {
    if (!fileId) {
      return null;
    }

    if (!fileHistories.has(fileId)) {
      fileHistories.set(fileId, {
        stack: [
          {
            content,
            selectionStart: 0,
            selectionEnd: 0,
          },
        ],
        index: 0,
      });
    }

    return fileHistories.get(fileId);
  };

  const recordHistorySnapshot = () => {
    const activeHistory = ensureFileHistory(activeFileId, code.value);

    if (!activeHistory) {
      return;
    }

    const snapshot = createHistorySnapshot();
    const currentSnapshot = activeHistory.stack[activeHistory.index];

    if (
      currentSnapshot &&
      currentSnapshot.content === snapshot.content &&
      currentSnapshot.selectionStart === snapshot.selectionStart &&
      currentSnapshot.selectionEnd === snapshot.selectionEnd
    ) {
      return;
    }

    activeHistory.stack = activeHistory.stack.slice(0, activeHistory.index + 1);
    activeHistory.stack.push(snapshot);
    activeHistory.index = activeHistory.stack.length - 1;
  };

  const restoreHistorySnapshot = (snapshot) => {
    if (!snapshot) {
      return;
    }

    suppressInputHandler = true;
    code.value = snapshot.content;
    code.focus();
    code.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
    suppressInputHandler = false;
    syncEditorState();
  };

  const undoHistory = () => {
    const activeHistory = getActiveHistory();

    if (!activeHistory || activeHistory.index === 0) {
      return;
    }

    activeHistory.index -= 1;
    restoreHistorySnapshot(activeHistory.stack[activeHistory.index]);
  };

  const redoHistory = () => {
    const activeHistory = getActiveHistory();

    if (!activeHistory || activeHistory.index >= activeHistory.stack.length - 1) {
      return;
    }

    activeHistory.index += 1;
    restoreHistorySnapshot(activeHistory.stack[activeHistory.index]);
  };

  const syncEditorState = () => {
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

  const setSelectionRange = (start, end = start) => {
    code.focus();
    code.setSelectionRange(start, end);
    highlightLine();
    renderCodeView(getActiveFile()?.name || "");
  };

  const applyEdit = (
    replacement,
    start,
    end,
    selectionMode = "end",
    nextSelectionStart = null,
    nextSelectionEnd = null,
  ) => {
    suppressInputHandler = true;
    code.setRangeText(replacement, start, end, selectionMode);
    suppressInputHandler = false;

    if (nextSelectionStart !== null) {
      setSelectionRange(
        nextSelectionStart,
        nextSelectionEnd === null ? nextSelectionStart : nextSelectionEnd,
      );
    }

    syncEditorState();
    recordHistorySnapshot();
  };

  const wrapSelectionWithPair = (opening, closing) => {
    const selectionStart = code.selectionStart;
    const selectionEnd = code.selectionEnd;
    const selectedText = code.value.slice(selectionStart, selectionEnd);

    applyEdit(
      `${opening}${selectedText}${closing}`,
      selectionStart,
      selectionEnd,
      "end",
      selectionStart + 1,
      selectionEnd + 1,
    );
  };

  const insertPair = (opening, closing) => {
    const selectionStart = code.selectionStart;

    applyEdit(
      `${opening}${closing}`,
      selectionStart,
      selectionStart,
      "end",
      selectionStart + 1,
    );
  };

  const shouldAutoCloseQuote = (quote) => {
    const selectionStart = code.selectionStart;
    const previousCharacter = code.value[selectionStart - 1] || "";
    const nextCharacter = code.value[selectionStart] || "";
    const isEscaped = previousCharacter === "\\";
    const touchesWord = /\w/.test(previousCharacter) || /\w/.test(nextCharacter);

    return !isEscaped && !touchesWord;
  };

  const getLineStart = (index) => code.value.lastIndexOf("\n", index - 1) + 1;

  const getLineEnd = (index) => {
    const lineEnd = code.value.indexOf("\n", index);
    return lineEnd === -1 ? code.value.length : lineEnd;
  };

  const getLineIndent = (index) => {
    const lineStart = getLineStart(index);
    const lineText = code.value.slice(lineStart, getLineEnd(index));
    const indentMatch = lineText.match(/^[\t ]*/);
    return indentMatch ? indentMatch[0] : "";
  };

  const getPreviousNonWhitespaceCharacter = (index) => {
    for (let currentIndex = index - 1; currentIndex >= 0; currentIndex -= 1) {
      const character = code.value[currentIndex];

      if (!/\s/.test(character)) {
        return character;
      }
    }

    return "";
  };

  const getNextNonWhitespaceCharacter = (index) => {
    for (let currentIndex = index; currentIndex < code.value.length; currentIndex += 1) {
      const character = code.value[currentIndex];

      if (!/\s/.test(character)) {
        return character;
      }
    }

    return "";
  };

  const indentSelection = () => {
    const selectionStart = code.selectionStart;
    const selectionEnd = code.selectionEnd;
    const hasSelection = selectionStart !== selectionEnd;

    if (!hasSelection) {
      applyEdit(indentUnit, selectionStart, selectionStart);
      return;
    }

    const lineStart = getLineStart(selectionStart);
    const normalizedSelectionEnd =
      selectionEnd > lineStart && code.value[selectionEnd - 1] === "\n"
        ? selectionEnd - 1
        : selectionEnd;
    const blockEnd = getLineEnd(normalizedSelectionEnd);
    const selectedBlock = code.value.slice(lineStart, blockEnd);
    const lineCount = selectedBlock.split("\n").length;
    const indentedBlock = selectedBlock
      .split("\n")
      .map((line) => `${indentUnit}${line}`)
      .join("\n");

    applyEdit(
      indentedBlock,
      lineStart,
      blockEnd,
      "preserve",
      selectionStart + indentUnit.length,
      selectionEnd + indentUnit.length * lineCount,
    );
  };

  const outdentSelection = () => {
    const selectionStart = code.selectionStart;
    const selectionEnd = code.selectionEnd;
    const hasSelection = selectionStart !== selectionEnd;
    const lineStart = getLineStart(selectionStart);
    const normalizedSelectionEnd =
      hasSelection && selectionEnd > lineStart && code.value[selectionEnd - 1] === "\n"
        ? selectionEnd - 1
        : selectionEnd;
    const blockEnd = getLineEnd(normalizedSelectionEnd);
    const selectedBlock = code.value.slice(lineStart, blockEnd);
    const linesToChange = selectedBlock.split("\n");
    let removedBeforeSelectionStart = 0;
    let totalRemoved = 0;

    const outdentedBlock = linesToChange
      .map((line, index) => {
        const removeMatch = line.match(/^ {1,2}|\t/);
        const removed = removeMatch ? removeMatch[0].length : 0;

        if (!removed) {
          return line;
        }

        totalRemoved += removed;

        if (index === 0) {
          removedBeforeSelectionStart = Math.min(
            removed,
            Math.max(selectionStart - lineStart, 0),
          );
        }

        return line.slice(removed);
      })
      .join("\n");

    if (totalRemoved === 0) {
      return;
    }

    const nextSelectionStart = Math.max(lineStart, selectionStart - removedBeforeSelectionStart);
    const nextSelectionEnd = hasSelection
      ? Math.max(nextSelectionStart, selectionEnd - totalRemoved)
      : nextSelectionStart;

    applyEdit(
      outdentedBlock,
      lineStart,
      blockEnd,
      "preserve",
      nextSelectionStart,
      nextSelectionEnd,
    );
  };

  const insertNewlineWithIndentation = () => {
    const selectionStart = code.selectionStart;
    const selectionEnd = code.selectionEnd;
    const currentIndent = getLineIndent(selectionStart);
    const previousCharacter = getPreviousNonWhitespaceCharacter(selectionStart);
    const nextCharacter = getNextNonWhitespaceCharacter(selectionEnd);
    const shouldIncreaseIndent = previousCharacter === "{";
    const innerIndent = `${currentIndent}${shouldIncreaseIndent ? indentUnit : ""}`;

    if (shouldIncreaseIndent && nextCharacter === "}") {
      const replacement = `\n${innerIndent}\n${currentIndent}`;
      const caretOffset = selectionStart + innerIndent.length + 1;
      applyEdit(
        replacement,
        selectionStart,
        selectionEnd,
        "end",
        caretOffset,
      );
      return;
    }

    applyEdit(
      `\n${innerIndent}`,
      selectionStart,
      selectionEnd,
      "end",
      selectionStart + innerIndent.length + 1,
    );
  };

  const handleSmartBackspace = () => {
    const selectionStart = code.selectionStart;
    const lineStart = getLineStart(selectionStart);
    const beforeCursor = code.value.slice(lineStart, selectionStart);

    if (/^[ ]+$/.test(beforeCursor)) {
      const removeCount =
        beforeCursor.length % indentUnit.length || indentUnit.length;
      const nextSelectionStart = selectionStart - removeCount;

      applyEdit(
        "",
        nextSelectionStart,
        selectionStart,
        "start",
        nextSelectionStart,
      );
      return true;
    }

    return false;
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
    ensureFileHistory(newFile.id, newFile.content);
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

  files.forEach((file) => {
    ensureFileHistory(file.id, file.content);
  });

  if (activeFileId) {
    const activeHistory = ensureFileHistory(activeFileId, getActiveFile()?.content || "");

    if (activeHistory) {
      activeHistory.stack[0] = createHistorySnapshot();
    }
  }

  code.addEventListener("input", () => {
    if (suppressInputHandler) {
      return;
    }

    syncEditorState();
    recordHistorySnapshot();
  });

  code.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();

      if (event.shiftKey) {
        redoHistory();
      } else {
        undoHistory();
      }

      return;
    }

    if (event.key === "ArrowDown" && activeSuggestions.length) {
      event.preventDefault();
      selectedSuggestionIndex =
        (selectedSuggestionIndex + 1) % activeSuggestions.length;
      renderAutocomplete();
      return;
    }

    if (event.key === "ArrowUp" && activeSuggestions.length) {
      event.preventDefault();
      selectedSuggestionIndex =
        (selectedSuggestionIndex - 1 + activeSuggestions.length) %
        activeSuggestions.length;
      renderAutocomplete();
      return;
    }

    if (event.key === "Enter" && activeSuggestions.length) {
      event.preventDefault();
      insertSuggestion(activeSuggestions[selectedSuggestionIndex]);
      hideAutocomplete();
      return;
    }

    if (event.key === "Escape") {
      hideAutocomplete();
      return;
    }

    const selectionStart = code.selectionStart;
    const selectionEnd = code.selectionEnd;
    const hasSelection = selectionStart !== selectionEnd;
    const typedCharacter = event.key;

    if (typedCharacter === "Tab") {
      event.preventDefault();

      if (event.shiftKey) {
        outdentSelection();
      } else {
        indentSelection();
      }

      return;
    }

    if (typedCharacter === "Enter") {
      event.preventDefault();
      insertNewlineWithIndentation();
      return;
    }

    if (typedCharacter === "Backspace" && selectionStart > 0 && !hasSelection) {
      const previousCharacter = code.value[selectionStart - 1];
      const nextCharacter = code.value[selectionStart];

      if (autoClosePairs[previousCharacter] === nextCharacter) {
        event.preventDefault();
        applyEdit(
          "",
          selectionStart - 1,
          selectionStart + 1,
          "start",
          selectionStart - 1,
        );
        return;
      }

      if (handleSmartBackspace()) {
        event.preventDefault();
      }

      return;
    }

    if (Object.values(bracketPairs).includes(typedCharacter) && !hasSelection) {
      const nextCharacter = code.value[selectionStart];

      if (nextCharacter === typedCharacter) {
        event.preventDefault();
        setSelectionRange(selectionStart + 1);
      }

      return;
    }

    if ((typedCharacter === '"' || typedCharacter === "'") && !hasSelection) {
      const nextCharacter = code.value[selectionStart];

      if (nextCharacter === typedCharacter) {
        event.preventDefault();
        setSelectionRange(selectionStart + 1);
        return;
      }
    }

    if (typedCharacter in autoClosePairs) {
      const closingCharacter = autoClosePairs[typedCharacter];

      if (
        (typedCharacter === '"' || typedCharacter === "'") &&
        !hasSelection &&
        !shouldAutoCloseQuote(typedCharacter)
      ) {
        return;
      }

      event.preventDefault();

      if (hasSelection) {
        wrapSelectionWithPair(typedCharacter, closingCharacter);
      } else {
        insertPair(typedCharacter, closingCharacter);
      }
    }
  });

  code.addEventListener("click", updateAutocomplete);
  code.addEventListener("click", () => {
    renderCodeView(getActiveFile()?.name || "");
  });
  code.addEventListener("keyup", () => {
    renderCodeView(getActiveFile()?.name || "");
  });
  code.addEventListener("select", () => {
    renderCodeView(getActiveFile()?.name || "");
  });
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
