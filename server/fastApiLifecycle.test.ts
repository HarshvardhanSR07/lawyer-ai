import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const spawnMock = vi.fn();
vi.mock("node:child_process", () => ({ spawn: spawnMock }));

describe("persistent FastAPI lifecycle", () => {
  const child = {
    once: vi.fn(),
    kill: vi.fn(),
    killed: false,
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("FASTAPI_PORT", "8181");
    spawnMock.mockReturnValue(child);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "ok" }), { status: 200 })));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("starts one long-lived FastAPI process and blocks public startup until health is ready", async () => {
    const { startPersistentFastApi, stopPersistentFastApi } = await import("./_core/fastApiLifecycle");

    await startPersistentFastApi("/app");

    expect(spawnMock).toHaveBeenCalledWith(
      "python3",
      ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8181"],
      expect.objectContaining({ cwd: "/app/backend", stdio: "inherit" }),
    );
    expect(fetch).toHaveBeenCalledWith("http://127.0.0.1:8181/health", expect.objectContaining({ signal: expect.any(AbortSignal) }));

    await stopPersistentFastApi();
    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
  });

  it("forwards the private FastAPI readiness result through the public host health endpoint helper", async () => {
    const { getPersistentFastApiHealth } = await import("./_core/fastApiLifecycle");

    await expect(getPersistentFastApiHealth()).resolves.toEqual({ status: 200, body: { status: "ok" } });
  });
});
