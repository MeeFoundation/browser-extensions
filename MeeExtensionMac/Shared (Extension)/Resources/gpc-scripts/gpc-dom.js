function setDomSignal() {
  try {
    const script_content = `
      Object.defineProperty(Navigator.prototype, "globalPrivacyControl", {
        get: () => true,
        configurable: true,
        enumerable: true
      });
      document.currentScript.parentElement.removeChild(document.currentScript);
    `;
    const script = document.createElement("script");
    script.innerHTML = script_content;
    document.documentElement.prepend(script);
  } catch (err) {
    console.error(`Failed to set DOM signal: ${err}`);
  }
}
setDomSignal();
