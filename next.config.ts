import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hosting compartido con Passenger (ADR-0002): build autocontenido en .next/standalone.
  output: "standalone",
  cacheComponents: true,
  async redirects() {
    return [{ source: "/", destination: "/sorteos", permanent: false }];
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
