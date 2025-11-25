import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";

// Load environment variables from .env and .env.local
const env = dotenv.config();
dotenvExpand.expand(env);

// Load .env.local if it exists
try {
  const envLocal = dotenv.config({ path: '.env.local' });
  dotenvExpand.expand(envLocal);
} catch (e) {
  // .env.local is optional
}

// Validate critical environment variables in production
function validateEnvironment() {
  const requiredEnvVars = [
    'DATABASE_URL',
    'MONGODB_URI',
    'SESSION_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI'
  ];

  const missing: string[] = [];
  const warnings: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  // Validate SESSION_SECRET strength
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    warnings.push('SESSION_SECRET should be at least 32 characters for security');
  }

  // Validate production URLs (no localhost)
  if (process.env.NODE_ENV === 'production') {
    if (process.env.DATABASE_URL?.includes('localhost')) {
      warnings.push('DATABASE_URL contains localhost - this will fail in production');
    }
    if (process.env.MONGODB_URI?.includes('localhost')) {
      warnings.push('MONGODB_URI contains localhost - this will fail in production');
    }
    if (process.env.GOOGLE_REDIRECT_URI?.includes('localhost')) {
      warnings.push('GOOGLE_REDIRECT_URI contains localhost - OAuth will fail in production');
    }
    if (process.env.COOKIE_SECURE !== 'true') {
      warnings.push('COOKIE_SECURE should be true in production for security');
    }
  }

  if (missing.length > 0) {
    console.error('❌ FATAL: Missing required environment variables:');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('\nServer cannot start. Please configure environment variables.');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Environment configuration warnings:');
    warnings.forEach(w => console.warn(`   - ${w}`));
  }

  console.log('✅ Environment validation passed');
}

// Run validation
validateEnvironment();

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

// Security: Helmet middleware for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "accounts.google.com", "https://accounts.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "accounts.google.com", "https://accounts.google.com"],
      frameSrc: ["accounts.google.com", "https://accounts.google.com"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'sameorigin'
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
}));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['https://processsutra.com', 'https://www.processsutra.com'];

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      log(`Blocked CORS request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  maxAge: 86400, // 24 hours
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Device-ID', 'X-API-Key']
}));

// Compression middleware
app.use(compression({
  level: 6, // Balance between compression and CPU
  threshold: 1024, // Only compress responses > 1KB
}));

// Body parsing with size limits (prevent DoS)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

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
