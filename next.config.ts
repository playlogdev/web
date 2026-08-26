import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CLAUDE.md is the rules source and AGENTS.md is its Git symlink pointer.
  // Prevent next dev from appending generated rules to that tracked file.
  agentRules: false,
  images: {
    // The API normalizes IGDB cover URLs to https://images.igdb.com/...; this
    // is the only remote image host the app is allowed to optimize.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.igdb.com",
        port: "",
        pathname: "/igdb/image/upload/**",
        search: "",
      },
    ],
  },
};

export default nextConfig;
