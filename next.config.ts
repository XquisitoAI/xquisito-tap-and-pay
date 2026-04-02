import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  // Security headers are now handled by middleware.ts with dynamic nonces
  // for PCI DSS compliance (no unsafe-inline in CSP)
};

export default nextConfig;
