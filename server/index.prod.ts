import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import path from "path";
import fs from "fs";
// @ts-ignore - JS helper with runtime side-effects
import loadEnv from "../load-env.js";

// Load environment variables from .env and .env.local
loadEnv();

function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

function serveStatic(app: express.Express) {
  // In production, static assets are emitted to dist/public relative to CWD
  const distPath = path.resolve(process.cwd(), "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req: Request, res: Response) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

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
  try {
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      console.error('Express error:', err);
      res.status(status).json({ message });
    });

    // In production, only serve static files (no Vite middleware)
    serveStatic(app);

    // Serve on PORT if provided, otherwise prefer 5000 for local dev to avoid common 3000 conflicts
    const preferred = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

    const listen = (p: number) => {
      const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
      server.listen(p, host, () => {
        log(`serving on ${host}:${p}`);
        log(`Health check available at: http://${host}:${p}/api/health`);
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
  } catch (error) {
    console.error('Failed to initialize server:', error);
    // Don't exit immediately, let Railway retry
    setTimeout(() => {
      process.exit(1);
    }, 5000);
  }
})();
