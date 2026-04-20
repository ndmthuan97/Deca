import { useEffect } from 'react'

type KeyMap = {
  [key: string]: (e: KeyboardEvent) => void
}

/**
 * Global keyboard shortcut hook.
 * Keys are matched against e.key (case-sensitive on letters, use lowercase).
 * Automatically ignores events fired from <input>, <textarea>, <select>.
 *
 * @example
 * useKeyShortcuts({
 *   ' ':        () => flip(),
 *   '1':        () => rate('again'),
 *   'ArrowLeft': () => prev(),
 * }, enabled)
 */
export function useKeyShortcuts(keyMap: KeyMap, enabled = true) {
  useEffect(() => {
    if (!enabled) return

    function handleKeyDown(e: KeyboardEvent) {
      // Skip if user is typing in an input
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if ((e.target as HTMLElement).isContentEditable) return

      const handler = keyMap[e.key]
      if (handler) {
        e.preventDefault()
        handler(e)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [keyMap, enabled])
}
