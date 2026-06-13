/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 모노레포의 공유 패키지(@todo/shared)를 Next 빌드 파이프라인에서 트랜스파일
  transpilePackages: ["@todo/shared"],
};

export default nextConfig;
