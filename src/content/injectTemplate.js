export const loadTemplate = () => {
  fetch(chrome.runtime.getURL("/template.html"))
    .then((r) => r.text())
    .then((html) => {
      document.body.insertAdjacentHTML("beforeend", html);
    })
    .then(() => {
      const close = document.getElementById("close-mee-extension-container");
      const container = document.getElementById("mee-extension-container");
      close.addEventListener("click", () => {
        container.classList.add("hidden");
      });
    });
};
