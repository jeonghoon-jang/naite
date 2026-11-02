import { useEffect, useRef, useState } from 'react'
import LangToggle from '../components/LangToggle'
import StoreCard from '../components/StoreCard'
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
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-30)))
    end.current?.scrollIntoView({ behavior: 'smooth' })
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
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 px-4">
        <span className="font-semibold">{t('ask.title')}</span>
        <LangToggle />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-4 py-4 text-sm text-neutral-600">{t('ask.intro')}</div>
        {msgs.length === 0 && (
          <div className="flex flex-col items-start gap-2 px-4">
            {t('ask.examples').split('|').map((ex) => (
              <button key={ex} onClick={() => send(ex)} className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700">
                {ex}
              </button>
            ))}
          </div>
        )}
        <div className="space-y-3 py-2">
          {msgs.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="flex justify-end px-4">
                <div className="max-w-[80%] rounded-lg bg-ink px-3 py-2 text-sm text-white">{m.text}</div>
              </div>
            ) : (
              <div key={i}>
                <div className="px-4">
                  <div className="max-w-[90%] whitespace-pre-line rounded-lg bg-neutral-100 px-3 py-2 text-sm">{m.text}</div>
                </div>
                {m.stores && m.stores.length > 0 && (
                  <>
                    <ul className="mt-2 divide-y divide-neutral-100 border-y border-neutral-100">
                      {m.stores.map((s) => (
                        <li key={s.slug}>
                          <StoreCard s={s} reason={s.reason} />
                        </li>
                      ))}
                    </ul>
                    <p className="px-4 pt-1 text-[11px] text-neutral-400">{t('ask.note')}</p>
                  </>
                )}
              </div>
            ),
          )}
          {busy && <div className="px-4 text-sm text-neutral-400">{t('loading')}</div>}
          <div ref={end} />
        </div>
      </div>
      <form
        className="flex gap-2 border-t border-neutral-200 p-2"
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
          className="min-w-0 flex-1 rounded border border-neutral-300 px-3 py-2 text-base outline-none focus:border-accent"
        />
        <button disabled={busy || !input.trim()} className="rounded bg-accent px-4 text-sm font-semibold text-white disabled:bg-neutral-300">
          {t('ask.send')}
        </button>
      </form>
    </div>
  )
}
