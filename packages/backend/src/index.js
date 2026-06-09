import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const app = express();
const PORT = process.env.PORT || 4000;
const MAX_TITLE_LEN = 200;

// 리버스 프록시 뒤에서 실제 클라이언트 IP 인식 (SEC-10)
app.set("trust proxy", 1);
// 프레임워크 정보 노출 제거 (SEC-2)
app.disable("x-powered-by");

// 보안 HTTP 헤더 (SEC-2)
app.use(helmet());

// CORS — 허용 출처 화이트리스트 (SEC-1)
// 기본값은 로컬 프론트엔드 개발 서버. 운영 환경에서는 ALLOWED_ORIGINS로 주입.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5174")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin(origin, cb) {
      // 동일 출처/서버 간 요청(origin 없음)은 허용
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("CORS 정책에 의해 차단된 출처입니다."));
    },
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: false,
  })
);

// request body 크기 제한 (SEC-5)
app.use(express.json({ limit: "10kb" }));

// 쓰기 작업 rate limiting (SEC-3)
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "요청이 너무 많습니다. 잠시 후 다시 시도하세요." },
});
// 전역(읽기 포함) 완만한 제한
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", globalLimiter);

// 인메모리 저장소 (테스트용)
let todos = [
  { id: 1, title: "Claude Code 배우기", completed: false },
  { id: 2, title: "Todo 앱 만들기", completed: true },
];
let nextId = 3;

// title 검증 헬퍼 (SEC-4, SEC-7)
function validateTitle(value) {
  if (typeof value !== "string") return { ok: false, msg: "title은 문자열이어야 합니다." };
  const trimmed = value.trim();
  if (trimmed.length === 0) return { ok: false, msg: "title은 비어 있을 수 없습니다." };
  if (trimmed.length > MAX_TITLE_LEN)
    return { ok: false, msg: `title은 최대 ${MAX_TITLE_LEN}자까지 가능합니다.` };
  return { ok: true, value: trimmed };
}

// 경로 id 검증 (SEC-8)
function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

// 목록 조회
app.get("/api/todos", (_req, res) => {
  res.json(todos);
});

// 생성 (쓰기 제한 적용)
app.post("/api/todos", writeLimiter, (req, res) => {
  const result = validateTitle(req.body?.title);
  if (!result.ok) return res.status(400).json({ error: result.msg });
  const todo = { id: nextId++, title: result.value, completed: false };
  todos.push(todo);
  res.status(201).json(todo);
});

// 수정 (완료 토글 / 제목 변경)
app.patch("/api/todos/:id", writeLimiter, (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: "유효하지 않은 id입니다." });

  const todo = todos.find((t) => t.id === id);
  if (!todo) return res.status(404).json({ error: "할 일을 찾을 수 없습니다." });

  const { title, completed } = req.body ?? {};
  // 허용 필드만 처리 (allowlist)
  if (title !== undefined) {
    const result = validateTitle(title);
    if (!result.ok) return res.status(400).json({ error: result.msg });
    todo.title = result.value;
  }
  if (completed !== undefined) {
    if (typeof completed !== "boolean")
      return res.status(400).json({ error: "completed는 boolean이어야 합니다." });
    todo.completed = completed;
  }
  res.json(todo);
});

// 삭제 (쓰기 제한 적용)
app.delete("/api/todos/:id", writeLimiter, (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: "유효하지 않은 id입니다." });

  const exists = todos.some((t) => t.id === id);
  if (!exists) return res.status(404).json({ error: "할 일을 찾을 수 없습니다." });

  todos = todos.filter((t) => t.id !== id);
  res.status(204).end();
});

// 정의되지 않은 경로 404 (SEC-6)
app.use((_req, res) => {
  res.status(404).json({ error: "요청한 리소스를 찾을 수 없습니다." });
});

// 전역 에러 핸들러 — 내부 정보/스택 노출 방지 (SEC-6)
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // 잘못된 JSON 본문 등 파싱 에러
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "잘못된 JSON 형식입니다." });
  }
  if (err.message && err.message.startsWith("CORS")) {
    return res.status(403).json({ error: "허용되지 않은 출처입니다." });
  }
  const isProd = process.env.NODE_ENV === "production";
  res.status(err.status || 500).json({
    error: isProd ? "서버 내부 오류가 발생했습니다." : err.message,
  });
});

// 프로세스 레벨 예외 처리 (SEC-6)
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

app.listen(PORT, () => {
  console.log(`✅ Todo API 서버 실행 중: http://localhost:${PORT}`);
});
