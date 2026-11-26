import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Shared hosting with Passenger (ADR-0002): self-contained build in .next/standalone.
  output: "standalone",
  cacheComponents: true,
  async redirects() {
    return [{ source: "/", destination: "/draws", permanent: false }];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
