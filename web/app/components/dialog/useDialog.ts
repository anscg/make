"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type {
  Character,
  DialogContext,
  DialogNode,
  DialogPhase,
  DialogScript,
  DialogVars,
} from "./types"

type Options = {
  characters: Character[]
  vars?: DialogVars
  onComplete?: () => void
}

type State = {
  nodeId: string
  phase: DialogPhase
  // Bumped on every node change so the text reveal restarts even when two
  // consecutive nodes have identical text.
  revealKey: number
  skipped: boolean
  speakerId: string | undefined
  history: string[]
}

function interpolate(text: string, vars: DialogVars) {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => String(vars[key] ?? ""))
}

export function useDialog(script: DialogScript, options: Options) {
  const nodes = useMemo(() => {
    const map = new Map<string, DialogNode>()
    for (const node of script.nodes) map.set(node.id, node)
    return map
  }, [script])

  const characters = useMemo(() => {
    const map = new Map<string, Character>()
    for (const c of options.characters) map.set(c.id, c)
    return map
  }, [options.characters])

  const [vars, setVars] = useState<DialogVars>(options.vars ?? {})
  const startNode = nodes.get(script.start)
  const [state, setState] = useState<State>(() => ({
    nodeId: script.start,
    phase: startNode?.text ? "revealing" : startNode?.popup ? "popup" : "idle",
    revealKey: 0,
    skipped: false,
    speakerId: startNode?.speaker,
    history: [script.start],
  }))

  const node = nodes.get(state.nodeId)
  if (!node) throw new Error(`Dialog node "${state.nodeId}" does not exist`)

  const ctx = useMemo<DialogContext>(
    () => ({
      vars,
      setVar: (key, value) => setVars((v) => ({ ...v, [key]: value })),
      history: state.history,
    }),
    [vars, state.history]
  )

  const character = state.speakerId ? characters.get(state.speakerId) : undefined
  const text = useMemo(() => {
    if (!node.text) return ""
    const raw = typeof node.text === "function" ? node.text(ctx) : node.text
    return interpolate(raw, vars)
  }, [node, ctx, vars])

  const onCompleteRef = useRef(options.onComplete)
  useEffect(() => {
    onCompleteRef.current = options.onComplete
  }, [options.onComplete])

  const enteredRef = useRef<string | null>(null)
  useEffect(() => {
    if (enteredRef.current === `${state.nodeId}:${state.revealKey}`) return
    enteredRef.current = `${state.nodeId}:${state.revealKey}`
    node.onEnter?.(ctx)
  }, [node, ctx, state.nodeId, state.revealKey])

  const goTo = useCallback(
    (target: string | undefined) => {
      if (target === undefined) {
        setState((s) => ({ ...s, phase: "done" }))
        onCompleteRef.current?.()
        return
      }
      const nextNode = nodes.get(target)
      if (!nextNode) throw new Error(`Dialog node "${target}" does not exist`)
      setState((s) => ({
        nodeId: target,
        phase: nextNode.text ? "revealing" : nextNode.popup ? "popup" : "idle",
        revealKey: s.revealKey + 1,
        skipped: false,
        speakerId: nextNode.speaker ?? s.speakerId,
        history: [...s.history, target],
      }))
    },
    [nodes]
  )

  const resolveNext = useCallback(
    (next: DialogNode["next"]) => (typeof next === "function" ? next(ctx) : next),
    [ctx]
  )

  const finishReveal = useCallback(() => {
    setState((s) => (s.phase === "revealing" ? { ...s, phase: "idle" } : s))
  }, [])

  // Click / Enter. While words are still appearing the first press only
  // completes the line — the Animal Crossing rule — and a node with choices
  // waits for one to be picked.
  const advance = useCallback(() => {
    if (state.phase === "revealing") {
      setState((s) => ({ ...s, phase: "idle", skipped: true }))
      return
    }
    if (state.phase !== "idle") return
    if (node.choices?.length || node.panel) return
    if (node.popup) {
      setState((s) => ({ ...s, phase: "popup" }))
      return
    }
    goTo(resolveNext(node.next))
  }, [state.phase, node, goTo, resolveNext])

  const choose = useCallback(
    (index: number) => {
      if (state.phase !== "idle") return
      const choice = node.choices?.[index]
      if (!choice) return
      choice.onSelect?.(ctx)
      goTo(choice.next ?? resolveNext(node.next))
    },
    [state.phase, node, ctx, goTo, resolveNext]
  )

  // For panels: continue to `target`, or to the node's own `next`.
  const go = useCallback(
    (target?: string) => {
      if (state.phase !== "idle") return
      goTo(target ?? resolveNext(node.next))
    },
    [state.phase, node, goTo, resolveNext]
  )

  const closePopup = useCallback(() => {
    if (state.phase !== "popup") return
    goTo(resolveNext(node.next))
  }, [state.phase, node, goTo, resolveNext])

  const restart = useCallback(() => {
    setVars(options.vars ?? {})
    enteredRef.current = null
    const first = nodes.get(script.start)
    setState((s) => ({
      nodeId: script.start,
      phase: first?.text ? "revealing" : first?.popup ? "popup" : "idle",
      revealKey: s.revealKey + 1,
      skipped: false,
      speakerId: first?.speaker,
      history: [script.start],
    }))
  }, [nodes, script.start, options.vars])

  useEffect(() => {
    if (state.phase !== "idle" || !node.autoAdvance) return
    const id = window.setTimeout(advance, node.autoAdvance)
    return () => window.clearTimeout(id)
  }, [state.phase, node, advance])

  return {
    node,
    text,
    character,
    emotion: node.emotion,
    phase: state.phase,
    revealKey: state.revealKey,
    skipped: state.skipped,
    ctx,
    advance,
    choose,
    go,
    closePopup,
    finishReveal,
    restart,
  }
}

export type DialogApi = ReturnType<typeof useDialog>
