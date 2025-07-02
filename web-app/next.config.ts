import type { NextConfig } from "next";
import { WebpackConfigContext } from "next/dist/server/config-shared";
import path from "path";
const nextConfig: NextConfig = {
  /* config options here */
  webpack: (
    config: WebpackConfigContext["config"],
    { buildId, dev, isServer, defaultLoaders, webpack },
  ) => {
    // Add custom loader for .vsix files
    config.module.rules.push({
      test: /\.vsix$/,
      type: "asset/resource",
      generator: {
        filename: "static/vsix/[hash][ext][query]",
      },
    });

    return config;
  },
};

export default nextConfig;
