import { beforeEach, describe, expect, it, vi } from "vitest";

describe("api base URL resolution", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("defaults to a relative /api path when no explicit URL is configured", async () => {
    vi.stubEnv("VITE_API_URL", "");
    const { getApiBaseUrl } = await import("./apiClient");
    expect(getApiBaseUrl()).toBe("/api");
  });

  it("falls back to a relative /api path for localhost URLs in production builds", async () => {
    vi.stubEnv("VITE_API_URL", "http://localhost:8080/api");
    const { getApiBaseUrl } = await import("./apiClient");
    expect(getApiBaseUrl()).toBe("/api");
  });
});
