import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import BackHeader from '../components/BackHeader'
import Badge from '../components/Badge'
import { won } from '../lib/format'
import { useI18n } from '../lib/i18n'
import { fetchMenu } from '../lib/supabase'
import { parseItems } from './MenuPage'

type Data = Awaited<ReturnType<typeof fetchMenu>>

/** 직원에게 보여주는 주문 카드. 한국어 큰 글씨 + 영어 병기. 주문을 전송하지 않는다. */
export default function OrderCardPage() {
  const { slug = '' } = useParams()
  const [params] = useSearchParams()
  const { t } = useI18n()
  const [d, setD] = useState<Data | undefined>(undefined)
  const [err, setErr] = useState(false)
  useEffect(() => {
    fetchMenu(slug).then(setD, () => setErr(true))
  }, [slug])

  const qty = parseItems(params.get('items'))
  const lines = d ? d.menus.filter((m) => qty.has(m.sort)).map((m) => ({ m, q: qty.get(m.sort)! })) : []
  const total = lines.reduce((a, { m, q }) => a + (m.price ?? 0) * q, 0)

  return (
    <div className="flex h-full flex-col">
      <BackHeader title={t('order.title')} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {err && <p className="p-8 text-center text-sm text-neutral-500">{t('error')}</p>}
        {d === undefined && !err && <p className="p-8 text-center text-sm text-neutral-500">{t('loading')}</p>}
        {d && (
          <>
            <div className="bg-accent px-4 py-3 text-center text-white">
              <div className="text-sm">{t('order.show')}</div>
            </div>
            <section className="px-5 py-5">
              <div className="mb-1 flex items-center gap-2">
                <h1 className="text-2xl font-bold">{d.name}</h1>
                {lines.some(({ m }) => m.is_mock) && <Badge>{t('badge.mock')}</Badge>}
              </div>
              <p className="mb-4 text-lg font-semibold">이렇게 주문할게요.</p>
              {lines.length === 0 && (
                <p className="py-6 text-center text-neutral-500">
                  {t('order.empty')}{' '}
                  <Link to={`/s/${slug}/menu`} className="text-accent underline">{t('menu.title')}</Link>
                </p>
              )}
              <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
                {lines.map(({ m, q }) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-4">
                    <div className="min-w-0">
                      <div className="text-3xl font-bold leading-tight">{m.name_ko}</div>
                      <div className="text-sm text-neutral-500">{m.name_en}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-3xl font-bold tabular-nums">
                        {q}
                        <span className="ml-1 text-lg font-semibold">{m.unit_ko?.replace(/^1/, '') ?? '개'}</span>
                      </div>
                      <div className="text-xs text-neutral-500">× {won(m.price)}</div>
                    </div>
                  </li>
                ))}
              </ul>
              {lines.length > 0 && (
                <div className="flex justify-between py-3 text-sm text-neutral-600">
                  <span>합계(예상) · Estimated total</span>
                  <span className="font-semibold tabular-nums">{won(total)}</span>
                </div>
              )}
              <p className="mt-2 rounded border border-neutral-300 px-3 py-2 text-xs leading-5 text-neutral-600">
                자동 주문이 아니에요. 이 화면을 보여주고 직접 주문해 주세요.
                <br />
                This does not place an order. Show this screen and order in person.
              </p>
            </section>
            {d.order_phrases.length > 0 && (
              <section className="border-t border-neutral-200 px-5 py-4 pb-10">
                <h2 className="mb-2 text-xs font-semibold text-neutral-500">{t('order.phrases')}</h2>
                <ul className="space-y-3">
                  {d.order_phrases.map((p) => (
                    <li key={p.id}>
                      <div className="text-xl font-semibold">{p.text_ko}</div>
                      <div className="text-sm text-neutral-500">{p.text_en}</div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
