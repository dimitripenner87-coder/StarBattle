import { useEffect, useMemo, useRef, useState } from 'react'
import { RotateCcw, BadgeCheck, Star as StarIcon, X as XIcon } from 'lucide-react'
import clsx from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: Array<string | false | null | undefined>) {
  return twMerge(clsx(inputs))
}

type CellState = 'empty' | 'x' | 'star'
type Dir = 't' | 'r' | 'b' | 'l'

const SIZE = 10
const STARS_PER_UNIT = 2

/** 50 auswählbare 10x10 Region-Layouts – typische Star-Battle-Formen (L, T, Streifen, Blöcke), u.a. von Krazydad/Norvig inspiriert. */
const PUZZLES: number[][][] = (() => {
  // Basis 1: Klassisch, überlappende Blöcke (rechteckig/ L-artig)
  const base1: number[][] = [
    [0, 0, 0, 1, 1, 1, 2, 2, 2, 2],
    [0, 0, 0, 1, 1, 1, 2, 2, 2, 2],
    [3, 3, 3, 3, 4, 4, 4, 5, 5, 5],
    [3, 3, 3, 3, 4, 4, 4, 5, 5, 5],
    [6, 6, 6, 6, 6, 7, 7, 7, 7, 7],
    [6, 6, 6, 6, 6, 7, 7, 7, 7, 7],
    [8, 8, 8, 8, 8, 8, 9, 9, 9, 9],
    [8, 8, 8, 8, 8, 8, 9, 9, 9, 9],
    [0, 0, 0, 0, 1, 1, 1, 1, 2, 2],
    [0, 0, 0, 0, 1, 1, 1, 1, 2, 2],
  ]
  // Basis 2: Norvig/Krazydad-Stil – L-Formen, unregelmäßige Regionen (Barry Hayes Board)
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
  // Basis 3: „24“-Puzzle (Thomas Snyder) – verschränkte 2er/4er-Formen
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
  // Basis 4: Lange Streifen + kleine Blöcke (typisch für Tutorials)
  const base4: number[][] = [
    [0, 0, 0, 0, 0, 1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0, 1, 1, 1, 1, 1],
    [2, 2, 2, 3, 3, 3, 4, 4, 4, 4],
    [2, 2, 2, 3, 3, 3, 4, 4, 4, 4],
    [2, 2, 5, 5, 5, 6, 6, 6, 7, 7],
    [8, 8, 5, 5, 5, 6, 6, 6, 7, 7],
    [8, 8, 8, 8, 9, 9, 9, 9, 9, 7],
    [8, 8, 8, 8, 9, 9, 9, 9, 9, 7],
    [8, 8, 8, 8, 9, 9, 9, 9, 9, 7],
    [8, 8, 8, 8, 9, 9, 9, 9, 9, 7],
  ]
  // Basis 5: T- und L-Formen
  const base5: number[][] = [
    [0, 0, 0, 1, 1, 2, 2, 2, 2, 2],
    [0, 0, 1, 1, 1, 1, 1, 2, 2, 2],
    [0, 3, 3, 3, 4, 4, 4, 4, 4, 5],
    [3, 3, 3, 3, 4, 4, 4, 4, 5, 5],
    [3, 3, 6, 6, 6, 6, 6, 5, 5, 5],
    [7, 7, 7, 6, 6, 6, 6, 6, 8, 8],
    [7, 7, 7, 7, 7, 8, 8, 8, 8, 8],
    [7, 7, 9, 9, 9, 9, 8, 8, 8, 8],
    [7, 7, 9, 9, 9, 9, 9, 9, 9, 9],
    [7, 7, 9, 9, 9, 9, 9, 9, 9, 9],
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
  const bases = [base1, base2, base3, base4, base5]
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

function StarBattleGame() {
  const [puzzleIndex, setPuzzleIndex] = useState(0)
  const regions = PUZZLES[puzzleIndex]
  const [cells, setCells] = useState<CellState[][]>(() => makeGrid<CellState>('empty'))
  const [autoX, setAutoX] = useState(false)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [checkPulse, setCheckPulse] = useState<null | { ok: boolean; text: string }>(null)

  function selectPuzzle(idx: number) {
    if (idx === puzzleIndex) return
    setPuzzleIndex(idx)
    setCells(makeGrid<CellState>('empty'))
    setStartedAt(null)
    setElapsedSec(0)
    setCheckPulse(null)
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
    lastTickRef.current = 0
  }

  function onCheck() {
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
      setCheckPulse({ ok: false, text: 'Nicht korrekt: ' + problems.join(' ') })
    }
  }

  return (
    <div className="min-h-[100dvh] max-h-[100dvh] w-full overscroll-none bg-slate-50 text-slate-900">
      <div className="mx-auto flex h-full w-full max-w-xl flex-col gap-3 px-3 py-3">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-left">
            <div className="text-sm font-medium text-slate-500">Star Battle</div>
            <div className="text-xl font-semibold tracking-tight">10×10 • 2 Sterne</div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium text-slate-600">Feld:</span>
            <select
              value={puzzleIndex}
              onChange={(e) => selectPuzzle(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-medium text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              {PUZZLES.map((_, i) => (
                <option key={i} value={i}>
                  {i + 1}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-white px-3 py-2 text-sm font-semibold shadow-sm ring-1 ring-slate-200">
              <span className="text-slate-500">Zeit</span>{' '}
              <span className="tabular-nums">{formatTime(elapsedSec)}</span>
            </div>
          </div>
        </header>

        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-slate-200">
            <input
              type="checkbox"
              className="h-4 w-4 accent-slate-900"
              checked={autoX}
              onChange={(e) => setAutoX(e.target.checked)}
            />
            <span className="font-medium">Auto‑X Nachbarn</span>
          </label>
          <div className="text-right text-xs text-slate-500">
            Konflikte: <span className={cn(conflicts.size ? 'font-semibold text-red-600' : 'font-medium')}>{conflicts.size}</span>
          </div>
        </div>

        <div className="flex w-full flex-col items-center gap-3">
          <Grid cells={cells} regions={regions} conflicts={conflicts} onCellClick={cycleCell} />

          <div className="grid w-full grid-cols-2 gap-2">
            <button
              onClick={onCheck}
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-sm ring-1 transition',
                checkPulse?.ok === false
                  ? 'bg-white text-red-700 ring-red-200'
                  : checkPulse?.ok === true
                    ? 'bg-emerald-600 text-white ring-emerald-700/20'
                    : 'bg-white text-slate-900 ring-slate-200 hover:bg-slate-50',
              )}
            >
              <BadgeCheck className="h-4 w-4" />
              Check
            </button>
            <button
              onClick={clearBoard}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" />
              Clear Board
            </button>
          </div>

          {checkPulse && (
            <div
              className={cn(
                'w-full rounded-xl px-4 py-3 text-sm shadow-sm ring-1',
                checkPulse.ok ? 'bg-emerald-50 text-emerald-900 ring-emerald-200' : 'bg-red-50 text-red-900 ring-red-200',
              )}
            >
              {checkPulse.text}
            </div>
          )}

          <StatsDisplay stats={stats} />
        </div>

        <footer className="mt-auto pb-1 text-center text-[11px] text-slate-500">
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
  onCellClick: (r: number, c: number) => void
}) {
  const { cells, regions, conflicts, onCellClick } = props
  return (
    <div
      className={cn(
        'w-full max-w-[min(90vw,70vh)]',
        'aspect-square',
        'rounded-2xl bg-white shadow-sm ring-1 ring-slate-200',
        'touch-manipulation select-none',
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
              onClick={() => onCellClick(r, c)}
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
  onClick: () => void
}) {
  const { state, regionId, border, isConflict, onClick } = props
  const bg = REGION_BG[regionId % REGION_BG.length]

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex h-full w-full min-h-0 min-w-0 items-center justify-center',
        'touch-manipulation select-none',
        'border-slate-300/70',
        bg,
        border.t ? 'border-t-4' : 'border-t',
        border.r ? 'border-r-4' : 'border-r',
        border.b ? 'border-b-4' : 'border-b',
        border.l ? 'border-l-4' : 'border-l',
        isConflict && state === 'star' && 'bg-red-100 ring-inset ring-2 ring-red-500',
        isConflict && state === 'star' && 'animate-pulse',
        'active:brightness-95',
        'outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30',
      )}
      aria-label={`Zelle ${props.r + 1},${props.c + 1}`}
    >
      {state === 'x' && <XIcon className="h-[60%] w-[60%] max-h-full max-w-full shrink-0 text-slate-400" strokeWidth={2.25} />}
      {state === 'star' && <StarIcon className={cn('h-[60%] w-[60%] max-h-full max-w-full shrink-0', isConflict ? 'text-red-700' : 'text-slate-900')} fill="currentColor" strokeWidth={1.5} />}
    </button>
  )
}

function StatsDisplay(props: { stats: ReturnType<typeof computeStats> }) {
  const { stats } = props
  return (
    <div className="grid w-full grid-cols-3 gap-2">
      <StatColumn title="Rows" items={stats.rows.map((n, i) => ({ label: `R${i + 1}`, value: n }))} />
      <StatColumn title="Cols" items={stats.cols.map((n, i) => ({ label: `C${i + 1}`, value: n }))} />
      <StatColumn title="Regions" items={stats.regions.map((n, i) => ({ label: `G${i}`, value: n }))} />
    </div>
  )
}

function StatColumn(props: { title: string; items: Array<{ label: string; value: number }> }) {
  return (
    <section className="rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
      <div className="px-1 pb-2 text-xs font-semibold text-slate-600">{props.title}</div>
      <div className="max-h-28 space-y-1 overflow-auto pr-1">
        {props.items.map((it) => {
          const cls =
            it.value > STARS_PER_UNIT
              ? 'text-red-700 bg-red-50 ring-red-200 animate-pulse'
              : it.value === STARS_PER_UNIT
                ? 'text-emerald-700 bg-emerald-50 ring-emerald-200'
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
