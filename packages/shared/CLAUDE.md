# packages/shared — 공유 타입 계약 · 규칙

api ↔ web 이 공유하는 **도메인 타입 계약**만 정의한다. `@todo/shared` 로 import 된다.

> 이 파일이 컨텍스트에 로드됐다는 것은 지금 `packages/shared` 를 만지고 있다는 뜻이다.
> 아래 가이드와 문서 끝에서 `@import` 되는 상세 규칙(SSOT)을 따른다.

## 타입을 추가·변경하기 전에 — 반드시 확인 (가장 중요)

이 패키지의 변경은 **api 와 web 양쪽에 즉시 파급**된다. 그것이 이 패키지의 존재 이유(계약 일치)다.

1. **순수 타입만** export — 인터페이스·타입 별칭만. 값·함수·클래스 등 런타임 코드는 두지 않는다 (빌드 없이 소스가 직접 소비됨).
2. **네이밍 계약**: 엔티티 `Todo`, 생성 입력 `Create<Entity>Input`, 수정 입력 `Update<Entity>Input`, 응답 래퍼 `ApiResponse<T>` / `ApiError`.
3. **파일 구조**: 현재는 `src/index.ts` 단일 barrel. **도메인이 둘 이상으로 늘면** `src/<domain>.ts` 로 분리하고 `index.ts` 는 재export(`export *`) 전용으로 둔다.
4. 변경 후 반드시 루트에서 `npm run typecheck` — api·web 사용처가 한 번에 검사된다. 파괴적 변경은 양쪽 사용처를 같은 변경 안에서 함께 고친다.

## 이 폴더에 자동 적용되는 상세 규칙 (SSOT)

아래 규칙은 `.claude/rules/` 에 있고, 각 파일의 `paths` frontmatter 가 `packages/shared/**` 와 매칭되어 **이 폴더의 파일을 읽거나 만들 때 자동 로드**된다 (별도 `@import` 불필요):

- `monorepo.md` — 전 워크스페이스 공통 (언어·타입계약·응답봉투·검증)
- `naming.md` — 식별자·파일명·"새 파일" 체크리스트
- `shared-types.md` — 이 폴더 상세 (순수 타입 · 네이밍 계약 · barrel 구조)
