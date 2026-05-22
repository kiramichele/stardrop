import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Lesson HTML files (Rise360 exports especially) can be larger than the
      // 1MB default. Raise the limit so uploads don't fail silently.
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;