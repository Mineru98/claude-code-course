# 인사/조직 관리 시스템 — 코어 플랫폼 설계

- **작성일:** 2026-06-12
- **하위 프로젝트:** 1단계 코어 플랫폼 (인증 + 직원 관리 + 조직 관리 + 권한/관리자)
- **상태:** 설계 승인 완료, 구현 플랜 작성 대기

## 1. 배경 및 범위

사내 인사/조직 관리 시스템 전체는 7개 시스템(직원 관리, 조직 관리, 휴가 신청, 근태 관리, 온보딩, 퇴사 프로세스, 관리자)으로 구성된 대형 프로젝트다. 단일 스펙으로 묶기에 너무 크므로 의존 관계에 따라 5개 하위 프로젝트로 분해하고, 각 하위 프로젝트는 독립적인 **스펙 → 플랜 → 구현** 사이클을 따른다.

### 분해 로드맵

| 단계 | 하위 프로젝트 | 포함 | 비고 |
| --- | --- | --- | --- |
| **1 (토대)** | **코어 플랫폼** | 인증, 직원 관리, 조직 관리, 권한/관리자 | 나머지 전부가 의존 — **본 문서의 범위** |
| 2 | 휴가 신청 | 휴가 잔여·신청·결재 | 직원/조직/결재 라인 필요 |
| 3 | 근태 관리 | 출퇴근·근무시간·집계 | 직원/조직 필요 |
| 4 | 온보딩 | 입사 체크리스트·태스크 | 직원 생성과 연동 |
| 5 | 퇴사 프로세스 | 오프보딩 체크리스트·계정 비활성화 | 직원/권한 연동 |

**본 문서는 1단계 코어 플랫폼만 다룬다.** 2~5단계는 이 토대 위에서 동일한 모듈 패턴으로 추가된다.

### 프로젝트 성격 (설계 전제)

- **실제 사내 운영 시스템** — 보안·권한·데이터 정합성·감사 추적을 진지하게 다룬다.
- **규모:** 소규모 (~50명). 과도한 인프라보다 빠른 구축·명확한 권한·낮은 유지보수 비용에 무게.
- **스택:** 웹 풀스택 단일 앱.

## 2. 아키텍처 & 모듈 구조

### 스택

- Next.js (App Router) + TypeScript
- PostgreSQL + Prisma ORM
- 인증: 자체 이메일+비밀번호, 세션 쿠키 기반
- 입력 검증: zod

### 구조 패턴: 모듈러 모놀리식 (접근 A)

하나의 Next.js 앱 안에서 기능별 모듈로 분리한다. 모듈 경계가 곧 하위 프로젝트 경계와 일치하므로, 분해 로드맵과 코드 구조가 1:1로 대응한다.

```
src/
  modules/
    auth/          # 로그인, 세션, 비밀번호 해싱·재설정
    employees/     # 직원 CRUD, 프로필, 상태(재직/휴직/퇴사)
    org/           # 부서 트리, 부서-직원 배치, 매니저 지정
    rbac/          # 역할, 권한, 역할-권한 매핑, 권한 검사
    admin/         # 관리자 대시보드(위 모듈을 가로질러 접근)
  lib/             # db 클라이언트, 공통 유틸, 에러 타입
  middleware.ts    # 세션 검증 + 권한 가드
```

### 모듈 규약 (확장의 핵심)

- 각 모듈은 `service.ts`(도메인 로직) + `schema.ts`(zod 검증) + 라우트(API/페이지)로 구성.
- 모듈 간 호출은 **서비스 함수를 통해서만** 한다. 다른 모듈의 DB 테이블을 직접 건드리지 않는다.
- 향후 `leave`, `attendance` 등은 이 패턴을 그대로 복제해 추가한다.

### 계층 흐름

```
요청 → middleware(세션·권한 가드) → 라우트 핸들러 → 모듈 service → Prisma → PostgreSQL
```

## 3. 데이터 모델

Prisma 스키마 개념도. 핵심 엔티티와 주요 필드.

### Employee (직원)

인증 주체이자 조직의 구성원.

- `id`, `email`(고유), `passwordHash`, `name`, `phone`, `jobTitle`(직책)
- `status`: `ACTIVE` | `ON_LEAVE` | `OFFBOARDED` — 삭제 대신 상태 전환(HR 데이터 보존)
- `departmentId` → 소속 부서(하나)
- `managerId` → 직속 매니저(자기참조, 선택)
- `hireDate`, `createdAt`, `updatedAt`

### Department (부서)

계층형 트리.

- `id`, `name`
- `parentId`(자기참조, 루트는 null)
- `managerId`(부서장, 선택)
- 트리 조회는 `parentId` 재귀로 처리.

### RBAC: Role / Permission / RolePermission / EmployeeRole

- `Role`: `id`, `name`(예: Admin/Manager/Employee), `description`
- `Permission`: `id`, `key`(예: `employee.read`, `employee.write`, `org.manage`, `rbac.manage`)
- `RolePermission`: Role ↔ Permission 다대다 매핑
- `EmployeeRole`: Employee ↔ Role 다대다 (한 직원이 여러 역할 가능)

### Session (세션)

- `id`, `employeeId`, `token`(해시), `expiresAt`, `createdAt`
- 쿠키의 세션 토큰과 대조.

### AuditLog (감사 로그)

누가·언제·무엇을 변경했는지 기록.

- `id`, `actorId`, `action`(예: `employee.update`), `targetType`, `targetId`, `metadata`(JSON), `createdAt`

### 설계 결정

- **소프트 삭제 원칙:** 직원/부서는 물리 삭제하지 않고 상태 전환·비활성으로 처리(퇴사 프로세스 연동 대비).
- **감사 로그:** 직원/조직/권한 변경은 모두 AuditLog에 기록(HR 시스템 필수 요건).

## 4. RBAC 권한 검사

### 기본 역할 & 권한 시드 (초기 데이터)

| 역할 | 부여 권한(key) |
| --- | --- |
| **Admin** | 전체 (`*`) — 모든 모듈 접근, 역할/권한 관리 |
| **Manager** | `employee.read`, `org.read`, 본인 팀 범위 `employee.update` (이후 휴가 승인 등 추가) |
| **Employee** | `self.read`, `self.update`(제한 필드), `org.read` |

### 권한 검사 2단계

1. **인증 가드 (middleware):** 세션 쿠키 → Session 조회 → 유효하면 `currentEmployee`를 요청 컨텍스트에 주입, 아니면 로그인으로 리다이렉트.
2. **인가 가드 (service 진입점):** `requirePermission(employee, 'employee.write')` 헬퍼가 직원의 역할→권한 집합을 모아 검사. 없으면 `ForbiddenError`.

### 범위(scope) 처리 — Manager의 "본인 팀만"

- 권한 검사 통과 후, service에서 **데이터 범위**를 추가 필터링.
- 예: Manager가 직원 목록을 조회하면 `where: { departmentId: in(관리하는 부서들) }` 적용.
- Admin은 범위 제한 없음(전역).
- 규칙: **권한(무엇을 할 수 있나) ≠ 범위(누구에게)** 를 분리. 권한은 RBAC가, 범위는 각 service가 결정.

### 권한 캐싱

- 직원의 권한 집합은 세션 동안 메모리 캐시(역할 변경 시 무효화) — 매 요청 DB 조회 방지.

## 5. 핵심 사용자 흐름

### 1) 로그인 / 세션

- 이메일+비밀번호 입력 → `passwordHash`를 bcrypt로 대조 → 성공 시 Session 생성, 세션 토큰을 HttpOnly·Secure 쿠키로 발급.
- 로그아웃 → Session 삭제 + 쿠키 만료.
- 비밀번호 재설정: Admin이 임시 비밀번호 발급 → 최초 로그인 시 변경 강제(소규모라 이메일 발송 인프라 없이 시작; 추후 메일 연동 가능).

### 2) 직원 관리 (Admin/Manager)

- **생성:** Admin이 직원 등록(이메일·이름·부서·직책·매니저·초기 역할) → 임시 비밀번호 발급 → AuditLog 기록.
- **조회/수정:** 권한+범위 가드 통과 후 프로필 수정. 본인은 제한 필드만 수정 가능.
- **상태 전환:** 재직→휴직→퇴사. 퇴사 전환은 향후 퇴사 프로세스 모듈의 진입점 — 계정 비활성 + 세션 무효화.

### 3) 조직 관리 (Admin)

- 부서 트리 CRUD: 부서 생성 시 `parentId` 지정, 하위 이동은 부서 `parentId` 변경.
- 부서장(`managerId`) 지정 → 해당 부서 직원들의 기본 매니저 범위에 반영.
- 직원을 부서에 배치/이동 → `departmentId` 변경 + AuditLog.

### 4) 관리자 대시보드 (Admin)

- 전 직원/부서/역할을 한 화면에서 관리, 감사 로그 열람.
- 모든 모듈을 가로지르는 진입점이지만, 데이터는 각 모듈 service를 통해서만 접근(직접 DB 접근 금지 규약 유지).

## 6. 에러 처리 & 횡단 관심사

### 에러 타입 (lib/errors.ts)

- `ValidationError`(400) · `AuthError`(401) · `ForbiddenError`(403) · `NotFoundError`(404) · `ConflictError`(409, 예: 이메일 중복)
- 모든 service는 이 타입만 던지고, 라우트 핸들러의 공통 래퍼가 HTTP 응답으로 변환 → 일관된 에러 응답 형식 `{ error: { code, message } }`.

### 입력 검증

- 모든 외부 입력은 모듈의 `schema.ts`(zod)로 라우트 진입 시 검증 → service는 검증된 데이터만 받는다.

### 보안 횡단

- 비밀번호: bcrypt 해싱, 평문 저장 금지.
- 세션 토큰: 해시 저장, HttpOnly·Secure·SameSite 쿠키.
- 모든 변경(쓰기) 작업: AuditLog 자동 기록(service 레이어에서).
- 민감 필드(passwordHash 등)는 API 응답에서 항상 제외(직렬화 화이트리스트).

### 트랜잭션

- 다중 테이블 변경(예: 직원 생성+역할 부여+감사 로그)은 Prisma `$transaction`으로 원자성 보장.

## 7. 테스트 전략

- **단위 테스트:** 각 모듈 service의 도메인 로직(권한 검사, 범위 필터, 상태 전환 규칙) — 비즈니스 규칙이 모인 곳이라 최우선.
- **통합 테스트:** 라우트 핸들러 + 실제 테스트 DB(권한 가드, 트랜잭션, 에러 변환 검증).
- **TDD 적용:** 구현 단계에서 각 기능은 테스트 먼저 작성.
- **시드 검증:** RBAC 기본 역할/권한 시드가 의도대로 깔리는지 테스트.

## 8. 범위 밖 (이번 단계 제외)

- 휴가/근태/온보딩/퇴사 모듈의 실제 기능 — 후속 하위 프로젝트에서 진행.
- 이메일 발송 인프라(비밀번호 재설정 메일 등) — 추후 연동.
- Google SSO 등 외부 인증 — 현재는 자체 인증만.
