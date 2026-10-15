import mongoose from "mongoose";
import dns from "node:dns";

// Force IPv4 DNS resolution to avoid slow SRV lookups on Windows
try {
  dns.setDefaultResultOrder("ipv4first");
  dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
  dns.promises.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch {
  // Ignore in restricted environments
}

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

const CONNECT_OPTS: mongoose.ConnectOptions = {
  bufferCommands: false,
  maxPoolSize:    10,
  minPoolSize:    2,          // keep 2 connections warm so first request is fast
  serverSelectionTimeoutMS: 8000,
  socketTimeoutMS:          45000,
  connectTimeoutMS:         10000,
};

export async function connectDB(): Promise<typeof mongoose> {
  // Already connected — fast path
  if (mongoose.connection.readyState === 1) return mongoose;

  // Reuse the cached promise across hot reloads (dev) and concurrent requests (prod).
  // Caching the promise means two simultaneous requests both await the same connection
  // attempt instead of each calling mongoose.connect(), which throws on a second call.
  if (!globalThis._mongooseConnection) {
    globalThis._mongooseConnection = mongoose
      .connect(getMongoUri(), CONNECT_OPTS)
      .catch((err) => {
        // Clear cache on failure so the next request retries
        globalThis._mongooseConnection = undefined;
        throw err;
      });
  }

  return globalThis._mongooseConnection;
}

export default connectDB;
