const lines = document.getElementById("lines");
const code = document.getElementById("code");
const divider = document.querySelector(".middle-edit-view");
const editorViewer = document.querySelector(".code-editor-viewer");
const codeInput = document.querySelector(".code-input");
const codeOutput = document.querySelector(".code-output");
const addFileBtn = document.getElementById("addFileBtn");
const fileDropdown = document.getElementById("fileDropdown")
const fileContainer = document.querySelector(".files");


if (lines && code) {
  const updateLines = () => {
    const count = code.value.split("\n").length;
    let numbers = "";
    for (let i = 1; i <= count; i++) {
      numbers += i + "<br>";
    }
    lines.innerHTML = numbers;
  };

  function highlightLine() {
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
  }

  code.addEventListener("scroll", () => {
    lines.scrollTop = code.scrollTop;
  });

  code.addEventListener("click", highlightLine);
  code.addEventListener("keyup", highlightLine);
  code.addEventListener("input", () => {
    updateLines();
    highlightLine();
  });

  updateLines();
  highlightLine();
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
      maxLeftWidth
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


addFileBtn.addEventListener("click", () => {
  fileDropdown.classList.toggle("hidden");
});

