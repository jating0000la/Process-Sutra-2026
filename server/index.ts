import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
// @ts-ignore - JS helper with runtime side-effects
import loadEnv from "../load-env.js";

// Load environment variables from .env and .env.local
loadEnv();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve on PORT if provided, otherwise prefer 5000 for local dev to avoid common 3000 conflicts
  const preferred = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

  const listen = (p: number) => {
    const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
    server.listen(p, host, () => {
      log(`serving on ${host}:${p}`);
    }).on('error', (err: any) => {
      if (err?.code === 'EADDRINUSE') {
        const next = p + 1;
        log(`port ${p} in use, trying ${next}…`);
        listen(next);
      } else {
        console.error('Server failed to start:', err);
        process.exit(1);
      }
    });
  };

  listen(preferred);
})();
