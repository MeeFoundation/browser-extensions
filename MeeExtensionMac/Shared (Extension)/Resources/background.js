// let UpdateRuleOptions = {
//   addRules: [
//     {
//       id: 69,
//       priority: 1,
//       action: {
//         type: "modifyHeaders",
//         requestHeaders: [
//           { header: "Sec-GPC", operation: "set", value: "1" },
//           { header: "DNT", operation: "set", value: "1" },
//         ],
//       },
//       condition: {
//         urlFilter: "*",
//         resourceTypes: [
//           "main_frame",
//           "sub_frame",
//           "stylesheet",
//           "script",
//           "image",
//           "font",
//           "object",
//           "xmlhttprequest",
//           "ping",
//           "csp_report",
//           "media",
//           "websocket",
//           "webtransport",
//           "webbundle",
//           "other",
//         ],
//       },
//     },
//   ],
//   removeRuleIds: [69],
// };

// chrome.runtime.onInstalled.addListener(function (details) {
//   chrome.declarativeNetRequest.updateDynamicRules(
//     UpdateRuleOptions,
//     function () {
//       console.log("Rule Added!");
//     }
//   );
// });


function handleSendMessageError() {
  const error = chrome.runtime.lastError;
  if (error) {
    console.warn(error.message);
  }
}

chrome.runtime.onMessage.addListener(onMessageHandlerAsync);

async function onMessageHandlerAsync(message, sender, sendResponse) {
  if (message.msg === "DOWNLOAD_WELLKNOWN") {
    let tabID = sender.tab.id;
    let url = new URL(sender.origin);
    let domain = url.host;
    let wellknown = [];
   

    wellknown[tabID] = message.data;
    let wellknownData = message.data;
    
    if (wellknown[tabID]["gpc"] === true) {
      chrome.action.setIcon({
        tabId: tabID,
        path: "images/icon-96.png",
      });
    }
    chrome.runtime.onMessage.addListener(function (message, _, __) {
      if (message.msg === "POPUP_LOADED") {

        chrome.runtime.sendMessage(
          {
            msg: "SEND_WELLKNOWN_TO_POPUP",
            data: {domain, wellknownData},
          },
          handleSendMessageError
        );
      }
    });
    
    
  }
  return true;
}
