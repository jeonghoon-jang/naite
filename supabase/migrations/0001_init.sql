-- 나이테 초기 스키마. 공용 프로젝트이므로 새 객체만 만든다.
-- 같은 이름의 테이블이 이미 있으면 에러로 멈춘다(기존 객체를 덮어쓰지 않도록 if not exists 를 쓰지 않음).
begin;

-- 이미 켜져 있으면(어느 스키마든) 아무것도 하지 않는다. 타입은 search_path(public, extensions)로 찾는다.
create extension if not exists vector with schema extensions;

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  license_no text,                              -- 인허가 관리번호
  name text not null,
  name_en text,
  lat double precision not null,
  lng double precision not null,
  address text,
  dong text,
  dist_m int,
  license_date date,
  years_by_license numeric,
  biz_type text,                                -- 인허가 업태
  sangga_category text,                         -- 상가정보 업종 (대>중>소)
  cuisine_tags text[] not null default '{}',
  menu_main text,
  menu_source text,                             -- tourapi | model_restaurant | traditional | mock | null
  is_baeknyeon boolean not null default false,
  is_model_restaurant boolean not null default false,
  franchise_suspect boolean not null default false,
  flags text[] not null default '{}',           -- sangga_unmatched, type_mismatch, franchise_* ...
  hidden boolean not null default false,        -- 공개 여부 최종 판정 (review.csv keep 반영)
  data_status text not null default 'candidate' check (data_status in ('mock', 'candidate', 'verified')),
  summary_ko text,
  summary_en text,
  kakao_place_id text,                          -- 카카오는 ID·URL만 저장
  kakao_place_url text,
  photo_url text,                               -- 목업(부산집)만
  photo_credit text,
  sources jsonb not null default '[]',
  search_text text,
  embedding vector(1536),
  updated_at timestamptz not null default now()
);
create index stores_embedding_idx on public.stores using hnsw (embedding vector_cosine_ops);

create table public.menus (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  sort int not null default 0,
  name_ko text not null,
  name_en text not null,
  desc_ko text,
  desc_en text,
  price int,                                    -- 원
  unit_ko text,                                 -- 1인분, 1접시 ...
  unit_en text,
  min_qty int not null default 1,
  is_mock boolean not null default true
);
create index menus_store_idx on public.menus(store_id, sort);

create table public.order_phrases (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  sort int not null default 0,
  text_ko text not null,
  text_en text not null
);
create index order_phrases_store_idx on public.order_phrases(store_id, sort);

create table public.reels (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  sort int not null default 0,
  video_url text,
  poster_url text,
  caption_ko text,
  caption_en text,
  is_mock boolean not null default true
);
create index reels_store_idx on public.reels(store_id, sort);

alter table public.stores enable row level security;
alter table public.menus enable row level security;
alter table public.order_phrases enable row level security;
alter table public.reels enable row level security;

-- 읽기는 공개, 쓰기는 service role(파이프라인)만
create policy "naite public read" on public.stores for select using (hidden = false);
create policy "naite public read" on public.menus for select
  using (exists (select 1 from public.stores s where s.id = store_id and s.hidden = false));
create policy "naite public read" on public.order_phrases for select
  using (exists (select 1 from public.stores s where s.id = store_id and s.hidden = false));
create policy "naite public read" on public.reels for select
  using (exists (select 1 from public.stores s where s.id = store_id and s.hidden = false));

grant select on public.stores, public.menus, public.order_phrases, public.reels to anon, authenticated;

commit;
