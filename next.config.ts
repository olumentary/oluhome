import type { NextConfig } from "next";

const linodeEndpoint = process.env.LINODE_ENDPOINT;
const linodeHostname = linodeEndpoint
  ? new URL(linodeEndpoint).hostname
  : undefined;

const nextConfig: NextConfig = {
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
