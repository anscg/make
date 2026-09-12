"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  DialogStage,
  MakeWord,
  PanelItem,
  StripPanel,
  type Character,
  type DialogScript,
  type PanelApi,
} from "@/app/components/dialog"
import { GameButton } from "@/app/components/GameButton"
import { OptionList, type Option } from "@/app/components/OptionList"
import {
  AcademicCapIcon,
  BriefcaseIcon,
  FaceSmileIcon,
  GiftIcon,
  HashtagIcon,
  HeartIcon,
  LightBulbIcon,
  MegaphoneIcon,
  QuestionMarkCircleIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/solid"
import { u } from "@/app/components/dialog/geometry"
import { LogoutButton } from "@/app/components/LogoutButton"

// The slides place the cat 61 units lower than the demo frame did, so its
// tail runs off the bottom of the screen.
const CAT: Character = {
  id: "cat",
  name: "Cat",
  color: "#FF427D",
  defaultEmotion: "neutral",
  avatars: {
    neutral: { src: "/dialog/cat.png", width: 331, height: 541, offsetY: 61 },
  },
}

// Option cards in centred rows, then Confirm where the slide puts it (y 234).
// The card zone is sized for two rows so the band keeps its designed height
// for up to about six options. Stores the pick in `varName` and continues to
// `next` (or the node's own next).
const OPTIONS_TOP = 95
const OPTIONS_ZONE = 125
const CONFIRM_TOP = 234

function OptionPanel({
  api,
  message,
  varName,
  options,
  columns,
  next,
}: {
  api: PanelApi
  message?: React.ReactNode
  varName: string
  options: (string | Option)[]
  columns?: number
  next?: string | ((pick: string) => string)
}) {
  const [pick, setPick] = useState<string | null>(null)
  return (
    <StripPanel message={message} controlsTop={OPTIONS_TOP}>
      <div className="flex w-full flex-col items-center">
        <div className="flex w-full items-center justify-center" style={{ minHeight: u(OPTIONS_ZONE) }}>
          <OptionList
            layout="wrap"
            columns={columns}
            animate
            options={options.map((o) => (typeof o === "string" ? { value: o, label: o } : o))}
            value={pick}
            onChange={setPick}
          />
        </div>
        <PanelItem className="w-full" >
          <div style={{ marginTop: u(CONFIRM_TOP - OPTIONS_TOP - OPTIONS_ZONE) }}>
            <GameButton
              size="md"
              disabled={!pick}
              onClick={() => {
                if (!pick) return
                api.ctx.setVar(varName, pick)
                api.go(typeof next === "function" ? next(pick) : next)
              }}
            >
              Confirm
            </GameButton>
          </div>
        </PanelItem>
      </div>
    </StripPanel>
  )
}

// Duolingo-style signal bars: `level` of the four bars are filled, the rest
// faded. Inherits the card's text colour like the Heroicons glyphs do.
function SkillBars({ level }: { level: 1 | 2 | 3 | 4 }) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={i * 7}
          y={22 - i * 6}
          width={6}
          height={6 + i * 6}
          rx={1.5}
          opacity={i < level ? 1 : 0.3}
        />
      ))}
    </svg>
  )
}

const HARDWARE: Option[] = [
  "I've never touched hardware",
  "I've followed a few tutorials",
  "I've built a project or two on my own",
  "I'm pretty experienced",
].map((label, i) => ({ value: label, label, icon: <SkillBars level={(i + 1) as 1 | 2 | 3 | 4} /> }))
const SOURCES: Option[] = [
  { value: "Slack", label: "Slack", icon: <HashtagIcon /> },
  { value: "A friend", label: "A friend", icon: <UserGroupIcon /> },
  { value: "School", label: "School", icon: <AcademicCapIcon /> },
  { value: "Social media", label: "Social media", icon: <MegaphoneIcon /> },
  { value: "Somewhere else", label: "Somewhere else", icon: <QuestionMarkCircleIcon /> },
]
const REASONS: Option[] = [
  { value: "For fun", label: "For fun", icon: <FaceSmileIcon /> },
  { value: "To learn", label: "To learn", icon: <LightBulbIcon /> },
  { value: "For the prizes", label: "For the prizes", icon: <GiftIcon /> },
  { value: "For my portfolio", label: "For my portfolio", icon: <BriefcaseIcon /> },
  { value: "To make cool stuff", label: "To make cool stuff", icon: <WrenchScrewdriverIcon /> },
  { value: "To meet other makers", label: "To meet other makers", icon: <HeartIcon /> },
  { value: "I honestly don't know", label: "I honestly don't know", icon: <QuestionMarkCircleIcon /> },
]
// Which line the cat answers with for each reason.
const REASON_REPLIES: Record<string, string> = {
  "For fun": "fun",
  "To learn": "learn",
  "For the prizes": "greedy",
  "For my portfolio": "portfolio",
  "To make cool stuff": "tinker",
  "To meet other makers": "friends",
  "I honestly don't know": "unsure",
}

// Make is for teens under 19. Anyone older leaves the tour here; the script
// is a module constant, so the navigation lives in a component that can use
// the router.
const AGE_GATE_PATH = "/onboarding/age_gate"

function AgeGateButton() {
  const router = useRouter()
  return <GameButton onClick={() => router.push(AGE_GATE_PATH)}>I’m not a teen (19+)</GameButton>
}

// The prizes strip (slide 14). Every reason reply lands here.
const prizesPanel = (api: PanelApi) => (
  <StripPanel message="Prizes you could get from building awesome hardware projects" controlsTop={234}>
    <PanelItem>
      <GameButton size="md" onClick={() => api.go("last")}>
        Next
      </GameButton>
    </PanelItem>
  </StripPanel>
)

const SCRIPT: DialogScript = {
  start: "hi",
  nodes: [
    {
      id: "hi",
      speaker: "cat",
      emotion: "happy",
      text: "Hi there! I’m Cat, and this is [wobble]Make[/wobble]!",
      choices: [
        { label: "Hi Cat!", next: "what" },
        { label: "What is this place?", next: "what" },
        { label: "Why is the cat talking?", next: "talking" },
      ],
    },
    {
      id: "talking",
      emotion: "smug",
      text: "Why are [wobble]you[/wobble] talking to a cat? Anyway.",
      next: "what",
    },
    {
      id: "what",
      text: "It’s where teens build hardware projects to learn, have fun, and win prizes!",
      choices: [
        { label: "Rewarded how?", next: "fund" },
        { label: "Hardware sounds hard...", next: "easy" },
      ],
    },
    {
      id: "easy",
      emotion: "happy",
      text: "Nope! You get guides, a friendly community, and me. Zero experience needed.",
      next: "fund",
    },
    {
      id: "fund",
      emotion: "excited",
      text: "We’ll [wobble]fund[/wobble] your parts, and give you prizes once you ship!",
      choices: [
        { label: "Wait, for free?", next: "free" },
        { label: "Let’s go!", next: "age" },
      ],
    },
    {
      id: "free",
      emotion: "smug",
      text: "Yep! Hack Club is a nonprofit run by teens, for teens. You build, we pay for the parts.",
      next: "age",
    },
    {
      id: "age",
      text: "So... how old are you?",
      panel: (api) => (
        <StripPanel
          message={
            <>
              <MakeWord /> is only for teens aged 13–18, and is run by Hack Club, a nonprofit for teens, by teens!
            </>
          }
        >
          <div className="flex w-full flex-wrap justify-center" style={{ gap: "calc(var(--dlg-u) * 24) calc(var(--dlg-u) * 132)" }}>
            <PanelItem>
              <GameButton
                onClick={() => {
                  api.ctx.setVar("age", "teen")
                  api.go("teen")
                }}
              >
                I’m a teen aged 13-18!
              </GameButton>
            </PanelItem>
            <PanelItem>
              <AgeGateButton />
            </PanelItem>
          </div>
        </StripPanel>
      ),
    },
    {
      id: "teen",
      text: "Awesome! Hack Club is for teenagers just like you.",
      next: "hardware",
    },
    {
      id: "hardware",
      text: "Have you messed with hardware before?",
      panel: (api) => (
        <OptionPanel
          api={api}
          varName="hardware"
          options={HARDWARE}
          columns={2}
          next={(pick) => (pick === HARDWARE[3].value ? "excited" : "guides")}
          message={
            <>
              There is no wrong answer! <MakeWord /> is for everyone, even absolute beginners who know nothing!
            </>
          }
        />
      ),
    },
    {
      id: "guides",
      text: "Nice, most people pick this one. [count]83%[/count], in fact! Check out our guides!",
      next: "source",
    },
    {
      id: "excited",
      text: "Nice! We're so excited to see what you'll make here.",
      next: "source",
    },
    {
      id: "source",
      text: "Oh and, just curious, how did you hear about Make?",
      panel: (api) => (
        <OptionPanel
          api={api}
          varName="source"
          options={SOURCES}
          next="thanks"
          message={
            <>
              Knowing where you found <MakeWord /> helps us reach more teens like you!
            </>
          }
        />
      ),
    },
    {
      id: "thanks",
      text: "Amazing, thanks! It really does help.",
      choices: [
        { label: "My pleasure.", next: "reason" },
        { label: "What’s next?", next: "reason" },
      ],
    },
    {
      id: "reason",
      text: "My last question... What are you building projects for?",
      panel: (api) => (
        <OptionPanel
          api={api}
          varName="reason"
          options={REASONS}
          next={(pick) => REASON_REPLIES[pick] ?? "last"}
          message="Again, there is no wrong answer! We just wanted to tailor this experience to you."
        />
      ),
    },
    {
      id: "fun",
      emotion: "excited",
      text: "Oh baby, [wobble]fun[/wobble] is my speciality! You’ll also get prizes like these!",
      panel: prizesPanel,
    },
    {
      id: "learn",
      emotion: "happy",
      text: "Building is the fastest way to [wobble]learn[/wobble]. And you get prizes for it, like these!",
      panel: prizesPanel,
    },
    {
      id: "greedy",
      emotion: "smug",
      text: "Ha, [wobble]honest![/wobble] Fine. Here’s what’s on the table.",
      panel: prizesPanel,
    },
    {
      id: "portfolio",
      emotion: "happy",
      text: "[wobble]Smart.[/wobble] A shipped project says more than any résumé ever will. Oh, and it earns you prizes!",
      panel: prizesPanel,
    },
    {
      id: "tinker",
      emotion: "excited",
      text: "A tinkerer! Same. Build cool stuff, ship it, and pick up [wobble]prizes[/wobble] like these along the way.",
      panel: prizesPanel,
    },
    {
      id: "friends",
      emotion: "happy",
      text: "Aw. Thousands of teens build here together, and you all earn [wobble]prizes[/wobble] like these!",
      panel: prizesPanel,
    },
    {
      id: "unsure",
      emotion: "happy",
      text: "Totally fair! Most people figure it out by building. Meanwhile, there are [wobble]prizes[/wobble] like these.",
      panel: prizesPanel,
    },
    {
      id: "last",
      text: "Okaaay, one last thing!",
    },
  ],
}

type Props = { name: string }

export function OnboardingDialog({ name }: Props) {
  const vars = useMemo(() => ({ name }), [name])

  return (
    <DialogStage
      className="h-svh w-full"
      script={SCRIPT}
      characters={[CAT]}
      vars={vars}
      bottom={24}
      offsetX={-19.5}
      renderDone={({ restart }) => (
        <div className="flex size-full flex-col items-center justify-center gap-6 font-fredoka text-white">
          <p className="text-3xl font-semibold">That’s the tour.</p>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={restart}
              className="rounded-full bg-[#FF427D] px-7 py-3 text-lg font-semibold text-white transition hover:scale-105 active:scale-95"
            >
              Play it again
            </button>
            <LogoutButton />
          </div>
        </div>
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 -z-0"
        style={{
          background: "radial-gradient(120% 90% at 20% 0%, #7b6fe0 0%, #5d55c4 45%, #3d3591 100%)",
        }}
      />
    </DialogStage>
  )
}
