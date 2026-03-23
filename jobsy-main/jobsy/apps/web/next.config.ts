import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@jobsy/types", "@jobsy/utils", "@jobsy/config"],
};

export default nextConfig;
