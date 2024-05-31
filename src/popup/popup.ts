document.addEventListener("DOMContentLoaded", async (_) => {
  chrome.runtime.sendMessage({
    msg: "POPUP_LOADED",
    data: null,
  });
});
chrome.runtime.onMessage.addListener(async function (message, _, __) {
  if (message.msg === "SEND_WELLKNOWN_TO_POPUP") {
    console.log("SEND_WELLKNOWN_TO_POPUP", message.data)
  }
});