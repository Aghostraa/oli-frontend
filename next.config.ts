import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@openlabels/oli-sdk'],
  images: {
    domains: ['api.growthepie.xyz'],
  },
};

export default nextConfig;
