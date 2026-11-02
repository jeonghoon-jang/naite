import { useEffect, useRef, useState } from 'react'
import LangToggle from '../components/LangToggle'
import Logo from '../components/Logo'
import StoreRow from '../components/StoreCard'
import { useI18n } from '../lib/i18n'
import type { StoreCard as S } from '../lib/types'

type Scope = 'in' | 'out_area' | 'off_topic' | 'no_result' | 'clarify' | 'error'
type Msg = { role: 'user' | 'bot'; text: string; stores?: (S & { reason?: string })[]; scope?: Scope }

// 상세 화면에 다녀와도 대화가 남도록 세션 동안 보관
const KEY = 'naite:chat'
const load = (): Msg[] => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export default function AskPage() {
  const { t, lang } = useI18n()
  const [msgs, setMsgs] = useState<Msg[]>(load)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-30)))
    // scrollIntoView 는 탭 틀(가로)까지 스크롤해서 쓰지 않는다. 자기 목록만 아래로.
    const el = scroller.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [msgs])

  async function send(text: string) {
    const q = text.trim().slice(0, 500)
    if (!q || busy) return
    setInput('')
    setMsgs((m) => [...m, { role: 'user', text: q }])
    setBusy(true)
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q, lang }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? r.statusText)
      setMsgs((m) => [...m, { role: 'bot', text: d.answer, stores: d.stores, scope: d.scope }])
    } catch {
      setMsgs((m) => [...m, { role: 'bot', text: t('error'), scope: 'error' }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <header className="shrink-0 px-5 pb-3 pt-3">
        <div className="flex h-10 items-center justify-between">
          <h1 className="text-[24px] font-black tracking-tight">{t('ask.title')}</h1>
          <div className="flex items-center gap-2">
            {msgs.length > 0 && (
              <button onClick={() => setMsgs([])} className="rounded-full bg-gray-100 px-3 py-1 text-[13px] font-medium text-gray-700">
                {t('ask.new')}
              </button>
            )}
            <LangToggle />
          </div>
        </div>
        <p className="text-[12px] text-gray-600">{t('ask.sub')}</p>
      </header>
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto pb-4">
        {msgs.length === 0 && (
          <div className="mx-5 mt-2 flex items-center gap-3 rounded-[18px] bg-accent-50 px-4 py-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent">
              <Logo size={26} color="#fff" bg="var(--color-accent)" />
            </span>
            <p className="text-[14px] leading-5 text-gray-800">{t('ask.intro')}</p>
          </div>
        )}
        <div className="space-y-3.5 pt-4">
          {msgs.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="flex justify-end px-5">
                <div className="max-w-[80%] rounded-[20px] rounded-br-md bg-accent px-4 py-2.5 text-[15px] text-white">{m.text}</div>
              </div>
            ) : (
              <div key={i}>
                <div className="px-5">
                  <div className="max-w-[85%] whitespace-pre-line rounded-[20px] rounded-tl-md bg-gray-100 px-4 py-2.5 text-[15px] leading-6 text-gray-800">{m.text}</div>
                </div>
                {m.stores && m.stores.length > 0 && (
                  <>
                    <ul className="mx-5 mt-2.5 overflow-hidden rounded-[18px] border border-gray-200 [&>li+li]:border-t [&>li+li]:border-gray-100">
                      {m.stores.map((s) => (
                        <li key={s.slug}>
                          <StoreRow s={s} reason={s.reason} />
                        </li>
                      ))}
                    </ul>
                    <p className="px-5 pt-1.5 text-[11px] text-gray-400">{t('ask.note')}</p>
                  </>
                )}
              </div>
            ),
          )}
          {busy && (
            <div className="px-5">
              <span className="inline-block rounded-[20px] rounded-tl-md bg-gray-100 px-4 py-2.5 text-[15px] text-gray-400">{t('loading')}</span>
            </div>
          )}
        </div>
      </div>
      <div className="shrink-0 space-y-2.5 bg-white px-4 pb-3 pt-2">
        <div data-noswipe className="no-scrollbar flex gap-2 overflow-x-auto">
          {t('ask.examples').split('|').map((ex) => (
            <button key={ex} onClick={() => send(ex)} disabled={busy} className="shrink-0 rounded-full border border-gray-200 px-3 py-1.5 text-[13px] font-medium text-gray-700">
              {ex}
            </button>
          ))}
        </div>
        <form
          className="flex items-center gap-2 rounded-full bg-gray-100 py-1.5 pl-5 pr-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={500}
            placeholder={t('ask.placeholder')}
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-gray-500"
          />
          <button disabled={busy || !input.trim()} aria-label={t('ask.send')} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-white disabled:bg-gray-300">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V6M6 11l6-6 6 6" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}
