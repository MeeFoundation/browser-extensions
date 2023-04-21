async function getWellknown(url) {
  const response = await fetch(`${url.origin}/.well-known/gpc.json`);
  let wellknownData;
  try {
    wellknownData = await response.json();
  } catch {
    wellknownData = null;
  }

  chrome.runtime.sendMessage({
    msg: "DOWNLOAD_WELLKNOWN",
    data: wellknownData,
  });
}

(() => {
  let url = new URL(location);
  getWellknown(url);
})();
