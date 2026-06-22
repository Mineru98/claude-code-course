import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 워크스페이스 내부 패키지(@todo/*)는 빌드 산출물 없이 TS 소스를
  // 그대로 가져오므로 Next 가 직접 트랜스파일하도록 지정한다.
  transpilePackages: ["@todo/types", "@todo/store"],
};

export default nextConfig;
