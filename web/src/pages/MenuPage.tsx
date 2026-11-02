import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import BackHeader from '../components/BackHeader'
import Badge from '../components/Badge'
import { displayName, won } from '../lib/format'
import { useI18n } from '../lib/i18n'
import { fetchMenu } from '../lib/supabase'

type Data = Awaited<ReturnType<typeof fetchMenu>>

export const parseItems = (v: string | null) =>
  new Map(
    (v ?? '')
      .split(',')
      .map((x) => x.split(':').map(Number))
      .filter(([i, q]) => Number.isInteger(i) && q > 0)
      .map(([i, q]) => [i, Math.min(q, 99)] as [number, number]),
  )

export default function MenuPage() {
  const { slug = '' } = useParams()
  const [params] = useSearchParams()
  const { t, lang } = useI18n()
  const [d, setD] = useState<Data | undefined>(undefined)
  const [err, setErr] = useState(false)
  const [qty, setQty] = useState(() => parseItems(params.get('items')))
  useEffect(() => {
    fetchMenu(slug).then(setD, () => setErr(true))
  }, [slug])

  const set = (sort: number, min: number, delta: number) => {
    const next = new Map(qty)
    const cur = next.get(sort) ?? 0
    let v = cur + delta
    if (delta > 0 && cur === 0) v = Math.max(1, min)
    if (delta < 0 && v < min) v = 0
    if (v > 0) next.set(sort, Math.min(v, 99))
    else next.delete(sort)
    setQty(next)
  }
  const count = [...qty.values()].reduce((a, b) => a + b, 0)
  const items = [...qty.entries()].map(([i, q]) => `${i}:${q}`).join(',')

  return (
    <div className="flex h-full flex-col">
      <BackHeader title={d ? `${displayName(d, lang)} · ${t('menu.title')}` : t('menu.title')} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {err && <p className="p-8 text-center text-sm text-neutral-500">{t('error')}</p>}
        {d === undefined && !err && <p className="p-8 text-center text-sm text-neutral-500">{t('loading')}</p>}
        {d === null && <p className="p-8 text-center text-sm text-neutral-500">{t('store.notFound')}</p>}
        {d && (
          <>
            {d.menus.some((m) => m.is_mock) && (
              <p className="mx-4 mt-3 flex items-center gap-1.5 rounded bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
                <Badge>{t('badge.mock')}</Badge>
                {t('menu.mockNote')}
              </p>
            )}
            <ul className="divide-y divide-neutral-100">
              {d.menus.map((m) => {
                const q = qty.get(m.sort) ?? 0
                return (
                  <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{lang === 'en' ? m.name_en : m.name_ko}</div>
                      <div className="text-sm text-neutral-500">{lang === 'en' ? m.name_ko : m.name_en}</div>
                      {(lang === 'en' ? m.desc_en : m.desc_ko) && <div className="text-xs text-neutral-500">{lang === 'en' ? m.desc_en : m.desc_ko}</div>}
                      <div className="mt-0.5 text-sm">
                        {won(m.price)}
                        <span className="text-neutral-500"> / {lang === 'en' ? m.unit_en : m.unit_ko}</span>
                        {m.min_qty > 1 && <span className="ml-1 text-xs text-accent">{t('menu.min', { n: m.min_qty })}</span>}
                      </div>
                    </div>
                    <div className="flex items-center rounded border border-neutral-300">
                      <button className="h-9 w-9 text-lg disabled:text-neutral-300" disabled={q === 0} onClick={() => set(m.sort, m.min_qty, -1)} aria-label="-">−</button>
                      <span className="w-6 text-center tabular-nums">{q}</span>
                      <button className="h-9 w-9 text-lg" onClick={() => set(m.sort, m.min_qty, 1)} aria-label="+">+</button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
      <div className="border-t border-neutral-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Link
          to={count ? `/s/${slug}/order?items=${items}` : '#'}
          aria-disabled={!count}
          className={`block rounded py-3 text-center font-semibold ${count ? 'bg-accent text-white' : 'pointer-events-none bg-neutral-200 text-neutral-400'}`}
        >
          {t('menu.makeCard', { n: count })}
        </Link>
      </div>
    </div>
  )
}
