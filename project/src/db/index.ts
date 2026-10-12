import mongoose from "mongoose";
import dns from "node:dns";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // Ignore in environments where setting DNS servers is restricted
}

// ─────────────────────────────────────────────────────────────────────────────
// MongoDB connection — singleton pattern for Next.js
// Next.js hot-reloads modules in dev, so we cache the connection on globalThis
// to avoid creating a new connection on every request.
// ─────────────────────────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var _mongooseConnection: Promise<typeof mongoose> | undefined;
}

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Please add it to your .env.local file.\n" +
      "Example: MONGODB_URI=mongodb://localhost:27017/sebsa_assessment"
    );
  }
  return uri;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    // Already connected — reuse the existing connection
    return mongoose;
  }

  if (process.env.NODE_ENV === "development") {
    // In development: cache on globalThis to survive hot reloads
    if (!globalThis._mongooseConnection) {
      globalThis._mongooseConnection = mongoose.connect(getMongoUri(), {
        bufferCommands: false,
      });
    }
    return globalThis._mongooseConnection;
  }

  // In production: always create a fresh connection
  return mongoose.connect(getMongoUri(), {
    bufferCommands: false,
  });
}

export default connectDB;
