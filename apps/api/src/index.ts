import express from "express";
import cors from "cors";
import type { CreateTodoInput, UpdateTodoInput } from "@todo/shared";
import { todoStore } from "./todo.store.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`✅ API 서버 실행 중: http://localhost:${PORT}`);
});
