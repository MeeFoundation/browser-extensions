function setDomSignal() {
  try {
    const script_content = `
      Object.defineProperty(Navigator.prototype, "globalPrivacyControl", {
        get: () => false,
        configurable: true,
        enumerable: true
      });
      document.currentScript.parentElement.removeChild(document.currentScript);
    `;
    const script = document.createElement("script");

    if (window.trustedTypes && window.trustedTypes.createPolicy) {
      const escapeHTMLPolicy = window.trustedTypes.createPolicy("default", {
        createHTML: (string) =>
          string
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;"),
        createScript: (string) => string,
      });
      const escaped = escapeHTMLPolicy.createScript(script_content);
      script.innerHTML = escaped;
    } else {
      script.innerHTML = script_content;
    }

    document.documentElement.prepend(script);
  } catch (err) {
    console.error(`Failed to set DOM signal: ${err}`);
  }
}
setDomSignal();
