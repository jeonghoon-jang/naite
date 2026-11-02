-- 챗봇 검색 함수. 카드 그리는 데 필요한 필드를 함께 돌려줘서 API가 DB를 다시 조회하지 않게 한다.
-- security invoker(기본값)라 anon 키로 호출해도 RLS(hidden=false)가 적용된다.
create function public.match_stores(
  query_embedding vector(1536),
  match_count int default 8,
  min_years numeric default null,
  tags text[] default null,
  max_dist_m int default 1800
) returns table (
  id uuid, slug text, name text, name_en text, lat double precision, lng double precision,
  address text, dong text, dist_m int, license_date date, years_by_license numeric, biz_type text,
  cuisine_tags text[], menu_main text, menu_source text, is_baeknyeon boolean, data_status text,
  summary_ko text, summary_en text, kakao_place_url text, photo_url text, similarity float
)
language sql stable
set search_path = public, extensions
as $$
  select s.id, s.slug, s.name, s.name_en, s.lat, s.lng, s.address, s.dong, s.dist_m, s.license_date,
         s.years_by_license, s.biz_type, s.cuisine_tags, s.menu_main, s.menu_source, s.is_baeknyeon,
         s.data_status, s.summary_ko, s.summary_en, s.kakao_place_url, s.photo_url,
         1 - (s.embedding <=> query_embedding) as similarity
  from public.stores s
  where s.hidden = false
    and s.embedding is not null
    and s.dist_m <= max_dist_m
    and (min_years is null or s.years_by_license >= min_years)
    and (tags is null or cardinality(tags) = 0 or s.cuisine_tags && tags)
  order by s.embedding <=> query_embedding
  limit least(match_count, 20);
$$;

grant execute on function public.match_stores(vector, int, numeric, text[], int) to anon, authenticated;
