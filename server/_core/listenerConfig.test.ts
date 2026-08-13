import { describe, expect, it } from "vitest";
import { resolvePublicListener } from "./listenerConfig";

describe("public listener configuration", () => {
  it("uses the host-provided port without selecting an alternative", () => {
    expect(resolvePublicListener({ PORT: "10000" } as NodeJS.ProcessEnv)).toEqual({ host: "0.0.0.0", port: 10000 });
  });

  it("rejects invalid port values before startup", () => {
    expect(() => resolvePublicListener({ PORT: "not-a-port" } as NodeJS.ProcessEnv)).toThrow("PORT must be an integer");
  });
});
