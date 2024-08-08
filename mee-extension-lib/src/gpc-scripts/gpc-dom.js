function setDomSignal() {
  try {
    Object.defineProperty(Navigator.prototype, "globalPrivacyControl", {
      get: () => true,
      configurable: true,
      enumerable: true
    });
    document.currentScript.parentElement.removeChild(document.currentScript);
  } catch (err) {
    console.error(`Failed to set DOM signal: ${err}`);
  }
}
setDomSignal();
