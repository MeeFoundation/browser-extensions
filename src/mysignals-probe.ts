const HIGH_ENTROPY_HINTS = [
  "Sec-CH-UA-Platform",
  "Sec-CH-UA-Platform-Version",
  "Sec-CH-UA-Arch",
  "Sec-CH-UA-Model",
  "Sec-CH-UA-Full-Version-List",
  "Device-Memory",
  "Downlink",
  "RTT",
  "ECT",
];

export interface ProbeResult {
  confirmed: boolean;
  varyHeaders: string[];
  highEntropyHints: string[];
}

export async function probeMySignals(domain: string): Promise<ProbeResult> {
  try {
    const response = await fetch(`https://${domain}/`, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });

    const criticalMs = response.headers.get("Critical-MS");
    const acceptedMs = response.headers.get("Accepted-MS");
    const confirmed =
      (criticalMs !== null && criticalMs.trim().toUpperCase().split(";").includes("GPC")) ||
      (acceptedMs !== null && acceptedMs.trim().toUpperCase().split(";").includes("GPC"));

    const varyRaw = response.headers.get("Vary");
    const varyHeaders = varyRaw
      ? varyRaw.split(",").map((v) => v.trim()).filter(Boolean)
      : [];

    const acceptChRaw = response.headers.get("Accept-CH");
    const highEntropyHints = acceptChRaw
      ? acceptChRaw
          .split(",")
          .map((v) => v.trim())
          .filter((hint) =>
            HIGH_ENTROPY_HINTS.some((h) => h.toLowerCase() === hint.toLowerCase())
          )
      : [];

    return { confirmed, varyHeaders, highEntropyHints };
  } catch {
    return { confirmed: false, varyHeaders: [], highEntropyHints: [] };
  }
}
