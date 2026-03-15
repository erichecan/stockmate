import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  // 2026-03-14 22:39:xx 修复 Turbopack 从 monorepo 根解析导致 tw-animate-css 找不到
  turbopack: {
    root: path.resolve(__dirname),
  },
  // 2026-03-15 批发站无 dashboard，/dashboard 服务端重定向到首页，避免客户端重定向造成循环
  async redirects() {
    return [{ source: "/dashboard", destination: "/", permanent: false }];
  },
};

export default nextConfig;
