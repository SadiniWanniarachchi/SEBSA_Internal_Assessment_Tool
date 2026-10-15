/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    instrumentationHook: true, // enables src/instrumentation.ts (stable in Next 15)
  },

  // Image domains if needed later
  images: {
    remotePatterns: [],
    unoptimized: true,
  },

  // Environment variable exposure to the client
  env: {
    NEXT_PUBLIC_APP_NAME: "SEBSA Internal Assessment",
  },
};

export default nextConfig;
