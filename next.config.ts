import type { NextConfig } from "next";

const linodeEndpoint = process.env.LINODE_ENDPOINT;
const linodeHostname = linodeEndpoint
  ? new URL(linodeEndpoint).hostname
  : undefined;

const nextConfig: NextConfig = {
  // Produce a self-contained server bundle at .next/standalone/ for Docker.
  // Ignored by `next start` during local dev on Vercel.
  output: 'standalone',
  images: {
    remotePatterns: linodeHostname
      ? [
          {
            protocol: 'https',
            hostname: linodeHostname,
          },
        ]
      : [],
  },
};

export default nextConfig;
