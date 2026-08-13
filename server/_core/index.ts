import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getPersistentFastApiHealth, startPersistentFastApi, stopPersistentFastApi } from "./fastApiLifecycle";
import { resolvePublicListener } from "./listenerConfig";

async function startServer() {
  await startPersistentFastApi(process.cwd());
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  app.get("/health", async (_req, res) => {
    const health = await getPersistentFastApiHealth();
    res.status(health.status).json(health.body);
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const { host, port } = resolvePublicListener();

  server.listen(port, host, () => {
    console.log(`Server running on http://${host}:${port}/`);
  });
  const shutdown = () => {
    void stopPersistentFastApi().finally(() => server.close(() => process.exit(0)));
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

startServer().catch(console.error);
