import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="text-3xl font-bold tracking-tight">ano-scheduler</h1>
      <p className="mt-3 text-slate-600">
        匿名で使える、シンプルな日程調整ツール。30分刻みのグリッドで空き時間を集め、
        だれでも見やすいピボット表で最適な時間帯がひと目でわかります。
      </p>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">参加者の方へ</h2>
        <p className="mt-2 text-sm text-slate-600">
          主催者から届いた回答用URLを開いて、空いている時間に印をつけるだけ。
          ログインは不要です。
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">主催者の方へ</h2>
        <p className="mt-2 text-sm text-slate-600">
          イベントの作成・URL配布・集計・削除は管理画面から行います。
        </p>
        <Link
          href="/admin"
          className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          管理画面へ
        </Link>
      </div>

      <footer className="mt-12 text-xs text-slate-400">
        参加者名などの個人情報を扱います。作成から30日で自動的に削除されます。
      </footer>
    </main>
  );
}
