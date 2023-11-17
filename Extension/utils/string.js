export const getDomainFromUrl = (url) => {
  const fullUrl = new URL(url);
  return fullUrl.hostname.replace("www.", "");
};

export const getRegDomain = (domain) => {
  return `*://${domain}/*`;
};

export const getRegDomains = (domains) => {
  if (!domains) return undefined;
  return domains.map((d) => getRegDomain(d));
};