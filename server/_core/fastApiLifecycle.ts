import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";

let processHandle: ChildProcess | null = null;
let stopping = false;

function fastApiBaseUrl() {
  return (process.env.FASTAPI_INTERNAL_URL ?? `http://127.0.0.1:${process.env.FASTAPI_PORT ?? "8000"}`).replace(/\/$/, "");
}

export async function startPersistentFastApi(projectRoot: string) {
  if (process.env.NODE_ENV !== "production") return;
  if (processHandle) return;

  const backendDir = path.join(projectRoot, "backend");
  processHandle = spawn(
    "python3",
    ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", process.env.FASTAPI_PORT ?? "8000"],
    { cwd: backendDir, env: process.env, stdio: "inherit" },
  );

  processHandle.once("error", error => {
    console.error("Unable to start persistent FastAPI backend", error);
    process.exit(1);
  });
  processHandle.once("exit", code => {
    if (!stopping) {
      console.error(`Persistent FastAPI backend exited unexpectedly (${code ?? "signal"}); stopping Node so the instance can be replaced.`);
      process.exit(code ?? 1);
    }
  });

  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const health = await fetch(`${fastApiBaseUrl()}/health`, { signal: AbortSignal.timeout(2_000) });
      if (health.ok) return;
    } catch {
      // Startup includes an eager provider warm-up; retry until its bounded deadline.
    }
    await new Promise(resolve => setTimeout(resolve, 1_000));
  }
  await stopPersistentFastApi();
  throw new Error("FastAPI did not become ready before the persistent instance startup deadline.");
}

export async function getPersistentFastApiHealth() {
  if (process.env.NODE_ENV !== "production") return { status: 200, body: { status: "development", backend: "started separately" } };
  try {
    const response = await fetch(`${fastApiBaseUrl()}/health`, { signal: AbortSignal.timeout(3_000) });
    return { status: response.status, body: await response.json() };
  } catch {
    return { status: 503, body: { status: "unavailable", detail: "Persistent FastAPI backend is not reachable." } };
  }
}

export async function stopPersistentFastApi() {
  stopping = true;
  if (processHandle && !processHandle.killed) processHandle.kill("SIGTERM");
  processHandle = null;
}
