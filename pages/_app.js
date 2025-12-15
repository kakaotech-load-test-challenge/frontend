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
    if (typeof window === 'undefined') return;
    
    // 초기 로드 시 브라우저의 현재 URL 확인
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const currentHash = window.location.hash;
    const fullUrl = currentPath + currentSearch + currentHash;
    
    // CloudFront 폴백으로 index.html이 로드된 경우,
    // Next.js 라우터가 현재 URL을 인식하도록 보장
    // router.isReady가 false일 때는 라우터가 아직 초기화 중이므로 대기
    if (!router.isReady) {
      // 라우터가 준비되면 자동으로 현재 URL을 처리하지만,
      // 확실하게 하기 위해 라우터가 준비된 후 한 번 더 확인
      return;
    }
    
    // 라우터가 준비된 후, 실제 URL과 라우터가 인식한 경로가 다른지 확인
    const routerPath = router.asPath.split('?')[0].split('#')[0];
    
    // URL이 다르면 라우터를 실제 URL로 업데이트
    // 이는 CloudFront 폴백으로 index.html이 로드되었지만
    // Next.js 라우터가 아직 현재 URL을 인식하지 못한 경우를 처리
    if (currentPath !== routerPath) {
      // Next.js 라우터가 현재 URL을 인식하도록 replace
      // replace를 사용하면 히스토리에 남지 않음
      router.replace(fullUrl, undefined, { shallow: false });
    }
  }, [router.isReady, router]);

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
