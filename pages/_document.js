import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        <meta charSet="utf-8" />
        {/* CloudFront 폴백 시 클라이언트 사이드 라우팅 보장 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // CloudFront가 403/404를 /index.html로 폴백시킨 경우,
                // Next.js 라우터가 현재 URL을 인식하도록 보장
                if (typeof window !== 'undefined' && window.location.pathname !== '/') {
                  // Next.js는 기본적으로 클라이언트 사이드 라우팅을 지원하지만,
                  // 정적 내보내기 환경에서 CloudFront 폴백 시 명시적으로 처리
                  // 이 스크립트는 Next.js 라우터가 초기화되기 전에 실행됨
                  // Next.js 라우터가 자동으로 window.location을 읽어서 처리하므로
                  // 추가 작업은 필요 없지만, 확실하게 하기 위해 유지
                }
              })();
            `,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}