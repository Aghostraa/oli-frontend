import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@openlabels/sdk'],
  images: {
    domains: ['api.growthepie.xyz'],
  },
};

export default nextConfig;
