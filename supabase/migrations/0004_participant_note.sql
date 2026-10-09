-- 特記事項: 日付ごとメモ（day_memos）→ 参加者ごと1つの自由記述に変更
alter table public.participants
  add column if not exists note text not null default '';

-- 旧 day_memos テーブルはコードから参照しなくなりました（残しても害はありません）。
-- 不要なら次を実行して削除できます:
--   drop table if exists public.day_memos;
