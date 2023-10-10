function e(){return indexedDB.open("MeeExtensionDB",7)}function t(){return new Promise(((t,n)=>{const a=[],o=e();o.onerror=e=>{n()},o.onsuccess=function(e){const n=e.target.result;n.transaction(["domains"],"readwrite").objectStore("domains").openCursor().onsuccess=e=>{const n=e.target.result;n?(!1===n.value.enabled&&a.push(n.value.domain),n.continue()):t(a)},n.close()}}))}async function n(t){return new Promise(((n,a)=>{const o=e();o.onerror=e=>{a()},o.onsuccess=function(e){const o=e.target.result,s=o.transaction(["domains"],"readwrite").objectStore("domains").get(t);s.onerror=e=>{a()},s.onsuccess=e=>{n(e.target.result)},o.close()}}))}const a="visitedKey";e().onupgradeneeded=function(e){const t=e.target.result,n=t.createObjectStore("domains",{keyPath:"domain"});n.createIndex("wellknown","wellknown",{unique:!1}),n.createIndex("enabled","enabled",{unique:!1}),n.createIndex("domain","enabled",{unique:!0}),t.close()};let o=[],s=!1;async function r(e,t){let n={addRules:[{id:e,priority:2,action:{type:"modifyHeaders",requestHeaders:[{header:"Sec-GPC",operation:"remove"},{header:"DNT",operation:"remove"}]},condition:{urlFilter:t,resourceTypes:["main_frame","sub_frame","stylesheet","script","image","font","object","xmlhttprequest","ping","csp_report","media","websocket","webtransport","webbundle","other"]}}],removeRuleIds:[e]};await chrome.declarativeNetRequest.updateDynamicRules(n)}async function i(){let e=chrome.declarativeNetRequest.MAX_NUMBER_OF_DYNAMIC_AND_SESSION_RULES,t={removeRuleIds:[...Array(e).keys()]};await chrome.declarativeNetRequest.updateDynamicRules(t)}async function c(){let e=1;const n=await t();if(n){o=n;for(let t of n)await r(e++,t)}}function d(t,n){let a=n.tab.id,o=new URL(n.origin).hostname.replace("www.",""),s=[];s[a]=t.data;let r=t.data;const i=!(!s[a]||!0!==s[a].gpc);var c;!0===i&&chrome.action.setIcon({tabId:a,path:"images/icon-96.png"}),c={domain:o,wellknown:i,enabled:!0},e().onsuccess=function(e){const t=e.target.result.transaction(["domains"],"readwrite").objectStore("domains");t.get(c.domain).onsuccess=e=>{const n=e.target.result,a=n&&!n.enabled?{domain:c.domain,wellknown:c.gpc,enabled:!1}:c,o=t.put(a);o.onerror=e=>{console.warn("requestUpdate error",e)},o.onsuccess=e=>{console.log("requestUpdate onsuccess",e)}}},chrome.runtime.onMessage.addListener((function(e,t,n){"POPUP_LOADED"===e.msg&&chrome.runtime.sendMessage({msg:"SEND_WELLKNOWN_TO_POPUP",data:{domain:o,wellknownData:r}})}))}chrome.history.onVisited.addListener((e=>{!async function(e){let t,n;try{const e=await chrome.storage.local.get([a]);n=JSON.parse(e[a])}catch{n=[]}t=n||[];const o={};let s=!1;t.forEach((t=>{t.id===e.id&&(t=e,s=!0)})),o[a]=s?JSON.stringify([...t]):JSON.stringify([...t,e]),await chrome.storage.local.set(o)}(e)})),chrome.runtime.onMessage.addListener((function(e,t,n){if("CHECK_ENABLED"===e.msg){return n({isEnabled:-1===o.findIndex((t=>t===e.data))&&!s}),!0}})),chrome.runtime.onMessage.addListener((async function(e,t,a){switch(e.msg){case"DOWNLOAD_WELLKNOWN":d(e,t);break;case"UPDATE_SELECTOR":await i(),await c();break;case"UPDATE_ENABLED":await async function(){await i();const e=await n("meeExtension"),t=!e||e.enabled;s=!t,t?await c():await r(1,"*")}()}return!0})),chrome.runtime.onInstalled.addListener((async function(e){const a=await t();a&&(o=a);const i=await n("meeExtension"),d=!i||i.enabled;s=!d,d?await c():await r(1,"*")}));
