# Otherbridge

Otherside 보유자 도우미. 빌드 도구가 필요 없는 정적 사이트이고, Vercel에 배포합니다.

## 구조

| 파일 | 역할 |
|---|---|
| `index.html` | 페이지 뼈대 |
| `style.css` | 스타일 |
| `app.js` | 앱 로직 (데이터, 렌더링, 3D 뷰어) |
| `api/nft.js` | Alchemy NFT API 프록시 (API 키를 서버에만 둠) |
| `vercel.json` | `/api/nft/<method>` → 프록시 함수 연결 |
| `scripts/dev.js` | 로컬 개발 서버 (배포에는 포함되지 않음) |

## 로컬 실행

```bash
cp .env.example .env.local   # ALCHEMY_API_KEY 입력 (비워두면 공용 demo 키 사용)
npm run dev                  # http://localhost:3000
```

`index.html`을 더블클릭해서 열어도 동작합니다. 이 경우에는 프록시 없이 demo 키로 바로 호출합니다.

## 배포 (GitHub + Vercel)

1. 이 폴더를 GitHub 저장소로 push
2. vercel.com → Add New → Project → 저장소 Import (Framework Preset: **Other**, 설정은 기본값 그대로)
3. Project Settings → Environment Variables에 `ALCHEMY_API_KEY` 추가 후 Redeploy
4. 이후에는 `main`에 push하면 자동 배포, 다른 브랜치에 push하면 미리보기 URL 생성
