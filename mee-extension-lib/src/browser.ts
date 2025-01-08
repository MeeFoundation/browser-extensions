import { getDomainFromUrl } from "./string";

export const getBrowserInfo = () => {
  const UA = navigator.userAgent;
  const isMobile = UA.includes("Mobi");

  if (UA.includes("Firefox/")) return isMobile ? "Firefox Mobile" : "Firefox";
  if (UA.includes("Chrome/")) return isMobile ? "Chrome Mobile" : "Chrome";
  if (UA.includes("Safari/")) return isMobile ? "Safari Mobile" : "Safari";
  return isMobile ? "Chrome Mobile" : "Chrome";
};

export const getCurrentParsedDomain = (): Promise<string | null > => {
  return new Promise((resolve) => {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        let tab = tabs[0];
        if (tab.url) {
          const currentUrl = getDomainFromUrl(tab.url);
          resolve(currentUrl);
        } else {
          resolve(null);
        }
      });
    } catch (e) {
      resolve(null);
    }
  });
};
