import css from "../styles.css";

let injected = false;

export function injectStyles(): void {
  if (injected || typeof document === "undefined") return;
  if (document.querySelector("style[data-concertina]")) {
    injected = true;
    return;
  }
  const style = document.createElement("style");
  style.setAttribute("data-concertina", "");
  style.textContent = css;
  document.head.appendChild(style);
  injected = true;
}
