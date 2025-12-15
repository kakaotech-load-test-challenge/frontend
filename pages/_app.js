import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { ThemeProvider } from '@vapor-ui/core';
import '@vapor-ui/core/styles.css';
import '../styles/globals.css';
import ChatHeader from '@/components/ChatHeader';
import ToastContainer from '@/components/Toast';
import { AuthProvider } from '@/contexts/AuthContext';

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  // CloudFront에서 403/404를 /index.html로 폴백시킨 경우,
  // 클라이언트 사이드 라우팅이 제대로 작동하도록 보장
  // 정적 내보내기에서는 동적 라우트([room].js 등)가 클라이언트 사이드에서 처리됨
  useEffect(() => {
    if (router.isReady) {
      // CloudFront 폴백으로 인해 index.html이 로드된 경우,
      // Next.js 라우터가 자동으로 현재 URL을 처리하도록 보장
      // 새로고침 시에도 라우터가 올바른 경로를 인식하도록 함
      // Next.js는 이미 클라이언트 사이드 라우팅을 지원하므로
      // 라우터가 준비되면 자동으로 현재 URL을 처리함
    }
  }, [router.isReady]);

  const isErrorPage = router.pathname === '/_error';
  if (isErrorPage) {
    return <Component {...pageProps} />;
  }

  // 로그인/회원가입 페이지에서는 헤더 숨김
  const showHeader = !['/', '/register'].includes(router.pathname);

  return (
    <ThemeProvider defaultTheme="dark">
      <AuthProvider>
        {showHeader && <ChatHeader />}
        <Component {...pageProps} />
        <ToastContainer />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default MyApp;