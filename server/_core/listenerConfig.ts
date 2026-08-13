export function resolvePublicListener(env: NodeJS.ProcessEnv = process.env) {
  const rawPort = env.PORT ?? "3000";
  const port = Number.parseInt(rawPort, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`PORT must be an integer between 1 and 65535; received ${JSON.stringify(rawPort)}.`);
  }
  return { host: "0.0.0.0", port } as const;
}
