import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" mode bundles only the files needed to run the production server.
  // This is required for the Docker multi-stage build to work correctly.
  // It creates .next/standalone/server.js which the runner stage executes.
  output: "standalone",
};

export default nextConfig;
