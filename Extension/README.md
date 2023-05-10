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