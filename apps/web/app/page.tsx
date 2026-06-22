import { listTodos } from "@todo/store";

import { TodoApp } from "@/components/todo-app";

// 파일 기반 저장소를 매 요청마다 읽어 최신 상태를 렌더링한다.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initialTodos = await listTodos();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-10 sm:py-16">
      <header className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/60 px-3 py-1 text-xs font-medium text-slate-500 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
          <span className="size-1.5 rounded-full bg-violet-500" />
          Turborepo · Next.js 모노레포
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          할 일 관리
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          공유 패키지(<code className="rounded bg-slate-100 px-1 py-0.5 text-[0.8em] dark:bg-slate-800">@todo/types</code>,{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-[0.8em] dark:bg-slate-800">@todo/store</code>)와
          Route Handler 로 동작하는 예제 앱입니다.
        </p>
      </header>

      <TodoApp initialTodos={initialTodos} />

      <footer className="mt-10 text-center text-xs text-slate-400 dark:text-slate-600">
        파일 기반 저장소 · 데이터는 <code>.data/todos.json</code> 에 보관됩니다.
      </footer>
    </main>
  );
}
