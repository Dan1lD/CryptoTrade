import express, { type Request, Response, NextFunction } from "express";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";
import { spawn } from "child_process";
import path from "path";

const app = express();

// Middleware for JSON parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Start Python FastAPI backend on port 5001
log("Starting Python FastAPI backend on port 5001...");
const pythonProcess = spawn("python", ["main.py"], {
  cwd: path.join(process.cwd(), "..", "backend"),
  stdio: ["ignore", "pipe", "pipe"],
});

pythonProcess.stdout?.on("data", (data) => {
  log(`[Python] ${data.toString().trim()}`);
});

pythonProcess.stderr?.on("data", (data) => {
  console.error(`[Python Error] ${data.toString().trim()}`);
});

pythonProcess.on("error", (err) => {
  console.error("Failed to start Python backend:", err);
  process.exit(1);
});

pythonProcess.on("exit", (code) => {
  if (code !== 0) {
    console.error(`Python backend exited with code ${code}`);
  }
});

process.on("exit", () => {
  pythonProcess.kill();
});

process.on("SIGINT", () => {
  pythonProcess.kill();
  process.exit();
});

process.on("SIGTERM", () => {
  pythonProcess.kill();
  process.exit();
});

// Wait for Python backend to start
await new Promise((resolve) => setTimeout(resolve, 2000));

// Proxy middleware for API routes - forward to Python backend
app.all("/api/*", async (req: Request, res: Response) => {
  try {
    // Construct full URL including the /api prefix
    const url = `http://localhost:5001${req.originalUrl}`;
    const headers: Record<string, string> = {};
    
    // Forward relevant headers
    if (req.headers["x-session-id"]) {
      headers["x-session-id"] = req.headers["x-session-id"] as string;
    }
    if (req.headers["content-type"]) {
      headers["content-type"] = req.headers["content-type"] as string;
    }

    const start = Date.now();
    const response = await fetch(url, {
      method: req.method,
      headers,
      body: req.method !== "GET" && req.method !== "HEAD" ? JSON.stringify(req.body) : undefined,
    });

    const contentType = response.headers.get("content-type");
    const data = contentType?.includes("application/json") 
      ? await response.json()
      : await response.text();

    const duration = Date.now() - start;
    let logLine = `${req.method} ${req.originalUrl} ${response.status} in ${duration}ms`;
    if (typeof data === "object" && typeof data !== "string") {
      const preview = JSON.stringify(data).slice(0, 80);
      logLine += ` :: ${preview}${preview.length >= 80 ? "..." : ""}`;
    }
    log(logLine);

    res.status(response.status);
    if (typeof data === "string") {
      res.send(data);
    } else {
      res.json(data);
    }
  } catch (error: any) {
    log(`Error proxying to Python backend: ${error.message}`);
    res.status(500).json({ error: "Backend connection error" });
  }
});

(async () => {
  const server = createServer(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // Setup Vite in development or serve static in production
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`Server running on port ${port}`);
      log(`Python FastAPI backend: http://localhost:5001`);
      log(`Frontend & API proxy: http://0.0.0.0:${port}`);
    }
  );
})();
