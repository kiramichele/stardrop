import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Yjs collab libs ship as ESM; transpiling them keeps a single yjs instance
  // and avoids "Yjs was already imported" bundling issues.
  transpilePackages: ["yjs", "y-monaco", "y-protocols"],
  experimental: {
    serverActions: {
      // Lesson HTML files (Rise360 exports especially) can be larger than the
      // 1MB default. Raise the limit so uploads don't fail silently.
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;