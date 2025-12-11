/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ['@vapor-ui/core', '@vapor-ui/icons'],
  output: 'export',
  
  // 👉 개발 환경에서는 /chat/ 자동 생성 방지
  trailingSlash: false,

  images: {
    unoptimized: true,
  },

  outputFileTracingRoot: __dirname,

  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right'
  },

  ...(false && {
    experimental: {
      forceSwcTransforms: true
    }
  })
};

module.exports = nextConfig;
