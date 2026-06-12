# 인사/조직 코어 플랫폼 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사내 인사/조직 관리 시스템의 토대인 코어 플랫폼(인증·직원·조직·RBAC/관리자)을 동작하는 웹 앱으로 구현한다.

**Architecture:** Next.js(App Router) 단일 앱의 모듈러 모놀리식. `src/modules/{auth,employees,org,rbac,admin}` 각각이 `service.ts`(도메인 로직) + `schema.ts`(zod) + 라우트로 구성되고, 모듈 간 호출은 service 함수로만 한다. 요청은 middleware(세션·권한 가드) → 라우트 핸들러 → service → Prisma → PostgreSQL 순으로 흐른다.

**Tech Stack:** Next.js 15 (App Router), TypeScript, PostgreSQL, Prisma, zod, bcryptjs, Vitest.

---

## 사전 준비 (구현 전 확인)

- 로컬에 PostgreSQL이 떠 있어야 한다. 개발 DB와 테스트 DB 두 개를 사용한다.
  - 개발: `postgresql://localhost:5432/hr_dev`
  - 테스트: `postgresql://localhost:5432/hr_test`
- Node 20+ 사용.

---

## File Structure

구현이 끝나면 아래 구조가 된다. 각 파일은 하나의 책임만 가진다.

```
prisma/
  schema.prisma              # 데이터 모델 (Employee, Department, Role, Permission, ...)
  seed.ts                    # RBAC 기본 역할/권한 + 최초 Admin 시드
src/
  lib/
    db.ts                    # PrismaClient 싱글턴
    errors.ts                # AppError 계열 에러 타입
    serialize.ts             # 민감 필드 제외 직렬화
  modules/
    auth/
      password.ts            # bcrypt 해싱/검증
      session.ts             # 세션 생성/검증/삭제
      service.ts             # login/logout 도메인 로직
      schema.ts              # 로그인 입력 zod 스키마
    rbac/
      permissions.ts         # 권한 집합 조회 + requirePermission
    audit/
      audit.ts               # logAudit 헬퍼
    employees/
      service.ts             # 직원 CRUD + 상태 전환 + 범위 필터
      schema.ts              # 직원 입력 zod 스키마
    org/
      service.ts             # 부서 트리 CRUD + 배치/매니저
      schema.ts              # 부서 입력 zod 스키마
  app/
    api/
      auth/login/route.ts    # POST 로그인
      auth/logout/route.ts   # POST 로그아웃
      employees/route.ts     # GET 목록 / POST 생성
      employees/[id]/route.ts# GET/PATCH 단건
      departments/route.ts   # GET 트리 / POST 생성
    login/page.tsx           # 로그인 화면
    admin/employees/page.tsx # 직원 목록 (관리자)
  middleware.ts              # 세션 검증 가드
  lib/route-handler.ts       # 에러→HTTP 변환 공통 래퍼
tests/
  setup.ts                   # 테스트 DB 초기화
  *.test.ts                  # 각 모듈 테스트
vitest.config.ts
```

---

## Task 1: 프로젝트 스캐폴딩

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `.env`, `.env.test`, `vitest.config.ts`, `.gitignore`(수정)

- [ ] **Step 1: Next.js + 의존성 설치**

```bash
npx create-next-app@latest . --typescript --app --no-tailwind --no-src-dir --eslint --import-alias "@/*" --use-npm --yes
npm install @prisma/client zod bcryptjs
npm install -D prisma vitest @vitejs/plugin-react vite-tsconfig-paths @types/bcryptjs tsx
npx prisma init --datasource-provider postgresql
```

> create-next-app이 `src/` 없이 생성하면, 이후 경로의 `src/`를 루트 기준으로 맞춘다. 본 플랜은 `src/` 디렉터리를 사용하므로, create 시 `--src-dir`가 필요하면 다음으로 대체 실행한다:
> `npx create-next-app@latest . --typescript --app --no-tailwind --src-dir --eslint --import-alias "@/*" --use-npm --yes`

- [ ] **Step 2: 환경 변수 파일 작성**

`.env`:
```
DATABASE_URL="postgresql://localhost:5432/hr_dev"
SESSION_TTL_HOURS=12
```

`.env.test`:
```
DATABASE_URL="postgresql://localhost:5432/hr_test"
SESSION_TTL_HOURS=12
```

- [ ] **Step 3: Vitest 설정**

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    fileParallelism: false, // 공유 테스트 DB 사용 → 직렬 실행
  },
})
```

- [ ] **Step 4: package.json 스크립트 추가**

`package.json`의 `"scripts"`에 추가:
```json
"db:migrate": "prisma migrate dev",
"db:seed": "tsx prisma/seed.ts",
"test": "dotenv -e .env.test -- vitest run",
"test:watch": "dotenv -e .env.test -- vitest"
```

`dotenv-cli` 설치:
```bash
npm install -D dotenv-cli
```

- [ ] **Step 5: .gitignore 확인**

`.gitignore`에 다음이 포함되어야 한다(없으면 추가):
```
node_modules
.next
.env
.env.test
```

- [ ] **Step 6: 빌드 동작 확인**

Run: `npm run build`
Expected: 에러 없이 빌드 성공.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: Next.js + Prisma + Vitest 스캐폴딩"
```

---

## Task 2: Prisma 스키마 & 마이그레이션

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/db.ts`

- [ ] **Step 1: 스키마 작성**

`prisma/schema.prisma` (generator/datasource 블록 아래 모델 전체 교체):
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum EmployeeStatus {
  ACTIVE
  ON_LEAVE
  OFFBOARDED
}

model Employee {
  id              String         @id @default(cuid())
  email           String         @unique
  passwordHash    String
  name            String
  phone           String?
  jobTitle        String?
  status          EmployeeStatus @default(ACTIVE)
  mustChangePassword Boolean     @default(true)
  departmentId    String?
  department      Department?    @relation("DeptMembers", fields: [departmentId], references: [id])
  managerId       String?
  manager         Employee?      @relation("EmployeeManager", fields: [managerId], references: [id])
  reports         Employee[]     @relation("EmployeeManager")
  hireDate        DateTime?
  roles           EmployeeRole[]
  sessions        Session[]
  managedDepts    Department[]   @relation("DeptManager")
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
}

model Department {
  id        String       @id @default(cuid())
  name      String
  parentId  String?
  parent    Department?  @relation("DeptTree", fields: [parentId], references: [id])
  children  Department[] @relation("DeptTree")
  managerId String?
  manager   Employee?    @relation("DeptManager", fields: [managerId], references: [id])
  members   Employee[]   @relation("DeptMembers")
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
}

model Role {
  id          String           @id @default(cuid())
  name        String           @unique
  description String?
  permissions RolePermission[]
  employees   EmployeeRole[]
}

model Permission {
  id    String           @id @default(cuid())
  key   String           @unique
  roles RolePermission[]
}

model RolePermission {
  roleId       String
  role         Role       @relation(fields: [roleId], references: [id])
  permissionId String
  permission   Permission @relation(fields: [permissionId], references: [id])

  @@id([roleId, permissionId])
}

model EmployeeRole {
  employeeId String
  employee   Employee @relation(fields: [employeeId], references: [id])
  roleId     String
  role       Role     @relation(fields: [roleId], references: [id])

  @@id([employeeId, roleId])
}

model Session {
  id         String   @id @default(cuid())
  employeeId String
  employee   Employee @relation(fields: [employeeId], references: [id])
  tokenHash  String   @unique
  expiresAt  DateTime
  createdAt  DateTime @default(now())
}

model AuditLog {
  id         String   @id @default(cuid())
  actorId    String
  action     String
  targetType String
  targetId   String
  metadata   Json?
  createdAt  DateTime @default(now())
}
```

- [ ] **Step 2: 마이그레이션 실행 (개발 DB)**

Run: `npm run db:migrate -- --name init`
Expected: `prisma/migrations/` 생성, "Your database is now in sync" 출력.

- [ ] **Step 3: 테스트 DB에도 스키마 반영**

Run: `dotenv -e .env.test -- npx prisma migrate deploy`
Expected: 테스트 DB에 마이그레이션 적용 완료.

- [ ] **Step 4: PrismaClient 싱글턴 작성**

`src/lib/db.ts`:
```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(db): Prisma 스키마 및 초기 마이그레이션"
```

---

## Task 3: 에러 타입 (lib/errors.ts)

**Files:**
- Create: `src/lib/errors.ts`
- Test: `tests/errors.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/errors.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { AppError, ValidationError, ConflictError, ForbiddenError } from '@/lib/errors'

describe('errors', () => {
  it('ValidationError는 status 400과 code를 가진다', () => {
    const e = new ValidationError('잘못된 입력')
    expect(e).toBeInstanceOf(AppError)
    expect(e.statusCode).toBe(400)
    expect(e.code).toBe('VALIDATION')
    expect(e.message).toBe('잘못된 입력')
  })

  it('ConflictError는 409', () => {
    expect(new ConflictError('중복').statusCode).toBe(409)
  })

  it('ForbiddenError는 403', () => {
    expect(new ForbiddenError('권한 없음').statusCode).toBe(403)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- errors`
Expected: FAIL — `@/lib/errors` 모듈 없음.

- [ ] **Step 3: 최소 구현**

`src/lib/errors.ts`:
```ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = new.target.name
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION', 400, message)
  }
}
export class AuthError extends AppError {
  constructor(message: string) {
    super('AUTH', 401, message)
  }
}
export class ForbiddenError extends AppError {
  constructor(message: string) {
    super('FORBIDDEN', 403, message)
  }
}
export class NotFoundError extends AppError {
  constructor(message: string) {
    super('NOT_FOUND', 404, message)
  }
}
export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', 409, message)
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- errors`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(lib): AppError 계열 에러 타입"
```

---

## Task 4: 테스트 DB 초기화 setup

**Files:**
- Create: `tests/setup.ts`, `tests/helpers.ts`

- [ ] **Step 1: setup 작성 (각 테스트 전 테이블 비우기)**

`tests/setup.ts`:
```ts
import { beforeEach, afterAll } from 'vitest'
import { prisma } from '@/lib/db'

beforeEach(async () => {
  // 의존 순서 역순으로 삭제
  await prisma.auditLog.deleteMany()
  await prisma.session.deleteMany()
  await prisma.employeeRole.deleteMany()
  await prisma.rolePermission.deleteMany()
  await prisma.permission.deleteMany()
  await prisma.role.deleteMany()
  // 자기참조(manager/parent) 때문에 먼저 FK 해제
  await prisma.employee.updateMany({ data: { managerId: null, departmentId: null } })
  await prisma.department.updateMany({ data: { parentId: null, managerId: null } })
  await prisma.department.deleteMany()
  await prisma.employee.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})
```

- [ ] **Step 2: 공통 테스트 헬퍼 작성**

`tests/helpers.ts`:
```ts
import { prisma } from '@/lib/db'

export async function makeEmployee(overrides: Partial<{
  email: string; name: string; departmentId: string | null; managerId: string | null
}> = {}) {
  return prisma.employee.create({
    data: {
      email: overrides.email ?? `u${Math.floor(performance.now() * 1000)}@co.com`,
      passwordHash: 'x',
      name: overrides.name ?? '홍길동',
      departmentId: overrides.departmentId ?? null,
      managerId: overrides.managerId ?? null,
    },
  })
}
```

> `performance.now()`는 테스트 런타임에서 고유 이메일 생성용. 충돌 시 `email`을 명시 전달.

- [ ] **Step 3: setup이 깨지지 않는지 빈 테스트로 확인**

`tests/smoke.test.ts` (임시):
```ts
import { it, expect } from 'vitest'
import { prisma } from '@/lib/db'

it('테스트 DB 연결 및 초기화 동작', async () => {
  const count = await prisma.employee.count()
  expect(count).toBe(0)
})
```

Run: `npm test -- smoke`
Expected: PASS.

- [ ] **Step 4: 임시 smoke 테스트 삭제 후 Commit**

```bash
rm tests/smoke.test.ts
git add -A
git commit -m "test: 테스트 DB 초기화 setup 및 헬퍼"
```

---

## Task 5: 비밀번호 해싱 (auth/password.ts)

**Files:**
- Create: `src/modules/auth/password.ts`
- Test: `tests/password.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/password.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '@/modules/auth/password'

describe('password', () => {
  it('해시는 평문과 다르고 검증에 성공한다', async () => {
    const hash = await hashPassword('secret123')
    expect(hash).not.toBe('secret123')
    expect(await verifyPassword('secret123', hash)).toBe(true)
  })

  it('틀린 비밀번호는 검증 실패', async () => {
    const hash = await hashPassword('secret123')
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- password`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 최소 구현**

`src/modules/auth/password.ts`:
```ts
import bcrypt from 'bcryptjs'

const ROUNDS = 10

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS)
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- password`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): bcrypt 비밀번호 해싱"
```

---

## Task 6: 세션 (auth/session.ts)

**Files:**
- Create: `src/modules/auth/session.ts`
- Test: `tests/session.test.ts`

세션 토큰은 랜덤 생성 후 평문은 쿠키로 반환, DB에는 sha256 해시만 저장한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/session.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { createSession, validateSession, destroySession } from '@/modules/auth/session'
import { makeEmployee } from './helpers'

describe('session', () => {
  it('생성한 세션 토큰으로 직원을 검증한다', async () => {
    const emp = await makeEmployee()
    const { token } = await createSession(emp.id)
    const found = await validateSession(token)
    expect(found?.id).toBe(emp.id)
  })

  it('잘못된 토큰은 null', async () => {
    expect(await validateSession('nope')).toBeNull()
  })

  it('삭제된 세션은 검증 실패', async () => {
    const emp = await makeEmployee()
    const { token } = await createSession(emp.id)
    await destroySession(token)
    expect(await validateSession(token)).toBeNull()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- session`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 최소 구현**

`src/modules/auth/session.ts`:
```ts
import { randomBytes, createHash } from 'crypto'
import type { Employee } from '@prisma/client'
import { prisma } from '@/lib/db'

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function ttlMs(): number {
  const hours = Number(process.env.SESSION_TTL_HOURS ?? '12')
  return hours * 60 * 60 * 1000
}

export async function createSession(employeeId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + ttlMs())
  await prisma.session.create({
    data: { employeeId, tokenHash: hashToken(token), expiresAt },
  })
  return { token, expiresAt }
}

export async function validateSession(token: string): Promise<Employee | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { employee: true },
  })
  if (!session) return null
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } })
    return null
  }
  return session.employee
}

export async function destroySession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } })
}

export async function destroyAllSessions(employeeId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { employeeId } })
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- session`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): 세션 생성/검증/삭제"
```

---

## Task 7: RBAC 시드 (prisma/seed.ts)

**Files:**
- Create: `prisma/seed.ts`
- Test: `tests/seed.test.ts`

시드는 기본 역할(Admin/Manager/Employee) + 권한 + 매핑 + 최초 Admin 계정을 멱등하게 생성한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/seed.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { seedRbac } from '@/../prisma/seed'
import { prisma } from '@/lib/db'

describe('seedRbac', () => {
  it('기본 역할 3개와 권한을 생성한다', async () => {
    await seedRbac()
    const roles = await prisma.role.findMany()
    expect(roles.map(r => r.name).sort()).toEqual(['Admin', 'Employee', 'Manager'])

    const admin = await prisma.role.findUnique({
      where: { name: 'Admin' },
      include: { permissions: { include: { permission: true } } },
    })
    const keys = admin!.permissions.map(p => p.permission.key)
    expect(keys).toContain('*')
  })

  it('멱등하다 - 두 번 실행해도 역할이 중복되지 않는다', async () => {
    await seedRbac()
    await seedRbac()
    expect(await prisma.role.count()).toBe(3)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- seed`
Expected: FAIL — `seedRbac` 없음.

- [ ] **Step 3: 최소 구현**

`prisma/seed.ts`:
```ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const PERMISSIONS = ['*', 'employee.read', 'employee.write', 'org.read', 'org.manage', 'rbac.manage', 'self.read', 'self.update']

const ROLE_PERMISSIONS: Record<string, string[]> = {
  Admin: ['*'],
  Manager: ['employee.read', 'employee.write', 'org.read'],
  Employee: ['self.read', 'self.update', 'org.read'],
}

export async function seedRbac() {
  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({ where: { key }, create: { key }, update: {} })
  }
  for (const [roleName, keys] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      create: { name: roleName },
      update: {},
    })
    for (const key of keys) {
      const perm = await prisma.permission.findUniqueOrThrow({ where: { key } })
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        create: { roleId: role.id, permissionId: perm.id },
        update: {},
      })
    }
  }
}

if (require.main === module) {
  seedRbac()
    .then(() => console.log('RBAC seeded'))
    .finally(() => prisma.$disconnect())
}
```

> 참고: Manager의 "본인 팀 범위" 제한은 권한 키가 아니라 service의 범위 필터(Task 11)에서 처리한다. 시드는 권한만 부여한다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- seed`
Expected: PASS (2 passed).

- [ ] **Step 5: 개발 DB에도 시드 적용**

Run: `npm run db:seed`
Expected: "RBAC seeded" 출력.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(rbac): 기본 역할/권한 시드"
```

---

## Task 8: 권한 검사 (rbac/permissions.ts)

**Files:**
- Create: `src/modules/rbac/permissions.ts`
- Test: `tests/permissions.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/permissions.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { getPermissionKeys, requirePermission, hasPermission } from '@/modules/rbac/permissions'
import { seedRbac } from '@/../prisma/seed'
import { prisma } from '@/lib/db'
import { makeEmployee } from './helpers'
import { ForbiddenError } from '@/lib/errors'

async function assignRole(employeeId: string, roleName: string) {
  const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } })
  await prisma.employeeRole.create({ data: { employeeId, roleId: role.id } })
}

describe('permissions', () => {
  it('Admin은 와일드카드 권한을 가진다', async () => {
    await seedRbac()
    const emp = await makeEmployee()
    await assignRole(emp.id, 'Admin')
    const keys = await getPermissionKeys(emp.id)
    expect(keys.has('*')).toBe(true)
    expect(await hasPermission(emp.id, 'employee.write')).toBe(true) // * 가 모두 허용
  })

  it('Employee는 employee.write 권한이 없다', async () => {
    await seedRbac()
    const emp = await makeEmployee()
    await assignRole(emp.id, 'Employee')
    expect(await hasPermission(emp.id, 'employee.write')).toBe(false)
  })

  it('requirePermission은 권한 없으면 ForbiddenError', async () => {
    await seedRbac()
    const emp = await makeEmployee()
    await assignRole(emp.id, 'Employee')
    await expect(requirePermission(emp.id, 'employee.write')).rejects.toBeInstanceOf(ForbiddenError)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- permissions`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 최소 구현**

`src/modules/rbac/permissions.ts`:
```ts
import { prisma } from '@/lib/db'
import { ForbiddenError } from '@/lib/errors'

export async function getPermissionKeys(employeeId: string): Promise<Set<string>> {
  const rows = await prisma.employeeRole.findMany({
    where: { employeeId },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  })
  const keys = new Set<string>()
  for (const er of rows) {
    for (const rp of er.role.permissions) keys.add(rp.permission.key)
  }
  return keys
}

export async function hasPermission(employeeId: string, key: string): Promise<boolean> {
  const keys = await getPermissionKeys(employeeId)
  return keys.has('*') || keys.has(key)
}

export async function requirePermission(employeeId: string, key: string): Promise<void> {
  if (!(await hasPermission(employeeId, key))) {
    throw new ForbiddenError(`권한이 없습니다: ${key}`)
  }
}

export async function isAdmin(employeeId: string): Promise<boolean> {
  const keys = await getPermissionKeys(employeeId)
  return keys.has('*')
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- permissions`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(rbac): 권한 집합 조회 및 requirePermission"
```

---

## Task 9: 감사 로그 헬퍼 (audit/audit.ts)

**Files:**
- Create: `src/modules/audit/audit.ts`
- Test: `tests/audit.test.ts`

`logAudit`는 트랜잭션 클라이언트를 받아 같은 트랜잭션 안에서 기록할 수 있어야 한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/audit.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { logAudit } from '@/modules/audit/audit'
import { prisma } from '@/lib/db'

describe('audit', () => {
  it('감사 로그를 기록한다', async () => {
    await logAudit(prisma, {
      actorId: 'actor1',
      action: 'employee.update',
      targetType: 'Employee',
      targetId: 'emp1',
      metadata: { field: 'name' },
    })
    const logs = await prisma.auditLog.findMany()
    expect(logs).toHaveLength(1)
    expect(logs[0].action).toBe('employee.update')
    expect(logs[0].targetId).toBe('emp1')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- audit`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 최소 구현**

`src/modules/audit/audit.ts`:
```ts
import type { Prisma, PrismaClient } from '@prisma/client'

type Db = PrismaClient | Prisma.TransactionClient

export interface AuditInput {
  actorId: string
  action: string
  targetType: string
  targetId: string
  metadata?: Prisma.InputJsonValue
}

export async function logAudit(db: Db, input: AuditInput): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata,
    },
  })
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- audit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(audit): 감사 로그 헬퍼"
```

---

## Task 10: 직원 입력 스키마 (employees/schema.ts)

**Files:**
- Create: `src/modules/employees/schema.ts`
- Test: `tests/employee-schema.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/employee-schema.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { createEmployeeSchema, updateEmployeeSchema } from '@/modules/employees/schema'

describe('employee schema', () => {
  it('유효한 생성 입력을 통과시킨다', () => {
    const r = createEmployeeSchema.safeParse({
      email: 'a@co.com', name: '김철수', jobTitle: '개발자',
    })
    expect(r.success).toBe(true)
  })

  it('이메일 형식이 틀리면 실패', () => {
    const r = createEmployeeSchema.safeParse({ email: 'bad', name: '김철수' })
    expect(r.success).toBe(false)
  })

  it('수정 입력은 부분 필드를 허용한다', () => {
    const r = updateEmployeeSchema.safeParse({ phone: '010-0000-0000' })
    expect(r.success).toBe(true)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- employee-schema`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 최소 구현**

`src/modules/employees/schema.ts`:
```ts
import { z } from 'zod'

export const createEmployeeSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  departmentId: z.string().optional(),
  managerId: z.string().optional(),
  roleNames: z.array(z.string()).optional(),
})

export const updateEmployeeSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  departmentId: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
})

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- employee-schema`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(employees): 직원 입력 zod 스키마"
```

---

## Task 11: 직원 service — 생성/조회/수정/상태전환 (employees/service.ts)

**Files:**
- Create: `src/modules/employees/service.ts`
- Test: `tests/employee-service.test.ts`

생성은 트랜잭션으로 (직원 + 역할 부여 + 감사 로그)를 원자적으로 처리하고 임시 비밀번호를 반환한다. 조회는 actor의 권한·범위에 따라 필터링한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/employee-service.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { createEmployee, listEmployees, updateEmployee, transitionStatus } from '@/modules/employees/service'
import { seedRbac } from '@/../prisma/seed'
import { prisma } from '@/lib/db'
import { makeEmployee } from './helpers'
import { ForbiddenError } from '@/lib/errors'

async function makeAdmin() {
  await seedRbac()
  const admin = await makeEmployee({ email: 'admin@co.com' })
  const role = await prisma.role.findUniqueOrThrow({ where: { name: 'Admin' } })
  await prisma.employeeRole.create({ data: { employeeId: admin.id, roleId: role.id } })
  return admin
}

async function makeManager(deptId: string) {
  const role = await prisma.role.findUniqueOrThrow({ where: { name: 'Manager' } })
  const mgr = await makeEmployee({ email: `mgr${Date.now()}@co.com`, departmentId: deptId })
  await prisma.employeeRole.create({ data: { employeeId: mgr.id, roleId: role.id } })
  return mgr
}

describe('employee service', () => {
  it('Admin이 직원을 생성하면 임시 비밀번호 반환 + 감사 로그 기록', async () => {
    const admin = await makeAdmin()
    const { employee, tempPassword } = await createEmployee(admin.id, {
      email: 'new@co.com', name: '신입',
    })
    expect(employee.email).toBe('new@co.com')
    expect(tempPassword).toHaveLength(12)
    const logs = await prisma.auditLog.findMany({ where: { action: 'employee.create' } })
    expect(logs).toHaveLength(1)
  })

  it('중복 이메일은 ConflictError', async () => {
    const admin = await makeAdmin()
    await createEmployee(admin.id, { email: 'dup@co.com', name: 'A' })
    await expect(createEmployee(admin.id, { email: 'dup@co.com', name: 'B' }))
      .rejects.toThrowError(/이미/)
  })

  it('권한 없는 직원이 생성하면 ForbiddenError', async () => {
    await seedRbac()
    const emp = await makeEmployee()
    const role = await prisma.role.findUniqueOrThrow({ where: { name: 'Employee' } })
    await prisma.employeeRole.create({ data: { employeeId: emp.id, roleId: role.id } })
    await expect(createEmployee(emp.id, { email: 'x@co.com', name: 'X' }))
      .rejects.toBeInstanceOf(ForbiddenError)
  })

  it('Admin은 전체 직원을 조회한다', async () => {
    const admin = await makeAdmin()
    await makeEmployee({ email: 'e1@co.com' })
    await makeEmployee({ email: 'e2@co.com' })
    const list = await listEmployees(admin.id)
    expect(list.length).toBeGreaterThanOrEqual(3) // admin + 2
  })

  it('Manager는 본인 부서 직원만 조회한다', async () => {
    await makeAdmin()
    const dept = await prisma.department.create({ data: { name: '개발팀' } })
    const otherDept = await prisma.department.create({ data: { name: '영업팀' } })
    const mgr = await makeManager(dept.id)
    await prisma.department.update({ where: { id: dept.id }, data: { managerId: mgr.id } })
    await makeEmployee({ email: 'in@co.com', departmentId: dept.id })
    await makeEmployee({ email: 'out@co.com', departmentId: otherDept.id })

    const list = await listEmployees(mgr.id)
    const emails = list.map(e => e.email)
    expect(emails).toContain('in@co.com')
    expect(emails).not.toContain('out@co.com')
  })

  it('상태 전환 OFFBOARDED 시 세션이 무효화된다', async () => {
    const admin = await makeAdmin()
    const target = await makeEmployee({ email: 't@co.com' })
    await prisma.session.create({
      data: { employeeId: target.id, tokenHash: 'h', expiresAt: new Date(Date.now() + 100000) },
    })
    await transitionStatus(admin.id, target.id, 'OFFBOARDED')
    const updated = await prisma.employee.findUnique({ where: { id: target.id } })
    expect(updated?.status).toBe('OFFBOARDED')
    expect(await prisma.session.count({ where: { employeeId: target.id } })).toBe(0)
  })

  it('수정은 감사 로그를 남긴다', async () => {
    const admin = await makeAdmin()
    const target = await makeEmployee({ email: 'u@co.com' })
    await updateEmployee(admin.id, target.id, { jobTitle: '팀장' })
    const updated = await prisma.employee.findUnique({ where: { id: target.id } })
    expect(updated?.jobTitle).toBe('팀장')
    expect(await prisma.auditLog.count({ where: { action: 'employee.update' } })).toBe(1)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- employee-service`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 최소 구현**

`src/modules/employees/service.ts`:
```ts
import { randomBytes } from 'crypto'
import type { Employee, EmployeeStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/modules/auth/password'
import { requirePermission, isAdmin } from '@/modules/rbac/permissions'
import { destroyAllSessions } from '@/modules/auth/session'
import { logAudit } from '@/modules/audit/audit'
import { ConflictError, NotFoundError } from '@/lib/errors'
import type { CreateEmployeeInput, UpdateEmployeeInput } from './schema'

function genTempPassword(): string {
  return randomBytes(6).toString('hex') // 12자
}

/** actor가 매니저로 지정된 부서 id 목록 (범위 계산용) */
async function managedDepartmentIds(actorId: string): Promise<string[]> {
  const depts = await prisma.department.findMany({
    where: { managerId: actorId },
    select: { id: true },
  })
  return depts.map(d => d.id)
}

export async function createEmployee(actorId: string, input: CreateEmployeeInput) {
  await requirePermission(actorId, 'employee.write')

  const existing = await prisma.employee.findUnique({ where: { email: input.email } })
  if (existing) throw new ConflictError('이미 존재하는 이메일입니다.')

  const tempPassword = genTempPassword()
  const passwordHash = await hashPassword(tempPassword)

  const employee = await prisma.$transaction(async (tx) => {
    const emp = await tx.employee.create({
      data: {
        email: input.email,
        name: input.name,
        phone: input.phone,
        jobTitle: input.jobTitle,
        departmentId: input.departmentId,
        managerId: input.managerId,
        passwordHash,
        mustChangePassword: true,
      },
    })
    if (input.roleNames?.length) {
      const roles = await tx.role.findMany({ where: { name: { in: input.roleNames } } })
      for (const role of roles) {
        await tx.employeeRole.create({ data: { employeeId: emp.id, roleId: role.id } })
      }
    }
    await logAudit(tx, {
      actorId, action: 'employee.create', targetType: 'Employee', targetId: emp.id,
      metadata: { email: emp.email },
    })
    return emp
  })

  return { employee, tempPassword }
}

export async function listEmployees(actorId: string): Promise<Employee[]> {
  await requirePermission(actorId, 'employee.read')
  if (await isAdmin(actorId)) {
    return prisma.employee.findMany({ orderBy: { createdAt: 'asc' } })
  }
  // 범위: 본인이 부서장인 부서 소속 직원만
  const deptIds = await managedDepartmentIds(actorId)
  return prisma.employee.findMany({
    where: { departmentId: { in: deptIds } },
    orderBy: { createdAt: 'asc' },
  })
}

export async function updateEmployee(actorId: string, targetId: string, input: UpdateEmployeeInput): Promise<Employee> {
  await requirePermission(actorId, 'employee.write')
  const target = await prisma.employee.findUnique({ where: { id: targetId } })
  if (!target) throw new NotFoundError('직원을 찾을 수 없습니다.')

  return prisma.$transaction(async (tx) => {
    const updated = await tx.employee.update({ where: { id: targetId }, data: input })
    await logAudit(tx, {
      actorId, action: 'employee.update', targetType: 'Employee', targetId,
      metadata: { fields: Object.keys(input) },
    })
    return updated
  })
}

export async function transitionStatus(actorId: string, targetId: string, status: EmployeeStatus): Promise<Employee> {
  await requirePermission(actorId, 'employee.write')
  const target = await prisma.employee.findUnique({ where: { id: targetId } })
  if (!target) throw new NotFoundError('직원을 찾을 수 없습니다.')

  const updated = await prisma.$transaction(async (tx) => {
    const emp = await tx.employee.update({ where: { id: targetId }, data: { status } })
    await logAudit(tx, {
      actorId, action: 'employee.status', targetType: 'Employee', targetId,
      metadata: { status },
    })
    return emp
  })

  if (status === 'OFFBOARDED') {
    await destroyAllSessions(targetId)
  }
  return updated
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- employee-service`
Expected: PASS (7 passed).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(employees): 직원 생성/조회/수정/상태전환 service"
```

---

## Task 12: 부서 입력 스키마 (org/schema.ts)

**Files:**
- Create: `src/modules/org/schema.ts`
- Test: `tests/org-schema.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/org-schema.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { createDepartmentSchema, moveDepartmentSchema } from '@/modules/org/schema'

describe('org schema', () => {
  it('부서 생성은 이름이 필수', () => {
    expect(createDepartmentSchema.safeParse({ name: '개발팀' }).success).toBe(true)
    expect(createDepartmentSchema.safeParse({ name: '' }).success).toBe(false)
  })

  it('이동은 parentId를 받는다(null 허용)', () => {
    expect(moveDepartmentSchema.safeParse({ parentId: null }).success).toBe(true)
    expect(moveDepartmentSchema.safeParse({ parentId: 'abc' }).success).toBe(true)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- org-schema`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 최소 구현**

`src/modules/org/schema.ts`:
```ts
import { z } from 'zod'

export const createDepartmentSchema = z.object({
  name: z.string().min(1),
  parentId: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
})

export const moveDepartmentSchema = z.object({
  parentId: z.string().nullable(),
})

export const assignEmployeeSchema = z.object({
  employeeId: z.string(),
  departmentId: z.string().nullable(),
})

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- org-schema`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(org): 부서 입력 zod 스키마"
```

---

## Task 13: 조직 service — 부서 트리/배치/매니저 (org/service.ts)

**Files:**
- Create: `src/modules/org/service.ts`
- Test: `tests/org-service.test.ts`

부서는 `org.manage` 권한으로 관리하고, 트리 조회는 `org.read`로 한다. 순환 부모 지정은 막는다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/org-service.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { createDepartment, getDepartmentTree, moveDepartment, assignEmployee, setDepartmentManager } from '@/modules/org/service'
import { seedRbac } from '@/../prisma/seed'
import { prisma } from '@/lib/db'
import { makeEmployee } from './helpers'
import { ValidationError } from '@/lib/errors'

async function makeAdmin() {
  await seedRbac()
  const admin = await makeEmployee({ email: 'admin@co.com' })
  const role = await prisma.role.findUniqueOrThrow({ where: { name: 'Admin' } })
  await prisma.employeeRole.create({ data: { employeeId: admin.id, roleId: role.id } })
  return admin
}

describe('org service', () => {
  it('부서를 생성하고 트리로 조회한다', async () => {
    const admin = await makeAdmin()
    const root = await createDepartment(admin.id, { name: '본사' })
    await createDepartment(admin.id, { name: '개발팀', parentId: root.id })
    const tree = await getDepartmentTree(admin.id)
    expect(tree).toHaveLength(1)
    expect(tree[0].name).toBe('본사')
    expect(tree[0].children[0].name).toBe('개발팀')
  })

  it('부서를 다른 부모로 이동한다', async () => {
    const admin = await makeAdmin()
    const a = await createDepartment(admin.id, { name: 'A' })
    const b = await createDepartment(admin.id, { name: 'B' })
    await moveDepartment(admin.id, b.id, a.id)
    const moved = await prisma.department.findUnique({ where: { id: b.id } })
    expect(moved?.parentId).toBe(a.id)
  })

  it('자기 자신을 부모로 지정하면 ValidationError', async () => {
    const admin = await makeAdmin()
    const a = await createDepartment(admin.id, { name: 'A' })
    await expect(moveDepartment(admin.id, a.id, a.id)).rejects.toBeInstanceOf(ValidationError)
  })

  it('후손을 부모로 지정하면 ValidationError(순환 방지)', async () => {
    const admin = await makeAdmin()
    const a = await createDepartment(admin.id, { name: 'A' })
    const b = await createDepartment(admin.id, { name: 'B', parentId: a.id })
    await expect(moveDepartment(admin.id, a.id, b.id)).rejects.toBeInstanceOf(ValidationError)
  })

  it('직원을 부서에 배치한다', async () => {
    const admin = await makeAdmin()
    const dept = await createDepartment(admin.id, { name: '개발팀' })
    const emp = await makeEmployee({ email: 'e@co.com' })
    await assignEmployee(admin.id, emp.id, dept.id)
    const updated = await prisma.employee.findUnique({ where: { id: emp.id } })
    expect(updated?.departmentId).toBe(dept.id)
  })

  it('부서장을 지정한다', async () => {
    const admin = await makeAdmin()
    const dept = await createDepartment(admin.id, { name: '개발팀' })
    const mgr = await makeEmployee({ email: 'm@co.com' })
    await setDepartmentManager(admin.id, dept.id, mgr.id)
    const updated = await prisma.department.findUnique({ where: { id: dept.id } })
    expect(updated?.managerId).toBe(mgr.id)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- org-service`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 최소 구현**

`src/modules/org/service.ts`:
```ts
import type { Department } from '@prisma/client'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/modules/rbac/permissions'
import { logAudit } from '@/modules/audit/audit'
import { ValidationError, NotFoundError } from '@/lib/errors'
import type { CreateDepartmentInput } from './schema'

export interface DepartmentNode extends Department {
  children: DepartmentNode[]
}

export async function createDepartment(actorId: string, input: CreateDepartmentInput): Promise<Department> {
  await requirePermission(actorId, 'org.manage')
  return prisma.$transaction(async (tx) => {
    const dept = await tx.department.create({
      data: { name: input.name, parentId: input.parentId ?? null, managerId: input.managerId ?? null },
    })
    await logAudit(tx, {
      actorId, action: 'org.create', targetType: 'Department', targetId: dept.id,
      metadata: { name: dept.name },
    })
    return dept
  })
}

export async function getDepartmentTree(actorId: string): Promise<DepartmentNode[]> {
  await requirePermission(actorId, 'org.read')
  const all = await prisma.department.findMany({ orderBy: { name: 'asc' } })
  const byId = new Map<string, DepartmentNode>()
  for (const d of all) byId.set(d.id, { ...d, children: [] })
  const roots: DepartmentNode[] = []
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

/** target의 모든 후손 id를 모은다 (순환 방지용) */
async function descendantIds(targetId: string): Promise<Set<string>> {
  const all = await prisma.department.findMany({ select: { id: true, parentId: true } })
  const childrenOf = new Map<string, string[]>()
  for (const d of all) {
    if (d.parentId) {
      const arr = childrenOf.get(d.parentId) ?? []
      arr.push(d.id)
      childrenOf.set(d.parentId, arr)
    }
  }
  const result = new Set<string>()
  const stack = [targetId]
  while (stack.length) {
    const cur = stack.pop()!
    for (const child of childrenOf.get(cur) ?? []) {
      if (!result.has(child)) {
        result.add(child)
        stack.push(child)
      }
    }
  }
  return result
}

export async function moveDepartment(actorId: string, departmentId: string, parentId: string | null): Promise<Department> {
  await requirePermission(actorId, 'org.manage')
  const dept = await prisma.department.findUnique({ where: { id: departmentId } })
  if (!dept) throw new NotFoundError('부서를 찾을 수 없습니다.')

  if (parentId === departmentId) throw new ValidationError('자기 자신을 상위 부서로 지정할 수 없습니다.')
  if (parentId) {
    const descendants = await descendantIds(departmentId)
    if (descendants.has(parentId)) {
      throw new ValidationError('하위 부서를 상위 부서로 지정할 수 없습니다.')
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.department.update({ where: { id: departmentId }, data: { parentId } })
    await logAudit(tx, {
      actorId, action: 'org.move', targetType: 'Department', targetId: departmentId,
      metadata: { parentId },
    })
    return updated
  })
}

export async function assignEmployee(actorId: string, employeeId: string, departmentId: string | null): Promise<void> {
  await requirePermission(actorId, 'org.manage')
  await prisma.$transaction(async (tx) => {
    await tx.employee.update({ where: { id: employeeId }, data: { departmentId } })
    await logAudit(tx, {
      actorId, action: 'org.assign', targetType: 'Employee', targetId: employeeId,
      metadata: { departmentId },
    })
  })
}

export async function setDepartmentManager(actorId: string, departmentId: string, managerId: string | null): Promise<void> {
  await requirePermission(actorId, 'org.manage')
  await prisma.$transaction(async (tx) => {
    await tx.department.update({ where: { id: departmentId }, data: { managerId } })
    await logAudit(tx, {
      actorId, action: 'org.setManager', targetType: 'Department', targetId: departmentId,
      metadata: { managerId },
    })
  })
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- org-service`
Expected: PASS (6 passed).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(org): 부서 트리/이동/배치/매니저 service"
```

---

## Task 14: 로그인 service & 직렬화 (auth/service.ts, lib/serialize.ts)

**Files:**
- Create: `src/modules/auth/service.ts`, `src/modules/auth/schema.ts`, `src/lib/serialize.ts`
- Test: `tests/auth-service.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/auth-service.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { login } from '@/modules/auth/service'
import { hashPassword } from '@/modules/auth/password'
import { validateSession } from '@/modules/auth/session'
import { prisma } from '@/lib/db'
import { AuthError } from '@/lib/errors'

async function makeUserWithPassword(email: string, password: string) {
  return prisma.employee.create({
    data: { email, name: '유저', passwordHash: await hashPassword(password) },
  })
}

describe('auth service login', () => {
  it('올바른 자격증명으로 로그인하면 세션 토큰을 반환한다', async () => {
    await makeUserWithPassword('a@co.com', 'pw12345')
    const { token, employee } = await login('a@co.com', 'pw12345')
    expect(employee.email).toBe('a@co.com')
    expect((employee as any).passwordHash).toBeUndefined() // 민감 필드 제외
    const found = await validateSession(token)
    expect(found?.email).toBe('a@co.com')
  })

  it('틀린 비밀번호는 AuthError', async () => {
    await makeUserWithPassword('b@co.com', 'pw12345')
    await expect(login('b@co.com', 'wrong')).rejects.toBeInstanceOf(AuthError)
  })

  it('없는 이메일은 AuthError', async () => {
    await expect(login('none@co.com', 'x')).rejects.toBeInstanceOf(AuthError)
  })

  it('OFFBOARDED 직원은 로그인 불가', async () => {
    const u = await makeUserWithPassword('c@co.com', 'pw12345')
    await prisma.employee.update({ where: { id: u.id }, data: { status: 'OFFBOARDED' } })
    await expect(login('c@co.com', 'pw12345')).rejects.toBeInstanceOf(AuthError)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- auth-service`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 최소 구현**

`src/lib/serialize.ts`:
```ts
import type { Employee } from '@prisma/client'

export type PublicEmployee = Omit<Employee, 'passwordHash'>

export function toPublicEmployee(emp: Employee): PublicEmployee {
  const { passwordHash: _omit, ...rest } = emp
  return rest
}
```

`src/modules/auth/schema.ts`:
```ts
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
```

`src/modules/auth/service.ts`:
```ts
import { prisma } from '@/lib/db'
import { verifyPassword } from './password'
import { createSession, destroySession } from './session'
import { toPublicEmployee, type PublicEmployee } from '@/lib/serialize'
import { AuthError } from '@/lib/errors'

export async function login(email: string, password: string): Promise<{ token: string; expiresAt: Date; employee: PublicEmployee }> {
  const emp = await prisma.employee.findUnique({ where: { email } })
  if (!emp) throw new AuthError('이메일 또는 비밀번호가 올바르지 않습니다.')
  if (emp.status === 'OFFBOARDED') throw new AuthError('비활성화된 계정입니다.')
  if (!(await verifyPassword(password, emp.passwordHash))) {
    throw new AuthError('이메일 또는 비밀번호가 올바르지 않습니다.')
  }
  const { token, expiresAt } = await createSession(emp.id)
  return { token, expiresAt, employee: toPublicEmployee(emp) }
}

export async function logout(token: string): Promise<void> {
  await destroySession(token)
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- auth-service`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): 로그인/로그아웃 service 및 민감필드 직렬화"
```

---

## Task 15: 라우트 공통 래퍼 (lib/route-handler.ts)

**Files:**
- Create: `src/lib/route-handler.ts`
- Test: `tests/route-handler.test.ts`

service가 던진 `AppError`를 일관된 HTTP 응답으로 변환한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/route-handler.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { handle } from '@/lib/route-handler'
import { ConflictError } from '@/lib/errors'

describe('route handler wrapper', () => {
  it('정상 반환은 200 JSON', async () => {
    const res = await handle(async () => ({ ok: true }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('AppError는 해당 status와 code로 변환', async () => {
    const res = await handle(async () => { throw new ConflictError('중복') })
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: { code: 'CONFLICT', message: '중복' } })
  })

  it('알 수 없는 에러는 500', async () => {
    const res = await handle(async () => { throw new Error('boom') })
    expect(res.status).toBe(500)
    expect((await res.json()).error.code).toBe('INTERNAL')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- route-handler`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 최소 구현**

`src/lib/route-handler.ts`:
```ts
import { NextResponse } from 'next/server'
import { AppError } from './errors'

export async function handle<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    const data = await fn()
    return NextResponse.json(data, { status: 200 })
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.statusCode },
      )
    }
    console.error(err)
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: '서버 오류가 발생했습니다.' } },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- route-handler`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(lib): 라우트 에러→HTTP 변환 래퍼"
```

---

## Task 16: 현재 사용자 추출 헬퍼 (auth/current.ts)

**Files:**
- Create: `src/modules/auth/current.ts`
- Test: `tests/current.test.ts`

쿠키에서 세션 토큰을 읽어 현재 직원을 반환한다. 라우트에서 actor를 얻는 표준 경로다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/current.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { getCurrentEmployee, requireCurrentEmployee, SESSION_COOKIE } from '@/modules/auth/current'
import { createSession } from '@/modules/auth/session'
import { makeEmployee } from './helpers'
import { AuthError } from '@/lib/errors'

function reqWithCookie(token?: string): Request {
  const headers = new Headers()
  if (token) headers.set('cookie', `${SESSION_COOKIE}=${token}`)
  return new Request('http://localhost/api/test', { headers })
}

describe('current employee', () => {
  it('유효 쿠키로 현재 직원을 반환', async () => {
    const emp = await makeEmployee()
    const { token } = await createSession(emp.id)
    const found = await getCurrentEmployee(reqWithCookie(token))
    expect(found?.id).toBe(emp.id)
  })

  it('쿠키 없으면 null', async () => {
    expect(await getCurrentEmployee(reqWithCookie())).toBeNull()
  })

  it('requireCurrentEmployee는 비로그인 시 AuthError', async () => {
    await expect(requireCurrentEmployee(reqWithCookie())).rejects.toBeInstanceOf(AuthError)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- current`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 최소 구현**

`src/modules/auth/current.ts`:
```ts
import type { Employee } from '@prisma/client'
import { validateSession } from './session'
import { AuthError } from '@/lib/errors'

export const SESSION_COOKIE = 'hr_session'

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get('cookie')
  if (!header) return undefined
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return v.join('=')
  }
  return undefined
}

export async function getCurrentEmployee(req: Request): Promise<Employee | null> {
  const token = readCookie(req, SESSION_COOKIE)
  if (!token) return null
  return validateSession(token)
}

export async function requireCurrentEmployee(req: Request): Promise<Employee> {
  const emp = await getCurrentEmployee(req)
  if (!emp) throw new AuthError('로그인이 필요합니다.')
  return emp
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- current`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): 쿠키 기반 현재 직원 추출"
```

---

## Task 17: API 라우트 — 인증 (login/logout)

**Files:**
- Create: `src/app/api/auth/login/route.ts`, `src/app/api/auth/logout/route.ts`

라우트는 얇게 유지한다: 입력 검증(zod) → service 호출 → 쿠키 설정. 단위 테스트는 service에서 이미 커버되므로 여기서는 수동 동작 확인.

- [ ] **Step 1: 로그인 라우트 작성**

`src/app/api/auth/login/route.ts`:
```ts
import { handle } from '@/lib/route-handler'
import { loginSchema } from '@/modules/auth/schema'
import { login } from '@/modules/auth/service'
import { SESSION_COOKIE } from '@/modules/auth/current'
import { ValidationError } from '@/lib/errors'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  return handle(async () => {
    const body = await req.json().catch(() => null)
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) throw new ValidationError('이메일과 비밀번호를 입력하세요.')

    const { token, expiresAt, employee } = await login(parsed.data.email, parsed.data.password)
    const res = NextResponse.json({ employee }, { status: 200 })
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    })
    return res
  })
}
```

> 참고: `handle`은 service의 반환값을 JSON으로 감싸지만, 여기서는 쿠키를 직접 세팅한 `NextResponse`를 반환해야 한다. `handle`이 `NextResponse`를 그대로 통과시키도록 Step 2에서 보강한다.

- [ ] **Step 2: handle이 NextResponse를 통과시키도록 보강**

`src/lib/route-handler.ts`의 `handle` 함수 `try` 블록을 수정:
```ts
  try {
    const data = await fn()
    if (data instanceof NextResponse) return data
    return NextResponse.json(data, { status: 200 })
  } catch (err) {
```
파일 상단 import에 `NextResponse`가 이미 있으므로 추가 import 불필요. (반환 타입 `Promise<T>` → `Promise<NextResponse>` 유지)

`handle`의 제네릭 시그니처를 다음으로 변경:
```ts
export async function handle(fn: () => Promise<unknown>): Promise<NextResponse> {
```

- [ ] **Step 3: route-handler 테스트 재실행 (회귀 확인)**

Run: `npm test -- route-handler`
Expected: PASS (3 passed) — 기존 테스트가 여전히 통과.

- [ ] **Step 4: 로그아웃 라우트 작성**

`src/app/api/auth/logout/route.ts`:
```ts
import { handle } from '@/lib/route-handler'
import { logout } from '@/modules/auth/service'
import { SESSION_COOKIE } from '@/modules/auth/current'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  return handle(async () => {
    const cookie = req.headers.get('cookie') ?? ''
    const token = cookie.split(';').map(s => s.trim()).find(s => s.startsWith(`${SESSION_COOKIE}=`))?.split('=')[1]
    if (token) await logout(token)
    const res = NextResponse.json({ ok: true })
    res.cookies.delete(SESSION_COOKIE)
    return res
  })
}
```

- [ ] **Step 5: 빌드 확인**

Run: `npm run build`
Expected: 타입 에러 없이 빌드 성공.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(api): 로그인/로그아웃 라우트"
```

---

## Task 18: API 라우트 — 직원/부서

**Files:**
- Create: `src/app/api/employees/route.ts`, `src/app/api/employees/[id]/route.ts`, `src/app/api/departments/route.ts`

- [ ] **Step 1: 직원 목록/생성 라우트**

`src/app/api/employees/route.ts`:
```ts
import { handle } from '@/lib/route-handler'
import { requireCurrentEmployee } from '@/modules/auth/current'
import { listEmployees, createEmployee } from '@/modules/employees/service'
import { createEmployeeSchema } from '@/modules/employees/schema'
import { toPublicEmployee } from '@/lib/serialize'
import { ValidationError } from '@/lib/errors'

export async function GET(req: Request) {
  return handle(async () => {
    const actor = await requireCurrentEmployee(req)
    const list = await listEmployees(actor.id)
    return { employees: list.map(toPublicEmployee) }
  })
}

export async function POST(req: Request) {
  return handle(async () => {
    const actor = await requireCurrentEmployee(req)
    const body = await req.json().catch(() => null)
    const parsed = createEmployeeSchema.safeParse(body)
    if (!parsed.success) throw new ValidationError('직원 정보가 올바르지 않습니다.')
    const { employee, tempPassword } = await createEmployee(actor.id, parsed.data)
    return { employee: toPublicEmployee(employee), tempPassword }
  })
}
```

- [ ] **Step 2: 직원 단건 조회/수정 라우트**

`src/app/api/employees/[id]/route.ts`:
```ts
import { handle } from '@/lib/route-handler'
import { requireCurrentEmployee } from '@/modules/auth/current'
import { updateEmployee } from '@/modules/employees/service'
import { updateEmployeeSchema } from '@/modules/employees/schema'
import { toPublicEmployee } from '@/lib/serialize'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/modules/rbac/permissions'
import { ValidationError, NotFoundError } from '@/lib/errors'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const actor = await requireCurrentEmployee(req)
    await requirePermission(actor.id, 'employee.read')
    const { id } = await params
    const emp = await prisma.employee.findUnique({ where: { id } })
    if (!emp) throw new NotFoundError('직원을 찾을 수 없습니다.')
    return { employee: toPublicEmployee(emp) }
  })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const actor = await requireCurrentEmployee(req)
    const { id } = await params
    const body = await req.json().catch(() => null)
    const parsed = updateEmployeeSchema.safeParse(body)
    if (!parsed.success) throw new ValidationError('수정 정보가 올바르지 않습니다.')
    const updated = await updateEmployee(actor.id, id, parsed.data)
    return { employee: toPublicEmployee(updated) }
  })
}
```

- [ ] **Step 3: 부서 트리/생성 라우트**

`src/app/api/departments/route.ts`:
```ts
import { handle } from '@/lib/route-handler'
import { requireCurrentEmployee } from '@/modules/auth/current'
import { getDepartmentTree, createDepartment } from '@/modules/org/service'
import { createDepartmentSchema } from '@/modules/org/schema'
import { ValidationError } from '@/lib/errors'

export async function GET(req: Request) {
  return handle(async () => {
    const actor = await requireCurrentEmployee(req)
    return { tree: await getDepartmentTree(actor.id) }
  })
}

export async function POST(req: Request) {
  return handle(async () => {
    const actor = await requireCurrentEmployee(req)
    const body = await req.json().catch(() => null)
    const parsed = createDepartmentSchema.safeParse(body)
    if (!parsed.success) throw new ValidationError('부서 정보가 올바르지 않습니다.')
    return { department: await createDepartment(actor.id, parsed.data) }
  })
}
```

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: 타입 에러 없이 빌드 성공.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(api): 직원/부서 라우트"
```

---

## Task 19: 미들웨어 — 보호 경로 세션 가드

**Files:**
- Create: `src/middleware.ts`

`/admin/*` 페이지는 세션 쿠키가 없으면 `/login`으로 리다이렉트한다. (정교한 권한 검사는 각 service가 담당; 미들웨어는 인증 여부만 거른다.)

- [ ] **Step 1: 미들웨어 작성**

`src/middleware.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/modules/auth/current'

export function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
```

> 참고: 미들웨어는 Edge 런타임이라 Prisma로 세션 유효성까지 검사하지 않는다. 토큰 존재만 확인하고, 실제 유효성·권한은 페이지/라우트의 service 호출에서 검증한다(만료 토큰은 그 단계에서 걸러져 401/403).

- [ ] **Step 2: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공, 미들웨어 인식됨.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: /admin 보호 미들웨어"
```

---

## Task 20: 최소 UI — 로그인 & 직원 목록

**Files:**
- Create: `src/app/login/page.tsx`, `src/app/admin/employees/page.tsx`, `src/app/admin/employees/EmployeeList.tsx`

UI는 코어 동작 확인용 최소 화면이다(스타일링은 후속 단계).

- [ ] **Step 1: 로그인 페이지 작성**

`src/app/login/page.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (res.ok) {
      router.push('/admin/employees')
    } else {
      const data = await res.json()
      setError(data.error?.message ?? '로그인 실패')
    }
  }

  return (
    <main style={{ maxWidth: 360, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1>로그인</h1>
      <form onSubmit={onSubmit}>
        <div><input placeholder="이메일" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: 8, margin: '6px 0' }} /></div>
        <div><input type="password" placeholder="비밀번호" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: 8, margin: '6px 0' }} /></div>
        <button type="submit" style={{ padding: '8px 16px', marginTop: 8 }}>로그인</button>
      </form>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </main>
  )
}
```

- [ ] **Step 2: 직원 목록 클라이언트 컴포넌트**

`src/app/admin/employees/EmployeeList.tsx`:
```tsx
'use client'
import { useEffect, useState } from 'react'

interface Emp { id: string; email: string; name: string; jobTitle: string | null; status: string }

export default function EmployeeList() {
  const [employees, setEmployees] = useState<Emp[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/employees')
      .then(async res => {
        if (!res.ok) { setError((await res.json()).error?.message ?? '오류'); return }
        setEmployees((await res.json()).employees)
      })
  }, [])

  if (error) return <p style={{ color: 'crimson' }}>{error}</p>

  return (
    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
      <thead>
        <tr><th style={cell}>이름</th><th style={cell}>이메일</th><th style={cell}>직책</th><th style={cell}>상태</th></tr>
      </thead>
      <tbody>
        {employees.map(e => (
          <tr key={e.id}>
            <td style={cell}>{e.name}</td><td style={cell}>{e.email}</td>
            <td style={cell}>{e.jobTitle ?? '-'}</td><td style={cell}>{e.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const cell: React.CSSProperties = { border: '1px solid #ddd', padding: 8, textAlign: 'left' }
```

- [ ] **Step 3: 직원 목록 페이지**

`src/app/admin/employees/page.tsx`:
```tsx
import EmployeeList from './EmployeeList'

export default function AdminEmployeesPage() {
  return (
    <main style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>직원 관리</h1>
      <EmployeeList />
    </main>
  )
}
```

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): 로그인 및 직원 목록 화면"
```

---

## Task 21: 최초 Admin 부트스트랩 & 수동 E2E 확인

**Files:**
- Modify: `prisma/seed.ts` (최초 Admin 계정 추가)

- [ ] **Step 1: 시드에 최초 Admin 부트스트랩 추가**

`prisma/seed.ts`의 import에 추가:
```ts
import bcrypt from 'bcryptjs'
```

`seedRbac` 함수 끝(역할/권한 생성 루프 다음, 함수 `return` 전)에 추가:
```ts
  // 최초 Admin 계정 (멱등)
  const adminEmail = 'admin@company.com'
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'Admin' } })
  const existing = await prisma.employee.findUnique({ where: { email: adminEmail } })
  if (!existing) {
    const admin = await prisma.employee.create({
      data: {
        email: adminEmail,
        name: '최초 관리자',
        passwordHash: await bcrypt.hash('admin1234', 10),
        mustChangePassword: true,
      },
    })
    await prisma.employeeRole.create({ data: { employeeId: admin.id, roleId: adminRole.id } })
  }
```

> seed.test.ts는 역할 3개·권한·멱등성만 검증하므로 Admin 계정 추가로 깨지지 않는다(역할 수는 여전히 3). 단, "두 번 실행해도 role.count는 3" 테스트는 영향 없음을 확인한다.

- [ ] **Step 2: 시드 테스트 회귀 확인**

Run: `npm test -- seed`
Expected: PASS (2 passed) — Admin 부트스트랩 추가 후에도 통과.

- [ ] **Step 3: 개발 DB에 시드 적용**

Run: `npm run db:seed`
Expected: 성공. (재실행해도 멱등)

- [ ] **Step 4: 수동 E2E 확인**

```bash
npm run dev
```
브라우저에서 확인:
1. `http://localhost:3000/admin/employees` 접속 → `/login`으로 리다이렉트되는지
2. `admin@company.com` / `admin1234` 로그인 → 직원 목록 페이지로 이동
3. 목록에 최초 관리자가 보이는지
4. (선택) `curl`로 직원 생성 확인:
```bash
# 로그인해서 쿠키 저장
curl -i -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@company.com","password":"admin1234"}'
# 직원 생성
curl -b cookies.txt -X POST http://localhost:3000/api/employees \
  -H 'content-type: application/json' \
  -d '{"email":"new@company.com","name":"신입사원","jobTitle":"개발자"}'
```
Expected: 생성 응답에 `employee`와 `tempPassword` 포함.

- [ ] **Step 5: 전체 테스트 스위트 실행**

Run: `npm test`
Expected: 모든 테스트 PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(seed): 최초 Admin 부트스트랩"
```

---

## Self-Review 결과

**스펙 커버리지 확인:**

| 스펙 섹션 | 구현 태스크 |
| --- | --- |
| 2. 아키텍처/모듈 구조 | Task 1(스캐폴딩), 모듈 디렉터리 전반 |
| 3. 데이터 모델 (전 엔티티) | Task 2(Prisma 스키마) |
| 4. RBAC 시드/권한/범위 | Task 7(시드), Task 8(권한), Task 11(Manager 범위 필터) |
| 5-1. 로그인/세션 | Task 5,6,14,16,17 |
| 5-1. 비밀번호 재설정(임시 발급) | Task 11(생성 시 임시 비번), `mustChangePassword` 플래그 |
| 5-2. 직원 관리 | Task 10,11,18 |
| 5-2. 상태 전환+세션 무효화 | Task 11(`transitionStatus`) |
| 5-3. 조직 관리 | Task 12,13,18 |
| 5-4. 관리자 대시보드 | Task 20(UI), Task 18(API) |
| 6. 에러 처리/검증/보안/트랜잭션 | Task 3,14(직렬화),15,각 service의 `$transaction` |
| 7. 테스트 전략(단위/통합/TDD/시드검증) | 전 태스크 TDD, Task 7 시드 검증 |

**미해결/축소 항목(의도적):**
- 비밀번호 변경 강제 화면(`mustChangePassword` UI)은 플래그만 두고 화면은 후속(범위 밖의 UI 확장). 데이터·로직 토대는 마련됨.
- 통합 테스트는 service 레벨에서 실제 테스트 DB로 수행(라우트는 빌드+수동 E2E로 확인) — 소규모 범위에 맞춘 선택.

**타입 일관성 확인:** `requirePermission(employeeId, key)`, `getPermissionKeys`, `logAudit(db, input)`, `toPublicEmployee`, `SESSION_COOKIE`, `handle` 시그니처가 정의 태스크와 사용 태스크 전반에서 일치.
