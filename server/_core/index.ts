import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { ensureRedirectMap, resolveRedirect } from "../redirects";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // ── CORS ──────────────────────────────────────────────────────────────────
  // Lets the Go Build Supply storefront (a different domain) call Jimmy's API
  // from the embedded homepage hero. Add domains via CORS_ORIGINS (comma-sep).
  const allowedOrigins = new Set(
    [
      "https://gobuildsupply.com",
      "https://www.gobuildsupply.com",
      "https://store-n9hvqo7nsn.mybigcommerce.com",
      ...(process.env.CORS_ORIGINS ?? "").split(",").map((s) => s.trim()),
    ].filter(Boolean),
  );
  app.use("/api/trpc", (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Access-Control-Max-Age", "86400");
    }
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // ── Legacy URL rescue ───────────────────────────────────────────────────────
  // The domain used to run on BigCommerce. Google Shopping, old links, and
  // search results point at the old product/category URLs. Redirect those to
  // the matching page on the new site so shoppers don't hit the NotFound page.
  ensureRedirectMap();
  app.use((req, res, next) => {
    const p = req.path;
    if (
      req.method !== "GET" ||
      p.startsWith("/api") ||
      p.startsWith("/assets") ||
      p.startsWith("/brand") ||
      p.startsWith("/@") || // vite dev internals
      p.startsWith("/src") ||
      p.includes(".") // files: .js, .css, .ico, images, fonts
    ) {
      return next();
    }
    ensureRedirectMap();
    const target = resolveRedirect(p);
    if (target) {
      res.redirect(301, target);
      return;
    }
    next();
  });

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
