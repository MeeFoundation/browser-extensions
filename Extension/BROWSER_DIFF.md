# Google Chrome - Reference, default value

# Mozilla Firefox - Desktop

### Manifest
  - Doesn't allow `service_worker` in `background`.
  **Fix**: change `service_worker` to `scripts` and pass script name as array of strings
  [Background Scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Background_scripts) | [Scripts Compatibilities](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background)

### Background script
  - Doesn't allow `webtransport` and `webbundle` in `ResourceType` in `declarativeNetRequest`
  **Fix**: None, just remove this resources from array
  [ResourceType](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/declarativeNetRequest/ResourceType)
  - Should return `Promise.resolve(dataObj)` or `false` or `undefined`
  **Fix**: Call `sendResponse(data)` and after that return `Promise.resolve`
  [OnMessage runtime](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage) | [sendMessage](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/sendMessage#browser_compatibility)
  - `MessageSender` doesn't have an `origin` value.
  **Fix**: use `sender.origin || sender.url || sender.tab.url` instead. Or in our case we can rewrite it to `new URL(sender.url)` instead of `new URL(sender.origin)`
  [MessageSender on MDN](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/MessageSender)

# Mozilla Firefox - Android

### Manifest
  - Doesn't allow `nativeMessaging` in `permission`.
  **Fix**: add `nativeMessaging` in `optional_permissions`
  [Issue](https://github.com/mozilla-mobile/fenix/issues/15904)

### Background script
  - Doesn't allow `webtransport` and `webbundle` in `ResourceType` in `declarativeNetRequest`
  **Fix**: None, just remove this resources from array
  [ResourceType](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/declarativeNetRequest/ResourceType)
  - Should return `Promise.resolve(dataObj)` or `false` or `undefined`
  **Fix**: Call `sendResponse(data)` and after that return `Promise.resolve`
  [OnMessage runtime](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage) | [sendMessage](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/sendMessage#browser_compatibility)
  - `MessageSender` doesn't have an `origin` value.
  **Fix**: use `sender.origin || sender.url || sender.tab.url` instead. Or in our case we can rewrite it to `new URL(sender.url)` instead of `new URL(sender.origin)`
  [MessageSender on MDN](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/MessageSender)
  

# Apple Safari - Desktop

### Background script
  - Doesn't allow `webtransport` and `webbundle` in `ResourceType` in `declarativeNetRequest`
  **Fix**: None, just remove this resources from array
  [ResourceType](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/declarativeNetRequest/ResourceType)
  - Should return `Promise.resolve(dataObj)` or `false` or `undefined`
  **Fix**: Call `sendResponse(data)` and after that return `Promise.resolve`
  [OnMessage runtime](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage) | [sendMessage](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/sendMessage#browser_compatibility)
  - `MessageSender` doesn't have an `origin` value.
  **Fix**: use `sender.origin || sender.url || sender.tab.url` instead. Or in our case we can rewrite it to `new URL(sender.url)` instead of `new URL(sender.origin)`
  [MessageSender on MDN](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/MessageSender)

# Apple Safari - iOS

### Background script
  - Doesn't allow `webtransport` and `webbundle` in `ResourceType` in `declarativeNetRequest`
  **Fix**: None, just remove this resources from array
  [ResourceType](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/declarativeNetRequest/ResourceType)
  - Should return `Promise.resolve(dataObj)` or `false` or `undefined`
  **Fix**: Call `sendResponse(data)` and after that return `Promise.resolve`
  [OnMessage runtime](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage) | [sendMessage](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/sendMessage#browser_compatibility)
  - `MessageSender` doesn't have an `origin` value.
  **Fix**: use `sender.origin || sender.url || sender.tab.url` instead. Or in our case we can rewrite it to `new URL(sender.url)` instead of `new URL(sender.origin)`
  [MessageSender on MDN](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/MessageSender)

# Yandex Browser - Android

# Google Chrome - Android

