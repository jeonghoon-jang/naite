-- 확인용 (읽기 전용)
select table_name from information_schema.tables
 where table_schema = 'public' and table_name in ('stores', 'menus', 'order_phrases', 'reels');
select proname from pg_proc where proname = 'match_stores';
select extname, extnamespace::regnamespace from pg_extension where extname = 'vector';
