# How it works

## manifest.json
  - web extension rules file

## rules.json
  - adds Sec-GPC and DNT header sending rule in all requests

## content.js

  - Downloads the .well-known/gpc.json file, if it exists, then this domain supports the GPC signal
  - If the domain supports the signal, then the web extension icon in the background.js file is replaced

## background.js
  - Performs a script injection on the client that sets the navigator.globalPrivacyControl flag
  - Adds a dynamic rule to remove sending headers for disabled domains
  - Adds disabled domains to excludeMatches for script injection

## popup.js/popup.html/popup.css
  - Responsible for displaying the web extension, implements the functionality of disabling the domain and web extension

## store.js
  - Functionality for connecting and fetching data from indexedDB

# Links for tests
  - [https://globalprivacycontrol.org/](https://globalprivacycontrol.org/)
  - [https://global-privacy-control.glitch.me/](https://global-privacy-control.glitch.me/)

# Start using extension
- Run build in `Extension` directory
  ```sh
  npm run build
  ```
- All sliders should be green at the test websites 

# Testing extension
- Run test in `Extension` directory
## For testing in Chrome
  ```sh
  npm run test:chrome
  ```
## For testing in Firefox Desktop
  ```sh
  npm run test:ff-desktop
  ```
## For testing in Firefox Android
- Change the "--android-device" variable in the test:ff-android command in the package.json file to your android device name
- Run test
  ```sh
  npm run test:ff-android
  ```

# How to open an extension in Google Chrome
  - Open [chrome://extensions/](chrome://extensions/)
  - Click on `Load unpacked`
  - Select the `Extension/dist/chrome` directory in the file manager

# How to open an extension in Mozilla Firefox
  - Open [about:debugging](about:debugging)
  - (Optional) Click on `This Firefox`
  - Click on `Load Temporary Add-on`
  - Select the `manifest.json` file in the "Extension/dist/firefox/" directory in the file manager