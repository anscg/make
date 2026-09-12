"use client"

import { useMemo, useState, type ReactNode } from "react"
import {
  GAME_BUTTON_DESIGN,
  GAME_BUTTON_SIZES,
  GAME_BUTTON_TONES,
  GameButton,
  type GameButtonColors,
  type GameButtonSize,
  type GameButtonTone,
} from "@/app/components/GameButton"

const BACKDROPS = {
  plate: { label: "Plate", style: { background: "linear-gradient(180deg, #FFFFFF 0%, #F3F3F3 100%)" } },
  band: { label: "Band", style: { background: "#01BBFE" } },
  dark: { label: "Dark", style: { background: "#2B271F" } },
  sky: { label: "Sky", style: { background: "radial-gradient(120% 90% at 20% 0%, #7b6fe0 0%, #5d55c4 45%, #3d3591 100%)" } },
} as const

const COLOR_FIELDS: { key: keyof GameButtonColors; label: string; hint: string }[] = [
  { key: "faceTop", label: "Face top", hint: "gradient start" },
  { key: "faceBottom", label: "Face bottom", hint: "gradient end" },
  { key: "bevel", label: "Bevel", hint: "3D edge under the face" },
  { key: "ink", label: "Ink", hint: "text outline + drop" },
  { key: "text", label: "Text", hint: "fill" },
  { key: "shell", label: "Shell", hint: "outer border" },
]

// What each Figma measurement comes to at a given frame height, in design px.
const DERIVED: { key: keyof typeof GAME_BUTTON_DESIGN; label: string }[] = [
  { key: "fontSize", label: "text" },
  { key: "shellStroke", label: "shell" },
  { key: "faceStroke", label: "face border" },
  { key: "bevel", label: "bevel" },
  { key: "radius", label: "radius" },
  { key: "textStroke", label: "outline" },
]

const SIZE_LABELS: Record<GameButtonSize, string> = { lg: "Large", md: "Medium", sm: "Chip" }
const PRESETS = Object.keys(GAME_BUTTON_SIZES) as GameButtonSize[]

function hexToRgba(hex: string, alpha: number) {
  const n = parseInt(hex.replace("#", ""), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

// Tones store the face border as rgba; pull it apart for the pickers.
function splitRgba(value: string): { hex: string; alpha: number } {
  const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (!m) return { hex: value, alpha: 1 }
  const hex = "#" + [m[1], m[2], m[3]].map((c) => Number(c).toString(16).padStart(2, "0")).join("")
  return { hex, alpha: m[4] === undefined ? 1 : Number(m[4]) }
}

function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium text-black/60">
      {label}
      {children}
    </label>
  )
}

function Segmented<T extends string>({ value, options, onChange }: { value: T | null; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-black/10 text-sm">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 px-3 py-1.5 transition ${value === o.value ? "bg-black text-white" : "bg-white text-black/70 hover:bg-black/5"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

const numberInput = "w-20 rounded-lg border border-black/10 px-2 py-1 text-sm text-black outline-none focus:border-black/40"

export function ButtonPlayground() {
  const [text, setText] = useState("I’m a teen aged 13-18!")
  const [height, setHeight] = useState(GAME_BUTTON_SIZES.lg.height)
  const [width, setWidth] = useState<number | undefined>(GAME_BUTTON_SIZES.lg.width)
  const [tone, setTone] = useState<GameButtonTone>("blue")
  const [overrides, setOverrides] = useState<Partial<GameButtonColors>>({})
  const [borderAlpha, setBorderAlpha] = useState<number | null>(null)
  const [scale, setScale] = useState(1)
  const [selected, setSelected] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const [backdrop, setBackdrop] = useState<keyof typeof BACKDROPS>("plate")
  const [clicks, setClicks] = useState(0)

  const base = GAME_BUTTON_TONES[tone]
  const border = splitRgba(overrides.faceBorder ?? base.faceBorder)
  const colors = useMemo<GameButtonColors>(() => ({ ...base, ...overrides }), [base, overrides])
  const preset = PRESETS.find((k) => GAME_BUTTON_SIZES[k].height === height && GAME_BUTTON_SIZES[k].width === width) ?? null

  function setColor(key: keyof GameButtonColors, value: string) {
    setOverrides((o) => ({ ...o, [key]: value }))
  }
  function setBorder(hex: string, alpha: number) {
    setBorderAlpha(alpha)
    setOverrides((o) => ({ ...o, faceBorder: hexToRgba(hex, alpha) }))
  }
  function reset() {
    setOverrides({})
    setBorderAlpha(null)
  }
  function pickPreset(k: GameButtonSize) {
    setHeight(GAME_BUTTON_SIZES[k].height)
    setWidth(GAME_BUTTON_SIZES[k].width)
  }
  // The Figma frame the component replicates, for a 1:1 check.
  function pickFigma() {
    setText("Invite!")
    setHeight(GAME_BUTTON_DESIGN.height)
    setWidth(343)
    setTone("blue")
    reset()
  }

  const snippet = useMemo(() => {
    const props: string[] = []
    if (preset) {
      if (preset !== "lg") props.push(`size="${preset}"`)
    } else {
      props.push(`height={${height}}`)
      props.push(width === undefined ? `width="auto"` : `width={${width}}`)
    }
    if (tone !== "blue") props.push(`tone="${tone}"`)
    if (selected) props.push("selected")
    if (disabled) props.push("disabled")
    const changed = Object.entries(overrides).filter(([k, v]) => v !== base[k as keyof GameButtonColors])
    if (changed.length) {
      props.push(`colors={{ ${changed.map(([k, v]) => `${k}: "${v}"`).join(", ")} }}`)
    }
    return `<GameButton${props.length ? " " + props.join(" ") : ""}>${text}</GameButton>`
  }, [preset, height, width, tone, selected, disabled, overrides, base, text])

  const derived = (key: keyof typeof GAME_BUTTON_DESIGN) => ((height * GAME_BUTTON_DESIGN[key]) / GAME_BUTTON_DESIGN.height).toFixed(1)

  return (
    <main className="grid min-h-svh grid-cols-1 bg-[#f6f6f7] text-black lg:grid-cols-[360px_1fr]">
      <aside className="flex flex-col gap-5 border-b border-black/10 bg-white p-6 lg:border-r lg:border-b-0">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">GameButton</h1>
          <p className="text-xs text-black/50">
            Lives in <code className="rounded bg-black/5 px-1">app/components/GameButton.tsx</code>. Everything is a share of the frame
            height, from the Figma 343 × 158 “Invite!” button. Sizes are design px, without the outside stroke.
          </p>
        </div>

        <Field label="Text">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="rounded-lg border border-black/10 px-3 py-2 text-sm text-black outline-none focus:border-black/40"
          />
        </Field>

        <Field label="Preset">
          <Segmented value={preset} onChange={pickPreset} options={PRESETS.map((k) => ({ value: k, label: SIZE_LABELS[k] }))} />
        </Field>

        <Field label={`Height — ${height}`}>
          <input type="range" min={24} max={220} step={1} value={height} onChange={(e) => setHeight(Number(e.target.value))} className="accent-black" />
        </Field>

        <div className="flex flex-col gap-1.5 text-xs font-medium text-black/60">
          <span>Width</span>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Segmented
                value={width === undefined ? "auto" : "fixed"}
                onChange={(v) => setWidth(v === "auto" ? undefined : Math.round(height * 2.17))}
                options={[
                  { value: "auto", label: "Hug label" },
                  { value: "fixed", label: "Fixed" },
                ]}
              />
            </div>
            {width !== undefined && (
              <input type="number" min={height} step={1} value={width} onChange={(e) => setWidth(Number(e.target.value))} className={numberInput} />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5 text-xs text-black/60">
          <div className="flex items-center justify-between font-medium">
            <span>Derived from height</span>
            <button type="button" onClick={pickFigma} className="text-black/50 underline-offset-2 hover:underline">
              Figma 1:1
            </button>
          </div>
          <dl className="grid grid-cols-3 gap-x-3 gap-y-1 rounded-lg border border-black/10 px-3 py-2 font-mono text-[11px]">
            {DERIVED.map((d) => (
              <div key={d.key} className="flex justify-between gap-2">
                <dt className="text-black/40">{d.label}</dt>
                <dd>{derived(d.key)}</dd>
              </div>
            ))}
          </dl>
        </div>

        <Field label="Tone">
          <Segmented
            value={tone}
            onChange={(t) => {
              setTone(t)
              reset()
            }}
            options={[
              { value: "blue", label: "Blue" },
              { value: "pink", label: "Pink" },
            ]}
          />
        </Field>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-black/60">
            <span>Colours</span>
            <button type="button" onClick={reset} className="text-black/50 underline-offset-2 hover:underline">
              Reset to tone
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {COLOR_FIELDS.map((f) => (
              <label key={f.key} className="flex items-center gap-2 rounded-lg border border-black/10 px-2 py-1.5 text-xs">
                <input
                  type="color"
                  value={colors[f.key]}
                  onChange={(e) => setColor(f.key, e.target.value.toUpperCase())}
                  className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                <span className="flex flex-col leading-tight">
                  <span className="font-medium">{f.label}</span>
                  <span className="text-black/40">{f.hint}</span>
                </span>
              </label>
            ))}
            <label className="col-span-2 flex items-center gap-2 rounded-lg border border-black/10 px-2 py-1.5 text-xs">
              <input
                type="color"
                value={border.hex}
                onChange={(e) => setBorder(e.target.value, borderAlpha ?? border.alpha)}
                className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              <span className="flex flex-col leading-tight">
                <span className="font-medium">Face border</span>
                <span className="text-black/40">highlight ring, alpha {(borderAlpha ?? border.alpha).toFixed(2)}</span>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={borderAlpha ?? border.alpha}
                onChange={(e) => setBorder(border.hex, Number(e.target.value))}
                className="ml-auto w-24 accent-black"
              />
            </label>
          </div>
        </div>

        <Field label={`Scale — ${scale.toFixed(2)}× (sets --dlg-u)`}>
          <input type="range" min={0.3} max={1.6} step={0.05} value={scale} onChange={(e) => setScale(Number(e.target.value))} className="accent-black" />
        </Field>

        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={selected} onChange={(e) => setSelected(e.target.checked)} className="accent-black" />
            Selected
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} className="accent-black" />
            Disabled
          </label>
        </div>

        <Field label="Backdrop">
          <Segmented
            value={backdrop}
            onChange={setBackdrop}
            options={(Object.keys(BACKDROPS) as (keyof typeof BACKDROPS)[]).map((k) => ({ value: k, label: BACKDROPS[k].label }))}
          />
        </Field>

        <Field label="Usage">
          <pre className="overflow-x-auto rounded-lg bg-black p-3 font-mono text-[11px] leading-relaxed text-white/90">{snippet}</pre>
        </Field>
      </aside>

      <section className="relative flex flex-col">
        <div className="flex flex-1 items-center justify-center overflow-hidden p-10" style={BACKDROPS[backdrop].style}>
          <div style={{ ["--dlg-u" as string]: `${scale}px` }}>
            <GameButton
              height={height}
              width={width ?? "auto"}
              tone={tone}
              colors={overrides}
              selected={selected}
              disabled={disabled}
              onClick={() => setClicks((c) => c + 1)}
            >
              {text || "Button"}
            </GameButton>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-black/10 bg-white px-6 py-3 text-xs text-black/50">
          <span>The three presets at this scale</span>
          <span>Clicked {clicks}×</span>
        </div>
        <div className="flex flex-wrap items-end justify-center gap-8 bg-white px-6 pt-4 pb-8" style={{ ["--dlg-u" as string]: `${scale}px` }}>
          {PRESETS.map((s) => (
            <GameButton key={s} size={s} tone={tone} colors={overrides} selected={selected} disabled={disabled}>
              {text || "Button"}
            </GameButton>
          ))}
        </div>
      </section>
    </main>
  )
}
