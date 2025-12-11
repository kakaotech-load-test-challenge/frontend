/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // 에러 처리 문제 해결을 위해 일시적으로 비활성화
  transpilePackages: ['@vapor-ui/core', '@vapor-ui/icons'],
  // CDN(S3+CloudFront) 배포를 위한 정적 내보내기 모드
  output: 'export',
  // S3 정적 호스팅을 위해 trailing slash 추가 (각 경로가 디렉토리/index.html로 생성됨)
  trailingSlash: true,
  // 이미지 최적화 비활성화 (S3 정적 호스팅에서는 서버 사이드 이미지 최적화 불가)
  images: {
    unoptimized: true,
  },
  // monorepo에서 standalone 빌드 시 중첩 경로 방지
  outputFileTracingRoot: __dirname,
  // 개발 환경에서의 에러 오버레이 설정
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right'
  },
  // 개발 환경에서만 더 자세한 에러 로깅
  ...(process.env.NODE_ENV === 'development' && {
    experimental: {
      forceSwcTransforms: true
    }
  })
};

module.exports = nextConfig;
