/**
 * @type {import('next').NextConfig}
 */
export default {
  // // ... existing config
  // webpack: (config, { isServer }) => {
  //   // Handle non-server fallbacks
  //   if (!isServer) {
  //     config.resolve.fallback.fs = false;
  //     config.resolve.fallback.module = false;
  //     config.resolve.fallback.vm = false;
  //   }
  //   // Add VSIX handling
  //   config.module.rules.push({
  //     test: /\.vsix$/,
  //     type: "asset/resource",
  //     generator: {
  //       filename: "static/chunks/[path][name].[hash][ext]",
  //     },
  //   });
  //   return config;
  // },
};
