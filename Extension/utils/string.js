export const getDomainFromUrl = (url) => {
  const fullUrl = new URL(url);
  return fullUrl.hostname.replace("www.", "");
};
