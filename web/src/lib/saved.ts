import { useSyncExternalStore } from 'react'

const KEY = 'naite:saved'
const listeners = new Set<() => void>()
let snapshot: string[] = read()

function read(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function toggleSaved(slug: string) {
  snapshot = snapshot.includes(slug) ? snapshot.filter((s) => s !== slug) : [...snapshot, slug]
  localStorage.setItem(KEY, JSON.stringify(snapshot))
  listeners.forEach((l) => l())
}

export function useSaved(): string[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => snapshot,
  )
}
