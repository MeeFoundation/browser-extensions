export const getDomainFromUrl = (url: string) => {
  const fullUrl = new URL(url);
  return fullUrl.hostname.replace("www.", "");
};

export const getRegDomain = (domain: string) => {
  return `*://${domain}/*`;
};

export const getRegDomains = (domains: string[]) => {
  if (!domains) return undefined;
  return domains.map((d) => getRegDomain(d));
};
