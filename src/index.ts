#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { closeAll } from "./auth/session-manager.js";
import { closeBrowser } from "./clients/catalog-browser.js";

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();

  // Cleanup on exit
  process.on("SIGINT", async () => {
    await cleanup();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await cleanup();
    process.exit(0);
  });

  await server.connect(transport);
}

async function cleanup() {
  await closeAll().catch(() => {});
  await closeBrowser().catch(() => {});
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
