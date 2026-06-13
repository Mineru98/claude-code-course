# apps/api — Express REST API · 규칙

Express 4 · TypeScript · ESM(NodeNext) · 인메모리 스토어. Todo 도메인의 REST 엔드포인트를 제공한다.

> 이 파일이 컨텍스트에 로드됐다는 것은 지금 `apps/api` 를 만지고 있다는 뜻이다.
> 아래 가이드와 문서 끝에서 `@import` 되는 상세 규칙(SSOT)을 따른다.

## 새 파일을 만들기 전에 — 반드시 확인 (가장 중요)

규칙은 **파일이 READ 될 때만 적용**된다. 새 파일을 잘못된 위치·이름으로 만들면 라우팅/계층/에러 패턴이 어긋난다. 만들기 전에:

1. **무엇을 만드는가** → 아래 *배치 맵*에서 디렉토리와 파일명 패턴을 고른다.
2. **도메인 타입이 필요한가** → `apps/api` 안에 만들지 말고 **먼저 `packages/shared`** 에 정의한다.
3. **디자인 패턴을 적용한다**:
   - 라우트 핸들러는 **HTTP 경계만** (파싱·검증·상태코드). 비즈니스 로직은 **store/service** 로 위임.
   - 응답은 성공 `{ data }` / 실패 `{ error }` 봉투 + 규약 상태코드(201/204/400/404 …).
   - **상대 import 에는 `.js` 확장자**를 붙인다 (ESM/NodeNext). 타입은 `import type`.
4. 만든 뒤 루트에서 `npm run typecheck`.

## 배치 맵

| 만들 것 | 위치 | 파일명 패턴 |
|---|---|---|
| 라우터 (두 번째 리소스부터 분리) | `src/routes/` | `<resource>.routes.ts` |
| 스토어 / 서비스 | `src/` | `<resource>.store.ts` · `<resource>.service.ts` |
| 미들웨어 | `src/middleware/` | `errorHandler.ts`, `asyncHandler.ts` … |
| 앱 부트스트랩 | `src/` | `index.ts` |

> 성장 트리거: **두 번째 리소스를 추가하는 순간** `express.Router()` 로 라우트를 분리하고, **async 핸들러를 도입하는 순간** 중앙 에러 미들웨어를 도입한다. 자세한 패턴은 `express-api.md` 참조.

## 이 폴더에 자동 적용되는 상세 규칙 (SSOT)

아래 규칙은 `.claude/rules/` 에 있고, 각 파일의 `paths` frontmatter 가 `apps/api/**` 와 매칭되어 **이 폴더의 파일을 읽거나 만들 때 자동 로드**된다 (별도 `@import` 불필요):

- `monorepo.md` — 전 워크스페이스 공통 (언어·타입계약·응답봉투·검증)
- `naming.md` — 식별자·파일명·"새 파일" 체크리스트
- `express-api.md` — 이 폴더 상세 (ESM `.js` · 상태코드 · 라우트↔store 계층 · 에러)
