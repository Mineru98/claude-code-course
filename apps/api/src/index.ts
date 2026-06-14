import express from "express";
import cors from "cors";
import type { CreateTodoInput, UpdateTodoInput } from "@todo/shared";
import { todoStore } from "./todo.store.js";
import { logger } from "./lib/logger.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// 목록 조회
app.get("/todos", (_req, res) => {
  res.json({ data: todoStore.list() });
});

// 생성
app.post("/todos", (req, res) => {
  const body = req.body as Partial<CreateTodoInput>;
  const title = body.title?.trim();

  if (!title) {
    return res.status(400).json({ error: "title 은 필수입니다." });
  }

  const todo = todoStore.create({ title });
  res.status(201).json({ data: todo });
});

// 수정 (제목/완료 상태)
app.patch("/todos/:id", (req, res) => {
  const body = req.body as UpdateTodoInput;
  const input: UpdateTodoInput = {};

  if (body.title !== undefined) {
    const title = body.title.trim();
    if (!title) {
      return res.status(400).json({ error: "title 은 빈 값일 수 없습니다." });
    }
    input.title = title;
  }
  if (body.completed !== undefined) {
    input.completed = Boolean(body.completed);
  }

  const updated = todoStore.update(req.params.id, input);
  if (!updated) {
    return res.status(404).json({ error: "해당 Todo 를 찾을 수 없습니다." });
  }
  res.json({ data: updated });
});

// 삭제
app.delete("/todos/:id", (req, res) => {
  const removed = todoStore.remove(req.params.id);
  if (!removed) {
    return res.status(404).json({ error: "해당 Todo 를 찾을 수 없습니다." });
  }
  res.status(204).end();
});

// 매칭되는 라우트가 없을 때 (404)
app.use(notFoundHandler);

// 중앙 에러 핸들러 (반드시 맨 마지막)
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info("API 서버 실행 중", { url: `http://localhost:${PORT}` });
});
