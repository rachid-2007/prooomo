import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  compress: true,
  poweredByHeader: false,
  webpack: (config) => {
    if (config.optimization?.splitChunks?.cacheGroups) {
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        lucideIcons: {
          test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
          name: "commons",
          chunks: "all",
          priority: 30,
        },
      };
    }
    return config;
  },
};

export default nextConfig;
