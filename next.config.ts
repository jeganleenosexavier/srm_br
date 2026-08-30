import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/**": ["./prisma/seed.db"],
    "/": ["./prisma/seed.db"],
  },
};

export default nextConfig;
