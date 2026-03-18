const lines = document.getElementById("lines");
const code = document.getElementById("code");

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
