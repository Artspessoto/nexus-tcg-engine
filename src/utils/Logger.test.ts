// utils/Logger.test.ts
import { describe, it, expect, vi } from "vitest";
import { Logger } from "./Logger";

describe("Logger", () => {
  it("should log debug messages with and without data", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    Logger.debug("SYSTEM", "Test without data");
    Logger.debug("SYSTEM", "Test with data", { id: 1 });

    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  it("should log warnings correctly", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

    Logger.warn("Test Warning");

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("should log errors correctly", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    Logger.error("Test Error", new Error("Failure"));

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
