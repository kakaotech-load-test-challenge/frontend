# Frontend 배포 가이드

## 🚀 새로운 배포 워크플로우

### 개요
로컬에서 빌드한 결과물을 서버로 전송하고, 서버에서는 재시작만 하는 방식으로 배포합니다.

### 장점
- ✅ 서버 리소스 절약 (빌드를 로컬에서 수행)
- ✅ 빠른 배포 (서버에서 빌드 시간 제거)
- ✅ 서버에 전체 node_modules 불필요
- ✅ 롤백 용이 (빌드 결과물 보관 가능)

---

## 📋 배포 프로세스

### 1. 로컬에서 배포 실행
```bash
cd apps/frontend
make deploy
```

### 2. 자동으로 수행되는 작업

#### 로컬 (빌드 단계)
1. `npm run build:production` 실행
   - Next.js 빌드 수행
   - static 파일을 standalone 디렉토리로 복사
   - public 파일을 standalone 디렉토리로 복사

#### 서버로 전송 (배포 단계)
2. 빌드 결과물만 서버로 전송
   - `.next/standalone/` → 서버의 배포 디렉토리
   - `.next/static` → 서버의 `.next/static`
   - `public` → 서버의 `public`
   - `restart.sh` → 서버의 `restart.sh`

#### 서버 (재시작 단계)
3. 서버에서 `restart.sh` 실행
   - 기존 프로세스 종료
   - 새로운 standalone 서버 시작
   - 서버 시작 확인

---

## 🔧 사용 가능한 명령어

### 로컬 빌드만 수행
```bash
make build-local
```

### 전체 배포 (빌드 + 전송 + 재시작)
```bash
make deploy
```

### 특정 서버에만 배포
```bash
DEPLOY_SERVERS="ktb-fe01 ktb-fe02" make deploy
```

### 배포 경로 변경
```bash
DEPLOY_PATH=/custom/path make deploy
```

---

## 📁 배포되는 파일 구조

서버에 배포되는 디렉토리 구조:
```
/home/ubuntu/ktb-chat-frontend/
├── .next/
│   ├── static/          # 정적 리소스 (CSS, JS 등)
│   └── standalone/
│       └── server.js    # Next.js standalone 서버
├── public/              # 공개 정적 파일
├── node_modules/        # 최소한의 런타임 dependencies (standalone에 포함)
├── package.json         # 패키지 정보
├── restart.sh           # 서버 재시작 스크립트
└── app.log              # 서버 로그

```

---

## 🔍 트러블슈팅

### 배포 실패 시 체크리스트
1. SSH 접속 확인
   ```bash
   ssh ktb-fe01 "echo 'Connection OK'"
   ```

2. 서버 디스크 공간 확인
   ```bash
   ssh ktb-fe01 "df -h"
   ```

3. 서버 로그 확인
   ```bash
   ssh ktb-fe01 "cd /home/ubuntu/ktb-chat-frontend && tail -100 app.log"
   ```

### 서버에서 수동 재시작
```bash
ssh ktb-fe01
cd /home/ubuntu/ktb-chat-frontend
./restart.sh
```

### 서버 상태 확인
```bash
ssh ktb-fe01 "ps aux | grep 'node .next/standalone/server.js'"
```

---

## ☁️ CloudFront 설정 (정적 내보내기용)

### Custom Error Responses 설정

정적 내보내기(`output: 'export'`)를 사용하는 경우, CloudFront에서 403/404 에러를 `/index.html`로 폴백시켜서 SPA처럼 동작하도록 설정해야 합니다.

#### 설정 방법

1. **CloudFront 콘솔 접속**
   - AWS CloudFront 콘솔에서 해당 Distribution 선택

2. **Error Pages 탭으로 이동**
   - Distribution 상세 페이지에서 "Error Pages" 탭 클릭

3. **Custom Error Response 생성**
   - "Create Custom Error Response" 클릭
   - 다음 설정 적용:
     - **HTTP Error Code**: `403: Forbidden`
     - **Customize Error Response**: `Yes`
     - **Response Page Path**: `/index.html`
     - **HTTP Response Code**: `200: OK`
     - **Error Caching Minimum TTL**: `10` (초)

4. **404 에러도 동일하게 설정**
   - 다시 "Create Custom Error Response" 클릭
   - 다음 설정 적용:
     - **HTTP Error Code**: `404: Not Found`
     - **Customize Error Response**: `Yes`
     - **Response Page Path**: `/index.html`
     - **HTTP Response Code**: `200: OK`
     - **Error Caching Minimum TTL**: `10` (초)

#### 동작 원리

1. 사용자가 `/chat/123` 같은 동적 라우트에 직접 접근하거나 새로고침
2. CloudFront가 해당 경로의 파일을 찾지 못해 403/404 반환
3. Custom Error Response 설정에 따라 `/index.html`을 반환 (HTTP 200)
4. 브라우저가 `index.html`을 로드하면 Next.js 라우터가 클라이언트 사이드에서 `/chat/123` 경로를 처리
5. 결과적으로 정적 파일이 없어도 동적 라우트가 정상 작동

#### 주의사항

- **Response Code를 200으로 설정**: 403/404를 그대로 반환하면 브라우저가 에러 페이지로 인식할 수 있음
- **Error Caching Minimum TTL**: 너무 길게 설정하면 변경사항이 반영되지 않을 수 있음 (10초 권장)
- **배포 후 테스트**: 설정 후 `/chat/123` 같은 동적 라우트에 직접 접근하여 새로고침 시에도 정상 작동하는지 확인

---

## 📝 관련 파일

- `package.json`: 빌드 스크립트 정의
- `Makefile`: 배포 자동화 스크립트
- `restart.sh`: 서버 재시작 스크립트
- `next.config.js`: Next.js standalone 출력 설정
- `pages/_app.js`: 클라이언트 사이드 라우팅 처리
