function setDomSignal() {
  try {
    const script_content =
      'Object.defineProperty(Navigator.prototype, "globalPrivacyControl", {\n\t\t   get: () => true,\n\t\t   configurable: true,\n\t\t   enumerable: true\n\t   });\n\t   document.currentScript.parentElement.removeChild(document.currentScript);\n\t';

    const script = document.createElement("script");
    script.innerHTML = script_content;
    document.documentElement.prepend(script);
  } catch (err) {
    console.error(`Failed to set DOM signal: ${err}`);
  }
}
setDomSignal();
