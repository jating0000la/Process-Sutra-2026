import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
// @ts-ignore - JS helper with runtime side-effects
import loadEnv from "../load-env.js";

// Load environment variables from .env and .env.local
loadEnv();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Middleware to redirect IP address requests to domain name
app.use((req, res, next) => {
  const host = req.get('host') || '';
  const protocol = req.protocol;
  
  // Allow ACME challenge requests (for SSL certificate verification)
  if (req.path.startsWith('/.well-known/acme-challenge/')) {
    return next();
  }
  
  // Check if the request is made to an IP address (IPv4 or IPv6)
  const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(host) || // IPv4
                       /^\[?[0-9a-fA-F:]+\]?(:\d+)?$/.test(host);    // IPv6
  
  // If accessed via IP, redirect to the domain
  if (isIpAddress && process.env.DOMAIN_NAME) {
    const targetUrl = `https://${process.env.DOMAIN_NAME}${req.originalUrl}`;
    log(`Redirecting IP request to domain: ${targetUrl}`);
    return res.redirect(301, targetUrl);
  }
  
  next();
});

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

    const findAvailablePort = async (startPort: number): Promise<number> => {
      return new Promise((resolve, reject) => {
        const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
        
        const tryPort = (port: number) => {
          // Create a temporary server to test port availability
          const testServer = createServer();
          
          testServer.listen(port, host, () => {
            testServer.close(() => {
              resolve(port);
            });
          });

          testServer.on('error', (err: any) => {
            if (err?.code === 'EADDRINUSE') {
              log(`port ${port} in use, trying ${port + 1}…`);
              tryPort(port + 1);
            } else {
              reject(err);
            }
          });
        };

        tryPort(startPort);
      });
    };

    try {
      const availablePort = await findAvailablePort(preferred);
      const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
      
      server.listen(availablePort, host, () => {
        log(`serving on ${host}:${availablePort}`);
        log(`Health check available at: http://${host}:${availablePort}/api/health`);
      });
    } catch (error) {
      console.error('Failed to find available port:', error);
      process.exit(1);
    }
  } catch (error) {
    console.error('Failed to initialize server:', error);
    // Don't exit immediately, let Railway retry
    setTimeout(() => {
      process.exit(1);
    }, 5000);
  }
})();
