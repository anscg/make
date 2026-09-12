// Inline text effects, written into script text as tags: "so [wobble]haunted![/wobble]".
// Tags may span several words and may nest. Each effect maps to a CSS class in
// globals.css that animates one letter at a time, phased by `--i`, so the
// letters ripple instead of moving as a block. `[count]` is the exception:
// RevealText renders a counted run as one block (CountUp.tsx) that rolls its
// number up from zero, and the class only fixes the digit widths.
export const TEXT_EFFECTS: Record<string, string> = {
  wobble: "dlg-fx-wobble",
  shake: "dlg-fx-shake",
  count: "dlg-fx-count",
}

export const COUNT_EFFECT = "count"

export type CountSpec = { prefix: string; value: number; decimals: number; suffix: string }

const COUNT_NUMBER = /^(\D*?)(\d+(?:\.(\d+))?)(.*)$/

// "83%" → 83 with a "%" suffix; "$1.50" → 1.50 with a "$" prefix. Only the
// number animates, and it keeps the decimal places it was written with.
export function parseCount(text: string): CountSpec | null {
  const match = COUNT_NUMBER.exec(text)
  if (!match) return null
  const [, prefix, number, fraction = "", suffix] = match
  return { prefix, value: Number(number), decimals: fraction.length, suffix }
}

export type TextRun = { text: string; effects: string[] }

const TAG = /\[(\/?)([a-z]+)\]/gi

// Splits a line into runs of text with the effects active over each one.
// Unknown tags are left in the text so a typo is visible rather than silent.
export function parseEffects(line: string): TextRun[] {
  const runs: TextRun[] = []
  const active: string[] = []
  let last = 0
  for (const match of line.matchAll(TAG)) {
    const [raw, closing, name] = match
    if (!(name in TEXT_EFFECTS)) continue
    if (match.index > last) runs.push({ text: line.slice(last, match.index), effects: [...active] })
    last = match.index + raw.length
    if (closing) {
      const i = active.lastIndexOf(name)
      if (i >= 0) active.splice(i, 1)
    } else {
      active.push(name)
    }
  }
  if (last < line.length) runs.push({ text: line.slice(last), effects: [...active] })
  return runs
}

export type Word = { chars: { char: string; effects: string[] }[] }

// Words are the unit that reveals; characters keep their own effects so a tag
// can start or stop mid-word.
export function splitWords(runs: TextRun[]): Word[] {
  const words: Word[] = []
  let current: Word | null = null
  for (const run of runs) {
    for (const char of run.text) {
      if (/\s/.test(char)) {
        current = null
        continue
      }
      if (!current) {
        current = { chars: [] }
        words.push(current)
      }
      current.chars.push({ char, effects: run.effects })
    }
  }
  return words
}
