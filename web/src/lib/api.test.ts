import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchImages } from "./api";

describe("api auth expiry handling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("clears auth token and emits event on 401 responses", async () => {
    localStorage.setItem("auth_token", "expired-token");
    const eventSpy = vi.spyOn(window, "dispatchEvent");

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: vi.fn().mockResolvedValue({ message: "unauthorized" }),
    } as unknown as Response);

    await expect(fetchImages()).rejects.toThrow("unauthorized");
    expect(localStorage.getItem("auth_token")).toBeNull();
    expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({ type: "auth-expired" }));
  });
});
