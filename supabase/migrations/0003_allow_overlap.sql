-- 参加者の重複可否（スロット先着制の切り替え）
-- true  = 複数人が同じ枠を選べる（通常の日程調整）
-- false = 1枠につき1人だけ確保できる（先着・予約型）
alter table public.events
  add column if not exists allow_overlap boolean not null default true;
