/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for safer development
  reactStrictMode: true,

  // Image domains if needed later
  images: {
    remotePatterns: [],
  },

  // Environment variable exposure to the client
  env: {
    NEXT_PUBLIC_APP_NAME: "SEBSA Internal Assessment",
  },
};

export default nextConfig;
