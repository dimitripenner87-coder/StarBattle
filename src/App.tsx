import { useEffect, useMemo, useRef, useState } from 'react'
import { RotateCcw, BadgeCheck, Lightbulb, Moon, Sun, Heart, Star as StarIcon, X as XIcon } from 'lucide-react'
import clsx from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: Array<string | false | null | undefined>) {
  return twMerge(clsx(inputs))
}

type CellState = 'empty' | 'x' | 'star'
type Dir = 't' | 'r' | 'b' | 'l'

const SIZE = 10
const STARS_PER_UNIT = 2

/** 50 auswählbare 10x10 Region-Layouts – nur lösbare (base2/3: Norvig/Snyder). base1 entfallen (2×2-Region unten rechts ist unlösbar). */
const PUZZLES: number[][][] = (() => {
  // Basis 2: Norvig/Krazydad – Barry Hayes Board (verifiziert lösbar)
  const base2: number[][] = [
    [0, 1, 1, 1, 1, 1, 2, 3, 3, 3],
    [0, 1, 1, 1, 1, 1, 2, 3, 3, 3],
    [0, 0, 0, 1, 1, 1, 2, 3, 3, 3],
    [0, 4, 0, 1, 1, 1, 1, 3, 3, 3],
    [4, 4, 4, 1, 1, 5, 5, 6, 6, 6],
    [4, 4, 7, 7, 5, 5, 5, 5, 5, 5],
    [4, 7, 7, 8, 8, 8, 8, 8, 8, 5],
    [4, 7, 7, 9, 9, 8, 8, 8, 8, 8],
    [4, 7, 7, 7, 9, 9, 9, 8, 8, 8],
    [4, 4, 4, 9, 9, 9, 9, 8, 8, 8],
  ]
  // Basis 3: „24“-Puzzle (Thomas Snyder, Norvig gelöst)
  const base3: number[][] = [
    [0, 0, 0, 1, 1, 2, 2, 2, 2, 2],
    [0, 3, 3, 3, 1, 4, 2, 4, 2, 8],
    [0, 0, 0, 3, 1, 4, 2, 4, 8, 8],
    [0, 3, 3, 3, 1, 4, 4, 4, 8, 8],
    [0, 3, 5, 5, 5, 6, 7, 4, 7, 8],
    [0, 3, 3, 3, 5, 6, 7, 4, 7, 8],
    [0, 0, 5, 5, 5, 6, 7, 7, 7, 8],
    [9, 9, 5, 6, 6, 6, 6, 6, 7, 8],
    [9, 9, 5, 5, 5, 9, 8, 6, 7, 8],
    [9, 9, 9, 9, 9, 9, 8, 8, 8, 8],
  ]
  const mirrorH = (m: number[][]) => m.map((row) => [...row].reverse())
  const mirrorV = (m: number[][]) => [...m].reverse()
  const rot90 = (m: number[][]) =>
    Array.from({ length: 10 }, (_, r) => Array.from({ length: 10 }, (_, c) => m[9 - c][r]))
  const rot180 = (m: number[][]) => mirrorV(mirrorH(m))
  const rot270 = (m: number[][]) => rot90(rot180(m))
  const permute = (m: number[][], p: number[]) =>
    m.map((row) => row.map((id) => p[id]))
  const perm = (seed: number) => {
    const p = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    for (let i = 0; i < 10; i++) {
      const j = (seed + i * 7) % 10
      ;[p[i], p[j]] = [p[j], p[i]]
    }
    return p
  }
  const bases = [base2, base3]
  const layouts: number[][][] = []
  for (const b of bases) {
    layouts.push(b, mirrorH(b), mirrorV(b), rot90(b), rot180(b), rot270(b), mirrorH(rot90(b)), mirrorV(rot90(b)))
  }
  const out: number[][][] = []
  for (let i = 0; i < 50; i++) {
    out.push(permute(layouts[i % layouts.length], perm(i)))
  }
  return out
})()

/** Musterlösungen für alle 50 Felder (Norvig board1/board24, gleiche Transformationen wie Layouts). */
const SOLUTIONS: Set<string>[] = (() => {
  const key = (r: number, c: number) => `${r},${c}`
  const idxToKey = (i: number) => key(Math.floor(i / 10), i % 10)
  // Norvig board1 (base2) Lösung: Zell-Indizes 0–99
  const base2Idx = [6, 8, 11, 14, 26, 28, 30, 32, 47, 49, 53, 55, 61, 69, 73, 75, 80, 87, 92, 94]
  const base2Keys = new Set(base2Idx.map(idxToKey))
  // Norvig board24 (base3) Lösung
  const base3Idx = [6, 9, 12, 14, 20, 27, 32, 34, 47, 49, 50, 55, 63, 68, 71, 75, 83, 88, 91, 96]
  const base3Keys = new Set(base3Idx.map(idxToKey))

  const transformKeys = (keys: Set<string>, t: (r: number, c: number) => [number, number]): Set<string> => {
    const out = new Set<string>()
    keys.forEach((k) => {
      const [r, c] = k.split(',').map(Number)
      const [r2, c2] = t(r, c)
      out.add(key(r2, c2))
    })
    return out
  }
  const N = 9
  const transforms: Array<(r: number, c: number) => [number, number]> = [
    (r, c) => [r, c],
    (r, c) => [r, N - c],
    (r, c) => [N - r, c],
    (r, c) => [c, N - r],
    (r, c) => [N - r, N - c],
    (r, c) => [N - c, r],
    (r, c) => [c, r],
    (r, c) => [N - c, N - r],
  ]
  const layoutSolutions: Set<string>[] = []
  for (const keys of [base2Keys, base3Keys]) {
    for (const t of transforms) {
      layoutSolutions.push(transformKeys(keys, t))
    }
  }
  const out: Set<string>[] = []
  for (let i = 0; i < 50; i++) {
    out.push(layoutSolutions[i % layoutSolutions.length])
  }
  return out
})()

const REGION_BG: string[] = [
  'bg-rose-50',
  'bg-amber-50',
  'bg-sky-50',
  'bg-emerald-50',
  'bg-violet-50',
  'bg-pink-50',
  'bg-lime-50',
  'bg-cyan-50',
  'bg-orange-50',
  'bg-fuchsia-50',
]
const REGION_BG_DARK: string[] = [
  'bg-rose-900/35',
  'bg-amber-900/35',
  'bg-sky-900/35',
  'bg-emerald-900/35',
  'bg-violet-900/35',
  'bg-pink-900/35',
  'bg-lime-900/35',
  'bg-cyan-900/35',
  'bg-orange-900/35',
  'bg-fuchsia-900/35',
]
const REGION_BG_SABI: string[] = [
  'bg-rose-200/80',
  'bg-pink-200/80',
  'bg-fuchsia-200/80',
  'bg-rose-300/70',
  'bg-pink-300/70',
  'bg-fuchsia-300/70',
  'bg-rose-200/70',
  'bg-pink-200/70',
  'bg-fuchsia-200/70',
  'bg-rose-300/60',
]

function makeGrid<T>(value: T) {
  return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => value))
}

function keyOf(r: number, c: number) {
  return `${r},${c}`
}

function inBounds(r: number, c: number) {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE
}

function formatTime(seconds: number) {
  const mm = Math.floor(seconds / 60)
  const ss = seconds % 60
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

type Theme = 'light' | 'dark' | 'sabi'
const THEME_KEY = 'sabis-starbattle-theme'

function StarBattleGame() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const s = localStorage.getItem(THEME_KEY)
      if (s === 'dark' || s === 'sabi' || s === 'light') return s
    } catch {
      /* ignore */
    }
    return 'light'
  })
  const [hintCount, setHintCount] = useState(0)
  const [puzzleIndex, setPuzzleIndex] = useState(0)
  const regions = PUZZLES[puzzleIndex]
  const [cells, setCells] = useState<CellState[][]>(() => makeGrid<CellState>('empty'))
  const [autoX, setAutoX] = useState(false)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [checkPulse, setCheckPulse] = useState<null | { ok: boolean; text: string }>(null)
  const [wrongStarsAfterCheck, setWrongStarsAfterCheck] = useState<Set<string> | null>(null)
  const [hintMessage, setHintMessage] = useState<string | null>(null)
  const [hintWrongStars, setHintWrongStars] = useState<Set<string> | null>(null)
  const [sabiModal, setSabiModal] = useState<'confirm' | 'rejected' | null>(null)
  const checkWrongTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hintWrongTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* ignore */
    }
    const root = document.documentElement
    root.classList.remove('dark', 'theme-sabi')
    if (theme === 'dark') root.classList.add('dark')
    if (theme === 'sabi') root.classList.add('theme-sabi')
  }, [theme])

  function selectPuzzle(idx: number) {
    if (idx === puzzleIndex) return
    setPuzzleIndex(idx)
    setCells(makeGrid<CellState>('empty'))
    setStartedAt(null)
    setElapsedSec(0)
    setCheckPulse(null)
    setWrongStarsAfterCheck(null)
    setHintMessage(null)
    setHintWrongStars(null)
    if (checkWrongTimeoutRef.current) {
      clearTimeout(checkWrongTimeoutRef.current)
      checkWrongTimeoutRef.current = null
    }
    if (hintWrongTimeoutRef.current) {
      clearTimeout(hintWrongTimeoutRef.current)
      hintWrongTimeoutRef.current = null
    }
  }

  const ticking = startedAt !== null && checkPulse?.ok !== true
  const lastTickRef = useRef<number>(0)

  useEffect(() => {
    if (!ticking) return
    const id = window.setInterval(() => {
      const now = Date.now()
      if (lastTickRef.current === 0) lastTickRef.current = now
      setElapsedSec(Math.floor((now - (startedAt ?? now)) / 1000))
    }, 250)
    return () => window.clearInterval(id)
  }, [ticking, startedAt])

  useEffect(() => {
    return () => {
      if (checkWrongTimeoutRef.current) {
        clearTimeout(checkWrongTimeoutRef.current)
        checkWrongTimeoutRef.current = null
      }
      if (hintWrongTimeoutRef.current) {
        clearTimeout(hintWrongTimeoutRef.current)
        hintWrongTimeoutRef.current = null
      }
    }
  }, [])

  const stats = useMemo(() => computeStats(cells, regions), [cells, regions])
  const conflicts = useMemo(() => computeAdjacencyConflicts(cells), [cells])
  const solved = useMemo(() => isSolved(stats, conflicts), [stats, conflicts])

  useEffect(() => {
    if (!solved) return
    setCheckPulse({ ok: true, text: 'Gelöst! Alle Regeln erfüllt.' })
  }, [solved])

  function startIfNeeded() {
    if (startedAt !== null) return
    const now = Date.now()
    lastTickRef.current = now
    setStartedAt(now)
  }

  function cycleCell(r: number, c: number) {
    startIfNeeded()
    setCheckPulse(null)
    setWrongStarsAfterCheck(null)
    setHintMessage(null)
    setHintWrongStars(null)
    if (hintWrongTimeoutRef.current) {
      clearTimeout(hintWrongTimeoutRef.current)
      hintWrongTimeoutRef.current = null
    }
    if (checkWrongTimeoutRef.current) {
      clearTimeout(checkWrongTimeoutRef.current)
      checkWrongTimeoutRef.current = null
    }

    setCells((prev) => {
      const next = prev.map((row) => row.slice())
      const cur = next[r][c]
      const after: CellState = cur === 'empty' ? 'x' : cur === 'x' ? 'star' : 'empty'

      next[r][c] = after

      if (after === 'star') {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          // best-effort haptics
          try {
            navigator.vibrate(10)
          } catch {
            // ignore
          }
        }

        if (autoX) {
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue
              const rr = r + dr
              const cc = c + dc
              if (!inBounds(rr, cc)) continue
              if (next[rr][cc] === 'empty') next[rr][cc] = 'x'
            }
          }
        }
      }

      // If user clears a star, don't auto-clear Xs (helper is conservative).
      return next
    })
  }

  function clearBoard() {
    setCells(makeGrid<CellState>('empty'))
    setStartedAt(null)
    setElapsedSec(0)
    setCheckPulse(null)
    setWrongStarsAfterCheck(null)
    setHintMessage(null)
    setHintWrongStars(null)
    lastTickRef.current = 0
    if (checkWrongTimeoutRef.current) {
      clearTimeout(checkWrongTimeoutRef.current)
      checkWrongTimeoutRef.current = null
    }
    if (hintWrongTimeoutRef.current) {
      clearTimeout(hintWrongTimeoutRef.current)
      hintWrongTimeoutRef.current = null
    }
  }

  function onHint() {
    setHintCount((c) => c + 1)
    if (hintWrongTimeoutRef.current) {
      clearTimeout(hintWrongTimeoutRef.current)
      hintWrongTimeoutRef.current = null
    }
    setHintWrongStars(null)
    const solution = SOLUTIONS[puzzleIndex]
    const userStars = new Set<string>()
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (cells[r][c] === 'star') userStars.add(keyOf(r, c))
      }
    }
    const wrong = new Set<string>()
    userStars.forEach((k) => {
      if (!solution.has(k)) wrong.add(k)
    })
    if (wrong.size > 0) {
      setHintWrongStars(wrong)
      setHintMessage('Manche Sterne entsprechen nicht der Musterlösung.')
      hintWrongTimeoutRef.current = setTimeout(() => {
        setHintWrongStars(null)
        hintWrongTimeoutRef.current = null
      }, 2000)
    } else if (userStars.size === solution.size) {
      setHintMessage('Deine Sterne entsprechen der Musterlösung. Gelöst!')
    } else {
      setHintMessage(`Alle gesetzten Sterne sind korrekt. Noch ${solution.size - userStars.size} Stern(e) fehlen.`)
    }
  }

  function onCheck() {
    if (checkWrongTimeoutRef.current) {
      clearTimeout(checkWrongTimeoutRef.current)
      checkWrongTimeoutRef.current = null
    }
    setWrongStarsAfterCheck(null)

    const s = computeStats(cells, regions)
    const adj = computeAdjacencyConflicts(cells)

    const problems: string[] = []
    if (adj.size > 0) problems.push('Sterne berühren sich (Adjazenz-Regel verletzt).')

    const badRowIdx = s.rows.map((x, i) => (x > STARS_PER_UNIT ? i + 1 : null)).filter((x): x is number => x !== null)
    const badColIdx = s.cols.map((x, i) => (x > STARS_PER_UNIT ? i + 1 : null)).filter((x): x is number => x !== null)
    const badRegIdx = s.regions.map((x, i) => (x > STARS_PER_UNIT ? i : null)).filter((x): x is number => x !== null)
    if (badRowIdx.length) problems.push(`Zeile(n) ${badRowIdx.join(', ')}: mehr als 2 Sterne.`)
    if (badColIdx.length) problems.push(`Spalte(n) ${badColIdx.join(', ')}: mehr als 2 Sterne.`)
    if (badRegIdx.length) problems.push(`Region(en) ${badRegIdx.join(', ')}: mehr als 2 Sterne.`)

    if (problems.length === 0) {
      setCheckPulse({ ok: true, text: 'Die gesetzten Sterne sind korrekt.' })
    } else {
      const wrongKeys = getWrongStarKeys(cells, regions, adj, s)
      setWrongStarsAfterCheck(wrongKeys)
      setCheckPulse({ ok: false, text: 'Nicht korrekt: ' + problems.join(' ') })
      checkWrongTimeoutRef.current = setTimeout(() => {
        setWrongStarsAfterCheck(null)
        checkWrongTimeoutRef.current = null
      }, 1800)
    }
  }

  const isDark = theme === 'dark'
  const isSabi = theme === 'sabi'
  const bgMain = isSabi ? 'bg-pink-50' : isDark ? 'bg-slate-900' : 'bg-slate-50'
  const textMain = isSabi ? 'text-pink-950' : isDark ? 'text-slate-100' : 'text-slate-900'
  const cardCls = isSabi
    ? 'bg-pink-100/80 ring-pink-300 text-pink-950'
    : isDark
      ? 'bg-slate-800 ring-slate-600 text-slate-100'
      : 'bg-white ring-slate-200 text-slate-900'
  const mutedCls = isSabi ? 'text-pink-700' : isDark ? 'text-slate-400' : 'text-slate-500'

  return (
    <div className={cn('min-h-[100dvh] max-h-[100dvh] w-full overscroll-none', bgMain, textMain)}>
      {sabiModal === 'confirm' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="sabi-dialog-title">
          <div className={cn('w-full max-w-sm rounded-2xl p-5 shadow-xl ring-1', cardCls)}>
            <p id="sabi-dialog-title" className="mb-4 text-center font-semibold">Bist du Sabi?</p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => { setTheme('sabi'); setSabiModal(null) }}
                className="rounded-xl px-4 py-2 text-sm font-semibold ring-1 ring-pink-500 bg-pink-400 text-pink-950 transition hover:bg-pink-300"
              >
                Ja
              </button>
              <button
                type="button"
                onClick={() => setSabiModal('rejected')}
                className={cn('rounded-xl px-4 py-2 text-sm font-semibold ring-1 transition', isDark ? 'bg-slate-700 text-slate-200 ring-slate-600 hover:bg-slate-600' : 'bg-slate-200 text-slate-800 ring-slate-300 hover:bg-slate-300')}
              >
                Nein
              </button>
            </div>
          </div>
        </div>
      )}
      {sabiModal === 'rejected' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="sabi-rejected-title">
          <div className={cn('w-full max-w-sm rounded-2xl p-5 shadow-xl ring-1', cardCls)}>
            <p id="sabi-rejected-title" className="mb-4 text-center font-semibold">Dann kann ich leider nichts für dich tun.</p>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setSabiModal(null)}
                className={cn('rounded-xl px-4 py-2 text-sm font-semibold ring-1 transition', isSabi ? 'bg-pink-400 text-pink-950 ring-pink-500 hover:bg-pink-300' : isDark ? 'bg-slate-600 text-white ring-slate-500 hover:bg-slate-500' : 'bg-slate-200 text-slate-800 ring-slate-300 hover:bg-slate-300')}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto flex h-full w-full max-w-xl flex-col gap-3 px-3 py-3">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-left">
            <div className={cn('text-sm font-medium', mutedCls)}>Sabis Star Battle</div>
            <div className="text-xl font-semibold tracking-tight">10×10 • 2 Sterne</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className={cn('flex gap-1 rounded-lg p-0.5 ring-1', isSabi ? 'bg-pink-200/50 ring-pink-300' : isDark ? 'bg-slate-800 ring-slate-600' : 'bg-slate-200 ring-slate-200')}>
              <button type="button" onClick={() => setTheme('light')} className={cn('rounded-md p-1.5', theme === 'light' && (isSabi ? 'bg-pink-300 text-pink-950' : isDark ? 'bg-slate-700 text-white' : 'bg-white text-slate-900 shadow-sm'))} aria-label="Hell"><Sun className="h-4 w-4" /></button>
              <button type="button" onClick={() => setTheme('dark')} className={cn('rounded-md p-1.5', theme === 'dark' && 'bg-slate-700 text-white shadow-sm')} aria-label="Dunkel"><Moon className="h-4 w-4" /></button>
              <button
                type="button"
                onClick={() => setSabiModal('confirm')}
                className={cn('rounded-md p-1.5', theme === 'sabi' && 'bg-pink-400 text-pink-950 shadow-sm')}
                aria-label="Ich bin Sabi"
              >
                <Heart className="h-4 w-4" />
              </button>
            </div>
            <label className={cn('flex items-center gap-2 text-sm ring-1 rounded-lg px-2 py-1.5', cardCls)}>
              <span className={mutedCls}>Feld:</span>
              <select
                value={puzzleIndex}
                onChange={(e) => selectPuzzle(Number(e.target.value))}
                className={cn('rounded bg-transparent font-medium focus:outline-none', textMain)}
              >
                {PUZZLES.map((_, i) => (
                  <option key={i} value={i}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <div className={cn('rounded-xl px-3 py-2 text-sm font-semibold ring-1', cardCls)}>
              <span className={mutedCls}>Zeit</span>{' '}
              <span className="tabular-nums">{formatTime(elapsedSec)}</span>
            </div>
          </div>
        </header>

        <div className="flex items-center justify-between gap-2">
          <label className={cn('flex items-center gap-2 rounded-xl px-3 py-2 text-sm ring-1', cardCls)}>
            <input
              type="checkbox"
              className={cn('h-4 w-4', isSabi ? 'accent-pink-600' : 'accent-slate-900')}
              checked={autoX}
              onChange={(e) => setAutoX(e.target.checked)}
            />
            <span className="font-medium">Auto‑X Nachbarn</span>
          </label>
          <div className={cn('text-right text-xs', mutedCls)}>
            Konflikte: <span className={cn(conflicts.size ? 'font-semibold text-red-500' : 'font-medium')}>{conflicts.size}</span>
            {' · '}
            Hint: <span className="tabular-nums font-medium">{hintCount}</span>
          </div>
        </div>

        <div className="flex w-full flex-col items-center gap-3">
          <Grid cells={cells} regions={regions} conflicts={conflicts} wrongStars={wrongStarsAfterCheck} hintWrongStars={hintWrongStars} onCellClick={cycleCell} theme={theme} />

          <div className="grid w-full grid-cols-3 gap-2">
            <button
              onClick={onHint}
              className={cn('inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ring-1 transition', cardCls, isSabi ? 'hover:bg-pink-200/80' : isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50')}
            >
              <Lightbulb className="h-4 w-4" />
              Hint
            </button>
            <button
              onClick={onCheck}
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ring-1 transition',
                checkPulse?.ok === false
                  ? isSabi ? 'bg-pink-200 text-red-700 ring-red-300' : isDark ? 'bg-slate-800 text-red-400 ring-red-500' : 'bg-white text-red-700 ring-red-200'
                  : checkPulse?.ok === true
                    ? 'bg-emerald-600 text-white ring-emerald-700/20'
                    : cn(cardCls, isSabi ? 'hover:bg-pink-200/80' : isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'),
              )}
            >
              <BadgeCheck className="h-4 w-4" />
              Check
            </button>
            <button
              onClick={clearBoard}
              className={cn('inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ring-1 transition', cardCls, isSabi ? 'hover:bg-pink-200/80' : isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50')}
            >
              <RotateCcw className="h-4 w-4" />
              Clear Board
            </button>
          </div>

          {checkPulse && (
            <div
              className={cn(
                'w-full rounded-xl px-4 py-3 text-sm ring-1',
                checkPulse.ok ? 'bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-700' : 'bg-red-50 text-red-900 ring-red-200 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-700',
              )}
            >
              {checkPulse.text}
            </div>
          )}

          {hintMessage && (
            <div className={cn('w-full rounded-xl px-4 py-3 text-sm ring-1', isSabi ? 'bg-pink-200/80 text-pink-950 ring-pink-300' : 'bg-sky-50 text-sky-900 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-200 dark:ring-sky-700')}>
              {hintMessage}
            </div>
          )}

          <StatsDisplay stats={stats} theme={theme} />
        </div>

        <footer className={cn('mt-auto pb-1 text-center text-[11px]', mutedCls)}>
          Tippen: Leer → X → Stern → Leer. Sterne dürfen sich nicht berühren (auch diagonal).
        </footer>
      </div>
    </div>
  )
}

function Grid(props: {
  cells: CellState[][]
  regions: number[][]
  conflicts: Set<string>
  wrongStars: Set<string> | null
  hintWrongStars: Set<string> | null
  onCellClick: (r: number, c: number) => void
  theme: Theme
}) {
  const { cells, regions, conflicts, wrongStars, hintWrongStars, onCellClick, theme } = props
  const isDark = theme === 'dark'
  const isSabi = theme === 'sabi'
  const gridRing = isSabi ? 'ring-pink-300' : isDark ? 'ring-slate-600' : 'ring-slate-200'
  return (
    <div
      className={cn(
        'w-full max-w-[min(90vw,70vh)]',
        'aspect-square',
        'rounded-2xl shadow-sm ring-1 touch-manipulation select-none',
        isSabi ? 'bg-pink-100/90' : isDark ? 'bg-slate-800' : 'bg-white',
        gridRing,
      )}
    >
      <div className="grid h-full w-full grid-cols-10 grid-rows-10 overflow-hidden rounded-2xl [&>*]:min-w-0 [&>*]:min-h-0">
        {cells.map((row, r) =>
          row.map((state, c) => (
            <Cell
              key={keyOf(r, c)}
              r={r}
              c={c}
              state={state}
              regionId={regions[r][c]}
              border={borderFor(regions, r, c)}
              isConflict={conflicts.has(keyOf(r, c))}
              isWrong={(wrongStars !== null && wrongStars.has(keyOf(r, c))) || (hintWrongStars !== null && hintWrongStars.has(keyOf(r, c)))}
              onClick={() => onCellClick(r, c)}
              theme={theme}
            />
          )),
        )}
      </div>
    </div>
  )
}

function Cell(props: {
  r: number
  c: number
  state: CellState
  regionId: number
  border: Record<Dir, boolean>
  isConflict: boolean
  isWrong: boolean
  onClick: () => void
  theme: Theme
}) {
  const { state, regionId, border, isConflict, isWrong, onClick, theme } = props
  const isDark = theme === 'dark'
  const isSabi = theme === 'sabi'
  const bgArray = isSabi ? REGION_BG_SABI : isDark ? REGION_BG_DARK : REGION_BG
  const bg = bgArray[regionId % bgArray.length]
  const borderCl = isSabi ? 'border-pink-400/60' : isDark ? 'border-slate-500/60' : 'border-slate-300/70'
  const conflictWrongCl = isSabi
    ? 'bg-red-200 ring-red-500'
    : isDark
      ? 'bg-red-900/50 ring-red-400'
      : 'bg-red-100 ring-red-500'
  const starCl = (isConflict || isWrong) ? 'text-red-700' : isSabi ? 'text-pink-900' : isDark ? 'text-slate-100' : 'text-slate-900'
  const xCl = isDark ? 'text-slate-500' : 'text-slate-400'

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex h-full w-full min-h-0 min-w-0 items-center justify-center',
        'touch-manipulation select-none',
        borderCl,
        bg,
        border.t ? 'border-t-4' : 'border-t',
        border.r ? 'border-r-4' : 'border-r',
        border.b ? 'border-b-4' : 'border-b',
        border.l ? 'border-l-4' : 'border-l',
        isConflict && state === 'star' && conflictWrongCl,
        isConflict && state === 'star' && 'ring-inset ring-2 animate-pulse',
        isWrong && state === 'star' && conflictWrongCl,
        isWrong && state === 'star' && 'ring-inset ring-2 animate-pulse',
        'active:brightness-95',
        isSabi ? 'outline-none focus-visible:ring-2 focus-visible:ring-pink-500/50' : isDark ? 'outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50' : 'outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30',
      )}
      aria-label={`Zelle ${props.r + 1},${props.c + 1}`}
    >
      {state === 'x' && <XIcon className={cn('h-[60%] w-[60%] max-h-full max-w-full shrink-0', xCl)} strokeWidth={2.25} />}
      {state === 'star' && <StarIcon className={cn('h-[60%] w-[60%] max-h-full max-w-full shrink-0', starCl)} fill="currentColor" strokeWidth={1.5} />}
    </button>
  )
}

function StatsDisplay(props: { stats: ReturnType<typeof computeStats>; theme: Theme }) {
  const { stats, theme } = props
  return (
    <div className="grid w-full grid-cols-3 gap-2">
      <StatColumn theme={theme} title="Rows" items={stats.rows.map((n, i) => ({ label: `R${i + 1}`, value: n }))} />
      <StatColumn theme={theme} title="Cols" items={stats.cols.map((n, i) => ({ label: `C${i + 1}`, value: n }))} />
      <StatColumn theme={theme} title="Regions" items={stats.regions.map((n, i) => ({ label: `G${i}`, value: n }))} />
    </div>
  )
}

function StatColumn(props: { theme: Theme; title: string; items: Array<{ label: string; value: number }> }) {
  const { theme, title, items } = props
  const isDark = theme === 'dark'
  const isSabi = theme === 'sabi'
  const cardCls = isSabi ? 'bg-pink-100/90 ring-pink-300' : isDark ? 'bg-slate-800 ring-slate-600' : 'bg-white ring-slate-200'
  const titleCls = isSabi ? 'text-pink-800' : isDark ? 'text-slate-400' : 'text-slate-600'
  return (
    <section className={cn('rounded-2xl p-2 shadow-sm ring-1', cardCls)}>
      <div className={cn('px-1 pb-2 text-xs font-semibold', titleCls)}>{title}</div>
      <div className="max-h-28 space-y-1 overflow-auto pr-1">
        {items.map((it) => {
          const cls =
            it.value > STARS_PER_UNIT
              ? isSabi
                ? 'text-red-700 bg-red-200/80 ring-red-300 animate-pulse'
                : isDark
                  ? 'text-red-300 bg-red-900/40 ring-red-600 animate-pulse'
                  : 'text-red-700 bg-red-50 ring-red-200 animate-pulse'
              : it.value === STARS_PER_UNIT
                ? isSabi
                  ? 'text-emerald-800 bg-emerald-200/80 ring-emerald-300'
                  : isDark
                    ? 'text-emerald-300 bg-emerald-900/40 ring-emerald-600'
                    : 'text-emerald-700 bg-emerald-50 ring-emerald-200'
                : isSabi
                  ? 'text-pink-700 bg-pink-200/60 ring-pink-300'
                  : isDark
                    ? 'text-slate-400 bg-slate-700/50 ring-slate-600'
                    : 'text-slate-600 bg-slate-50 ring-slate-200'
          return (
            <div
              key={it.label}
              className={cn('flex items-center justify-between rounded-lg px-2 py-1 text-[11px] font-medium ring-1', cls)}
            >
              <span className="tabular-nums">{it.label}</span>
              <span className="tabular-nums">
                {it.value}/{STARS_PER_UNIT}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function borderFor(regions: number[][], r: number, c: number): Record<Dir, boolean> {
  const id = regions[r][c]
  return {
    t: r === 0 || regions[r - 1][c] !== id,
    r: c === SIZE - 1 || regions[r][c + 1] !== id,
    b: r === SIZE - 1 || regions[r + 1][c] !== id,
    l: c === 0 || regions[r][c - 1] !== id,
  }
}

function computeAdjacencyConflicts(cells: CellState[][]) {
  const bad = new Set<string>()
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (cells[r][c] !== 'star') continue
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue
          const rr = r + dr
          const cc = c + dc
          if (!inBounds(rr, cc)) continue
          if (cells[rr][cc] === 'star') {
            bad.add(keyOf(r, c))
            bad.add(keyOf(rr, cc))
          }
        }
      }
    }
  }
  return bad
}

function computeStats(cells: CellState[][], regionMap: number[][]) {
  const rows = Array.from({ length: SIZE }, () => 0)
  const cols = Array.from({ length: SIZE }, () => 0)
  const regionCount = Math.max(...regionMap.flat()) + 1
  const regions = Array.from({ length: regionCount }, () => 0)

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (cells[r][c] !== 'star') continue
      rows[r]++
      cols[c]++
      regions[regionMap[r][c]]++
    }
  }

  return { rows, cols, regions }
}

function getWrongStarKeys(
  cells: CellState[][],
  regionMap: number[][],
  adj: Set<string>,
  s: ReturnType<typeof computeStats>,
): Set<string> {
  const wrong = new Set<string>()
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (cells[r][c] !== 'star') continue
      const key = keyOf(r, c)
      if (adj.has(key)) wrong.add(key)
      else if (s.rows[r] > STARS_PER_UNIT) wrong.add(key)
      else if (s.cols[c] > STARS_PER_UNIT) wrong.add(key)
      else if (s.regions[regionMap[r][c]] > STARS_PER_UNIT) wrong.add(key)
    }
  }
  return wrong
}

function isSolved(stats: ReturnType<typeof computeStats>, conflicts: Set<string>) {
  if (conflicts.size > 0) return false
  if (stats.rows.some((x) => x !== STARS_PER_UNIT)) return false
  if (stats.cols.some((x) => x !== STARS_PER_UNIT)) return false
  if (stats.regions.some((x) => x !== STARS_PER_UNIT)) return false
  return true
}

export default function App() {
  return <StarBattleGame />
}
