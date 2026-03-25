import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Keep Turbopack rooted on `app/` when a parent folder has another lockfile. */
  turbopack: {
    root: path.join(__dirname),
  },
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.fleetyards.net",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
