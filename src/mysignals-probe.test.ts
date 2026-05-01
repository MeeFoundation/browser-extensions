import { afterEach, describe, expect, it, vi } from "vitest";
import { probeMySignals } from "./mysignals-probe";

function mockResponse(headers: Record<string, string>): Response {
  return { headers: new Headers(headers) } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("probeMySignals", () => {
  it("confirms GPC when Critical-MS contains it and pins the request shape", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockResponse({ "Critical-MS": "GPC" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await probeMySignals("example.com");

    expect(result).toEqual({
      confirmed: true,
      varyHeaders: [],
      highEntropyHints: [],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://example.com/");
    expect(init).toMatchObject({ method: "HEAD", redirect: "manual" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("returns confirmed=false and empty arrays when no relevant headers are present", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockResponse({ "Content-Type": "text/html" })),
    );

    const result = await probeMySignals("nogpc.example");

    expect(result).toEqual({
      confirmed: false,
      varyHeaders: [],
      highEntropyHints: [],
    });
  });

  it("parses Vary and filters Accept-CH to known high-entropy hints", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockResponse({
          "Critical-MS": "GPC",
          Vary: "Accept-Encoding, Cookie",
          "Accept-CH": "Sec-CH-UA-Platform, DPR",
        }),
      ),
    );

    const result = await probeMySignals("example.com");

    expect(result).toEqual({
      confirmed: true,
      varyHeaders: ["Accept-Encoding", "Cookie"],
      highEntropyHints: ["Sec-CH-UA-Platform"],
    });
  });

  it("returns the empty default when fetch rejects (network error / timeout)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    const result = await probeMySignals("unreachable.example");

    expect(result).toEqual({
      confirmed: false,
      varyHeaders: [],
      highEntropyHints: [],
    });
  });
});
