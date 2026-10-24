import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Mic, Code2, BarChart3, CheckCircle2, ArrowRight, Shield, Menu, X,
  FileText, Heart, Zap, Target, BookOpen, Moon, Sun, Sparkles, Building2,
  Star, Send, Waves, Quote, Users, Briefcase, GraduationCap, Check,
  Terminal, Lock, Camera, Play, FileSearch, ScanFace, Gauge,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import UpgradeModal from '../components/ui/UpgradeModal'
import BrandLogo from '../components/brand/BrandLogo'
import { IconButton, Input, Textarea, Button } from '../components/ui/index'
import toast from 'react-hot-toast'
import api from '../api/axios'
import { usePageEnter, useScrollReveal } from '../motion/index'

/* ════════════════════════════════════════════════════════════════════════════
   Landing page. Tokens only (canvas / surface / hairline / ink / accent / ai /
   status). Product imagery is composed in markup rather than bitmap assets so
   it stays sharp, theme-aware, and honest — every mock is marked illustrative.
   ════════════════════════════════════════════════════════════════════════════ */

const NAV_LINKS = [
  ['#features', 'Features'],
  ['#how-it-works', 'How it works'],
  ['#why-us', 'Why IntervuSetu'],
  ['#pricing', 'Pricing'],
]

const FOOTER_GROUPS = [
  {
    title: 'Product',
    links: [
      ['Features', '#features'],
      ['How it works', '#how-it-works'],
      ['Pricing', '#pricing'],
      ['Dashboard', '/dashboard'],
    ],
  },
  {
    title: 'Company',
    links: [
      ['For organizations', '/org/login'],
      ['Reviews', '#reviews'],
      ['Contact', '#contact'],
    ],
  },
  {
    title: 'Legal',
    links: [
      ['Privacy', '#'],
      ['Terms', '#'],
    ],
  },
]

const ICON_TONE = {
  neutral: 'bg-inset text-muted',
  accent: 'bg-accent-soft text-accent',
  ai: 'bg-ai-soft text-ai',
  success: 'bg-success-soft text-success-500',
  warning: 'bg-warning-soft text-warning-500',
}

const FEATURES = [
  {
    icon: Waves,
    tone: 'ai',
    title: 'Conversational voice AI',
    description: 'Speak naturally. The interviewer listens, waits for a pause, and follows up on what you actually said — not a fixed script.',
    span: 'lg:col-span-3',
    visual: 'wave',
    foot: 'Turn-taking · Follow-ups · Interruptions',
  },
  {
    icon: Code2,
    tone: 'accent',
    title: 'Live code, live discussion',
    description: 'Write in a full editor while you explain trade-offs. The AI reads the same code you do and probes the edge cases.',
    span: 'lg:col-span-3',
    visual: 'code',
    foot: 'Editor · Syntax highlighting · Room context',
  },
  {
    icon: BarChart3,
    tone: 'neutral',
    title: 'Ten-point analytics',
    description: 'Technical depth, problem solving, communication, and code quality — scored against what you said and wrote.',
    span: 'lg:col-span-2',
    visual: 'meters',
  },
  {
    icon: Target,
    tone: 'accent',
    title: 'A plan for next time',
    description: 'Weak topics become a focused study list, so the next session starts where this one ended.',
    span: 'lg:col-span-2',
    visual: 'chips',
  },
  {
    icon: FileSearch,
    tone: 'ai',
    title: 'Resume-aware questions',
    description: 'Upload your resume and the round is built around your projects, stack, and the claims you make.',
    span: 'lg:col-span-2',
    visual: 'resume',
  },
]

const PROCTOR_POINTS = [
  { icon: Lock, label: 'Fullscreen lock' },
  { icon: Camera, label: 'Camera check' },
  { icon: Mic, label: 'Microphone check' },
  { icon: ScanFace, label: 'Session integrity flags' },
]

const ROUNDS = [
  'Frontend', 'Backend', 'Full-stack', 'Data structures', 'System design',
  'Behavioral', 'DevOps', 'Product sense', 'Machine learning',
]

const STEPS = [
  {
    n: '01',
    icon: FileText,
    title: 'Set the round',
    desc: 'Choose a role, stack, difficulty, and round type. Add your resume if you want questions anchored to your experience.',
  },
  {
    n: '02',
    icon: Mic,
    title: 'Talk and code',
    desc: 'One room for voice and code. Explain your thinking, answer follow-ups, and refine the solution while the AI evaluates.',
  },
  {
    n: '03',
    icon: Gauge,
    title: 'Read the report',
    desc: 'Get a scored breakdown tied to your transcript, plus the topics worth practising before the real thing.',
  },
]

const REVIEWS = [
  {
    quote: 'A revolutionary tool for academic institutions. It bridges the gap between theoretical knowledge and practical interview readiness. My students are far more confident facing corporate technical rounds.',
    name: 'Dr. Satish Gajbhiv',
    role: 'Mentor guide · Pune',
    initials: 'SG',
    avatar: 'bg-accent-soft text-accent',
  },
  {
    quote: 'The analytical depth of the AI evaluations is exactly what we look for when hiring. It identifies the same behavioral patterns and coding edge cases an expert human interviewer would.',
    name: 'External Evaluator',
    role: 'Industry expert',
    initials: 'EE',
    avatar: 'bg-ai-soft text-ai',
  },
  {
    quote: 'Practising with IntervuSetu completely cured my interview anxiety. The real-time voice interaction and instant feedback report helped me identify exactly what I was doing wrong before my actual tech rounds.',
    name: 'Students',
    role: 'Placed candidates',
    initials: 'ST',
    avatar: 'bg-success-soft text-success-500',
  },
]

const PLANS = [
  {
    name: 'Starter',
    price: 'Free',
    note: 'Everything you need to sit your first round.',
    cta: 'Start for free',
    features: [
      '3 mock interviews included',
      'Basic feedback report',
      'Standard question bank',
      'Voice interview basics',
    ],
  },
  {
    name: 'Pro',
    price: '₹499',
    note: 'For candidates preparing seriously, on a deadline.',
    cta: 'Upgrade to Pro',
    primary: true,
    features: [
      'Unlimited mock interviews',
      '9-page deep analytics PDF',
      'Resume-aware AI questions',
      'Live code editor & system design integration',
    ],
  },
]

const SNAPSHOT_METRICS = [
  { label: 'System design', value: 9.0 },
  { label: 'Communication', value: 8.5 },
  { label: 'Code quality', value: 6.0 },
]
const SNAPSHOT_OVERALL = '8.4'

const WAVE_HEIGHTS = [38, 64, 88, 46, 96, 58, 78, 34, 70, 92, 44, 60]

const scoreTone = (s) => (s >= 8 ? 'success' : s >= 5 ? 'warning' : 'danger')
const SCORE_TONE = {
  success: { text: 'text-success-500', bar: 'bg-success-500' },
  warning: { text: 'text-warning-500', bar: 'bg-warning-500' },
  danger: { text: 'text-danger-500', bar: 'bg-danger-500' },
}


function NavLink({ href, children, onNavigate, className = '' }) {
  return (
    <a
      href={href}
      onClick={onNavigate}
      className={`rounded-full px-3.5 py-1.5 text-[0.8125rem] font-medium text-muted transition-colors duration-fast hover:bg-inset hover:text-ink focus-visible:text-ink ${className}`}
    >
      {children}
    </a>
  )
}

function SectionHead({ eyebrow, title, description, align = 'center', id }) {
  const centered = align === 'center'
  return (
    <div data-reveal className={`${centered ? 'mx-auto max-w-2xl text-center' : 'max-w-xl'} mb-10 sm:mb-14`}>
      <p className={`eyebrow mb-3 flex items-center gap-2 ${centered ? 'justify-center' : ''}`}>
        <span aria-hidden className="h-px w-6 bg-accent/60" />
        {eyebrow}
      </p>
      <h2 id={id} className="t-h1 text-balance text-ink">{title}</h2>
      {description && <p className="t-lead mt-4">{description}</p>}
    </div>
  )
}

/* ── Hero product mock ───────────────────────────────────────────────────── */

function HeroMock() {
  return (
    <div className="relative mx-auto w-full max-w-[30rem] lg:max-w-none">
      <div aria-hidden className="absolute -inset-8 -z-10 rounded-[2.5rem] bg-gradient-to-tr from-accent/20 via-ai/10 to-transparent blur-3xl" />

      <div className="relative">
        <div className="overflow-hidden rounded-2xl border border-hairline bg-surface shadow-4">
          <div className="flex items-center gap-2 border-b border-hairline bg-surface-2 px-4 py-2.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-hairline-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-hairline-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-hairline-strong" />
            <span className="ml-2 truncate text-2xs text-subtle">Interview room</span>
            <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-success-soft px-2 py-0.5 text-2xs font-semibold text-success-500">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success-500" />
              Live
            </span>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-ai to-accent text-white">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-ink">AI interviewer</p>
                  <p className="truncate text-2xs text-subtle">Senior frontend · Round 2</p>
                </div>
              </div>
              <span className="num shrink-0 text-2xs text-faint">03 / 08</span>
            </div>

            <div className="max-w-[94%] rounded-xl rounded-tl-sm border border-hairline bg-surface-2 p-3.5">
              <p className="text-xs leading-relaxed text-muted">
                “Your resume mentions a design-system migration. How did you keep components
                consistent while moving fast?”
              </p>
            </div>

            <div className="ml-8 rounded-xl rounded-tr-sm bg-accent-soft p-3.5 ring-1 ring-inset ring-accent/20 sm:ml-10">
              <p className="text-xs leading-relaxed text-ink">
                “I versioned the tokens first, then codemodded the primitives before touching
                page-level components…”
              </p>
              <div className="mt-3 flex h-4 items-end gap-[3px]" aria-hidden>
                {WAVE_HEIGHTS.slice(0, 16).map((h, i) => (
                  <span
                    key={i}
                    className="animate-wave w-1 origin-bottom rounded-full bg-accent/60"
                    style={{ height: `${Math.max(h / 3, 22)}%`, animationDelay: `${i * 0.09}s` }}
                  />
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-hairline bg-canvas-inset">
              <div className="flex items-center gap-2 border-b border-hairline px-3 py-2 text-2xs text-faint">
                <Terminal className="h-3 w-3" aria-hidden />
                <span className="font-mono">room.tsx</span>
                <span className="ml-auto inline-flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-success-500" aria-hidden />
                  autosaved
                </span>
              </div>
              <pre className="overflow-x-auto p-3 font-mono text-[10px] leading-relaxed text-muted" aria-hidden>
{`const signal = analyze(transcript)
const tokens = version(tokens, 'v2')`}
              </pre>
            </div>

            <div className="flex items-center justify-between border-t border-hairline pt-3 text-2xs text-subtle">
              <span className="inline-flex items-center gap-1.5">
                <Waves className="h-3.5 w-3.5 text-ai" aria-hidden />
                Listening
              </span>
              <span className="num">00:42</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-2xs text-faint">Illustrative interface preview</p>
          <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/80 px-3 py-1.5 text-2xs font-medium text-muted shadow-1 backdrop-blur">
            <FileSearch className="h-3.5 w-3.5 text-ai" aria-hidden />
            Resume-aware follow-ups
          </span>
        </div>
      </div>
    </div>
  )
}

/* ── Feature visuals ─────────────────────────────────────────────────────── */

function FeatureVisual({ kind }) {
  if (kind === 'wave') {
    return (
      <div className="mt-6 rounded-xl border border-hairline bg-canvas-inset p-4" aria-hidden>
        <div className="flex h-16 items-center justify-center gap-1.5 sm:gap-2.5">
          {WAVE_HEIGHTS.map((h, i) => (
            <span
              key={i}
              className="animate-wave w-1.5 shrink-0 origin-center rounded-full bg-gradient-to-t from-ai/40 to-ai sm:w-2"
              style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between text-2xs text-subtle">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ai" />
            You
          </span>
          <span className="num">00:42</span>
        </div>
      </div>
    )
  }

  if (kind === 'code') {
    return (
      <div className="mt-6 overflow-hidden rounded-xl border border-hairline bg-canvas-inset" aria-hidden>
        <div className="flex items-center gap-1.5 border-b border-hairline px-3 py-2 text-2xs text-faint">
          <Terminal className="h-3 w-3" />
          <span className="font-mono">solution.js</span>
        </div>
        <pre className="overflow-x-auto p-3.5 font-mono text-[10px] leading-relaxed text-muted">
{`function twoSum(nums, target) {
  const seen = new Map()
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i]
    if (seen.has(need)) return [seen.get(need), i]
    seen.set(nums[i], i)
  }
}`}
        </pre>
      </div>
    )
  }

  if (kind === 'meters') {
    return (
      <div className="mt-6 space-y-3" aria-hidden>
        {[
          ['Technical depth', 'w-[84%]', 'bg-accent'],
          ['Communication', 'w-[72%]', 'bg-ai'],
          ['Code quality', 'w-[63%]', 'bg-success-500'],
        ].map(([label, width, tone]) => (
          <div key={label}>
            <div className="mb-1.5 flex items-center justify-between text-2xs text-subtle">
              <span>{label}</span>
              <span className="h-1 w-1 rounded-full bg-hairline-strong" />
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-canvas">
              <span className={`block h-full rounded-full ${width} ${tone}`} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (kind === 'chips') {
    return (
      <div className="mt-6 flex flex-wrap gap-2" aria-hidden>
        {['Dynamic programming', 'System design', 'STAR stories', 'Trade-off framing', 'Edge cases'].map((topic, i) => (
          <span
            key={topic}
            className={`rounded-full border px-2.5 py-1 text-2xs font-medium ${
              i === 0
                ? 'border-accent/30 bg-accent-soft text-accent'
                : 'border-hairline bg-inset text-muted'
            }`}
          >
            {topic}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="relative mt-6 rounded-xl border border-hairline bg-canvas-inset p-4" aria-hidden>
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ai-soft text-ai">
          <FileText className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-2 pt-1">
          <span className="block h-1.5 w-[72%] rounded-full bg-ink/15" />
          <span className="block h-1.5 w-[90%] rounded-full bg-ink/10" />
          <span className="block h-1.5 w-[55%] rounded-full bg-ink/10" />
        </div>
      </div>
      <span className="absolute right-3 top-3 rounded-full bg-ai-soft px-2 py-0.5 text-2xs font-semibold text-ai">
        PDF
      </span>
    </div>
  )
}

/* ── Report radar ────────────────────────────────────────────────────────── */

const RADAR_AXES = [
  ['Communication', 0.82],
  ['Problem solving', 0.74],
  ['Technical depth', 0.9],
  ['Code quality', 0.68],
  ['System design', 0.8],
  ['Pace', 0.72],
]

function radarPoint(cx, cy, radius, index, total, value = 1) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2
  return [cx + Math.cos(angle) * radius * value, cy + Math.sin(angle) * radius * value]
}

function radarPolygon(cx, cy, radius, values) {
  return values
    .map(([, v], i) => radarPoint(cx, cy, radius, i, values.length, v).join(','))
    .join(' ')
}

function ReportPreview() {
  const cx = 160
  const cy = 138
  const radius = 86
  const rings = [0.33, 0.66, 1]

  return (
    <figure className="relative">
      <div aria-hidden className="absolute -inset-5 -z-10 rounded-[2rem] bg-gradient-to-b from-ai/15 via-accent/10 to-transparent blur-2xl" />
      <div className="card overflow-hidden p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4 border-b border-hairline pb-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ai-soft text-ai">
              <Gauge className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">Mock interview report</p>
              <p className="truncate text-2xs text-subtle">Senior frontend · 32 minutes</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-2xs font-semibold text-accent">
            Example
          </span>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-[1.15fr_0.85fr] sm:items-center">
          <svg
            viewBox="0 0 320 276"
            role="img"
            aria-label="Illustrative radar chart showing example interview scores across six skills"
            className="mx-auto w-full max-w-[19rem]"
          >
            <defs>
              <linearGradient id="landing-radar-fill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity="0.34" />
                <stop offset="100%" stopColor="rgb(var(--ai))" stopOpacity="0.12" />
              </linearGradient>
            </defs>

            {rings.map((ring) => (
              <polygon
                key={ring}
                points={radarPolygon(cx, cy, radius, RADAR_AXES.map(() => [null, ring]))}
                fill="none"
                className="stroke-hairline"
                strokeWidth="1"
              />
            ))}

            {RADAR_AXES.map(([label], i) => {
              const [x, y] = radarPoint(cx, cy, radius, i, RADAR_AXES.length)
              const [lx, ly] = radarPoint(cx, cy, radius + 22, i, RADAR_AXES.length)
              return (
                <g key={label}>
                  <line x1={cx} y1={cy} x2={x} y2={y} className="stroke-hairline" strokeWidth="1" />
                  <text
                    x={lx}
                    y={ly}
                    textAnchor={lx > cx + 8 ? 'start' : lx < cx - 8 ? 'end' : 'middle'}
                    dominantBaseline="middle"
                    className="fill-current text-[9px] font-medium text-subtle"
                  >
                    {label}
                  </text>
                </g>
              )
            })}

            <polygon
              points={radarPolygon(cx, cy, radius, RADAR_AXES)}
              fill="url(#landing-radar-fill)"
              className="stroke-accent"
              strokeWidth="2"
            />
            {RADAR_AXES.map(([, v], i) => {
              const [x, y] = radarPoint(cx, cy, radius, i, RADAR_AXES.length, v)
              return <circle key={i} cx={x} cy={y} r="3" className="fill-accent" />
            })}
          </svg>

          <div className="min-w-0">
            <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-faint">Overall</p>
            <p className="num-xl mt-1 text-ink">{SNAPSHOT_OVERALL}<span className="text-sm font-medium text-faint"> / 10</span></p>
            <ul className="mt-4 space-y-3">
              {SNAPSHOT_METRICS.map((m) => {
                const tone = SCORE_TONE[scoreTone(m.value)]
                return (
                  <li key={m.label}>
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <span className="text-2xs text-muted">{m.label}</span>
                      <span className={`num text-2xs font-semibold ${tone.text}`}>{m.value.toFixed(1)}</span>
                    </div>
                    <div
                      className="h-1 overflow-hidden rounded-full bg-canvas"
                      role="meter"
                      aria-valuenow={m.value}
                      aria-valuemin={0}
                      aria-valuemax={10}
                      aria-label={`${m.label}: ${m.value.toFixed(1)} of 10`}
                    >
                      <span className={`block h-full rounded-full ${tone.bar}`} style={{ width: `${m.value * 10}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-xl border border-hairline bg-inset p-3.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ai-soft text-ai" aria-hidden>
            <Zap className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <p className="text-2xs leading-relaxed text-muted">
            <span className="font-semibold text-ink">Next up:</span> tighten complexity analysis
            and narrate trade-offs earlier in the answer.
          </p>
        </div>

        <figcaption className="mt-3 text-center text-2xs text-faint">
          Illustrative interface preview — not a user result.
        </figcaption>
      </div>
    </figure>
  )
}

/* ── Room preview ────────────────────────────────────────────────────────── */

function RoomPreview() {
  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-5 -z-10 rounded-[2rem] bg-gradient-to-tr from-accent/20 via-ai/10 to-transparent blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#070b16] p-1.5 shadow-4">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0a1020]">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5" aria-hidden>
            <span className="h-2 w-2 rounded-full bg-white/20" />
            <span className="h-2 w-2 rounded-full bg-white/15" />
            <span className="h-2 w-2 rounded-full bg-white/10" />
            <span className="ml-2 inline-flex items-center gap-1.5 text-[10px] text-[#8b95ab]">
              <Terminal className="h-3 w-3" />
              room / live
            </span>
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[#123326] px-2 py-0.5 text-[10px] font-semibold text-[#4fd394]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4fd394]" />
              Recording
            </span>
          </div>

          <div className="grid sm:grid-cols-2">
            <div className="space-y-3.5 border-b border-white/10 p-4 sm:border-b-0 sm:border-r">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-[#9a82ff] to-[#8b87f0] text-white">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                </span>
                <div>
                  <p className="text-[11px] font-semibold text-[#e8ebf5]">AI interviewer</p>
                  <p className="text-[10px] text-[#7a849a]">System design · Warm-up</p>
                </div>
              </div>

              <div className="rounded-lg rounded-tl-sm bg-white/[0.045] p-3 ring-1 ring-inset ring-white/10">
                <p className="text-[11px] leading-relaxed text-[#c3cadb]">
                  “Walk me through how you would design a rate limiter for a public API.
                  Start with the constraints you care about.”
                </p>
              </div>

              <div className="ml-5 rounded-lg rounded-tr-sm bg-[#191735] p-3 ring-1 ring-inset ring-[#8b87f0]/25">
                <p className="text-[11px] leading-relaxed text-[#dfe3f0]">
                  “First, per-key or global? That changes the storage and failure mode…”
                </p>
              </div>

              <div className="flex h-7 items-center gap-[3px]" aria-hidden>
                {WAVE_HEIGHTS.map((h, i) => (
                  <span
                    key={i}
                    className="animate-wave w-full origin-center rounded-full bg-[#9a82ff]/70"
                    style={{ height: `${Math.max(h / 2, 24)}%`, animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center gap-2 text-[10px] text-[#7a849a]" aria-hidden>
                <Code2 className="h-3 w-3" />
                <span className="font-mono">rateLimiter.ts</span>
                <span className="ml-auto">TypeScript</span>
              </div>
              <div className="mt-3 space-y-1.5 font-mono text-[10px] leading-relaxed" aria-hidden>
                <p className="text-[#7a849a]">{'// sliding window, per key'}</p>
                <p className="text-[#c3cadb]">
                  <span className="text-[#9a82ff]">export function</span> allow(key) {'{'}
                </p>
                <p className="pl-3 text-[#c3cadb]">
                  <span className="text-[#9a82ff]">const</span> now = Date.now()
                </p>
                <p className="pl-3 text-[#c3cadb]">
                  <span className="text-[#9a82ff]">const</span> hits = log(key).filter(
                </p>
                <p className="pl-6 text-[#c3cadb]">t {'=>'} now - t {'<'} WINDOW</p>
                <p className="pl-3 text-[#c3cadb]">)</p>
                <p className="pl-3 text-[#c3cadb]">
                  <span className="text-[#9a82ff]">return</span> hits.length {'<'} LIMIT
                </p>
                <p className="text-[#c3cadb]">{'}'}</p>
              </div>
              <div className="mt-4 rounded-lg border border-[#8b87f0]/25 bg-[#8b87f0]/10 p-3">
                <p className="text-[10px] leading-relaxed text-[#c3cadb]">
                  <span className="font-semibold text-[#b9b2ff]">Follow-up:</span> what happens
                  when two instances share the same key?
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 px-4 py-2.5 text-[10px] text-[#7a849a]" aria-hidden>
            <span className="inline-flex items-center gap-1.5"><Mic className="h-3 w-3" /> Mic on</span>
            <span className="inline-flex items-center gap-1.5"><Camera className="h-3 w-3" /> Camera on</span>
            <span className="inline-flex items-center gap-1.5"><Shield className="h-3 w-3" /> Focus mode</span>
            <span className="ml-auto num">12:38</span>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-2xs text-faint">Illustrative interface preview</p>
    </div>
  )
}

/* ── Cards ───────────────────────────────────────────────────────────────── */

function FeatureCard({ icon: Icon, tone = 'neutral', title, description, foot, span = '', visual }) {
  return (
    <article
      data-reveal
      className={`card-interactive group relative flex flex-col overflow-hidden p-6 sm:p-7 ${span}`}
    >
      <div className="flex items-start justify-between gap-4">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${ICON_TONE[tone]}`} aria-hidden>
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <ArrowRight
          className="h-4 w-4 -translate-x-1 text-faint opacity-0 transition-[opacity,transform] duration-base ease-out group-hover:translate-x-0 group-hover:opacity-100"
          aria-hidden
        />
      </div>
      <h3 className="t-h3 mt-5 text-ink">{title}</h3>
      <p className="t-body mt-2">{description}</p>
      {visual && <FeatureVisual kind={visual} />}
      {foot && <p className="mt-5 text-2xs font-medium uppercase tracking-[0.12em] text-faint">{foot}</p>}
    </article>
  )
}

function ReviewCard({ quote, name, role, initials, avatar }) {
  return (
    <figure data-reveal className="card flex h-full flex-col gap-5 p-6 sm:p-7">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5" role="img" aria-label="Rated 5 out of 5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} className="h-3.5 w-3.5 fill-current text-warning-400" aria-hidden />
          ))}
        </div>
        <Quote className="h-5 w-5 text-hairline-strong" aria-hidden />
      </div>
      <blockquote className="flex-1 text-sm leading-relaxed text-muted">{quote}</blockquote>
      <figcaption className="flex items-center gap-3 border-t border-hairline pt-5">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-semibold ${avatar}`} aria-hidden>
          {initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink">{name}</span>
          <span className="block truncate text-2xs text-subtle">{role}</span>
        </span>
      </figcaption>
    </figure>
  )
}

function PriceCard({ name, price, note, features, primary, cta, to, onCtaClick }) {
  const body = (
    <div className={`flex h-full flex-col p-6 sm:p-8 ${primary ? 'rounded-[19px] bg-surface' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">{name}</h3>
        {primary && (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-2xs font-semibold uppercase tracking-wider text-accent">
            <Sparkles className="h-3 w-3" aria-hidden />
            Best value
          </span>
        )}
      </div>

      <p className="mt-5 flex flex-wrap items-end gap-1">
        <span className="num-xl text-ink">{price}</span>
        {price !== 'Free' && <span className="mb-1 text-xs text-subtle">/ month</span>}
      </p>
      <p className="mt-2 text-xs text-subtle">{note}</p>

      <ul className="mt-6 flex flex-1 flex-col gap-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-muted">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-500" strokeWidth={1.75} aria-hidden />
            {f}
          </li>
        ))}
      </ul>

      <div className="mt-8">
        {to ? (
          <Link to={to} className={`btn btn-lg w-full ${primary ? 'btn-primary' : 'btn-secondary'}`}>{cta}</Link>
        ) : (
          <button type="button" onClick={onCtaClick} className={`btn btn-lg w-full ${primary ? 'btn-primary' : 'btn-secondary'}`}>
            {cta}
          </button>
        )}
      </div>
    </div>
  )

  if (primary) {
    return (
      <div data-reveal className="relative rounded-[var(--r-2xl)] bg-gradient-to-b from-accent/70 via-ai/45 to-hairline p-px shadow-3">
        {body}
      </div>
    )
  }

  return (
    <div data-reveal className="card-interactive h-full p-px">
      {body}
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [contactEmail, setContactEmail] = useState('')
  const [contactMessage, setContactMessage] = useState('')
  const [sendingContact, setSendingContact] = useState(false)

  const enterRef = usePageEnter([])
  const revealRef = useScrollReveal([])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')
  const themeLabel = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'

  const handleContactSubmit = async (e) => {
    e.preventDefault()
    if (!contactEmail || !contactMessage) return toast.error('Please fill all fields')

    setSendingContact(true)
    try {
      await api.post('/api/contact', { email: contactEmail, message: contactMessage })
      toast.success('Message sent successfully! We will get back to you soon.')
      setContactEmail('')
      setContactMessage('')
    } catch (err) {
      toast.error('Failed to send message. Please try again.')
    } finally {
      setSendingContact(false)
    }
  }

  return (
    <div className="page-shell text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:border focus:border-hairline-strong focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-ink"
      >
        Skip to content
      </a>

      {/* ── Navbar ───────────────────────────────────────────────────── */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-base ease-out ${
          scrolled || menuOpen
            ? 'border-b border-hairline bg-canvas/85 shadow-1 backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent'
        }`}
      >
        <div className="container-page mx-auto flex h-nav max-w-6xl items-center justify-between gap-3">
          <BrandLogo to="/" size="sm" className="tap-link shrink-0" />

          <nav aria-label="Primary" className="hidden items-center rounded-full border border-hairline bg-surface/60 p-1 backdrop-blur-md lg:flex">
            {NAV_LINKS.map(([href, label]) => (
              <NavLink key={href} href={href}>{label}</NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-1.5 lg:flex">
            <IconButton label={themeLabel} onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
            </IconButton>
            {user ? (
              <Link to="/dashboard" className="btn btn-primary btn-sm">
                Dashboard <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : (
              <>
                <Link to="/org/login" className="btn btn-ghost btn-sm">
                  <Building2 className="h-3.5 w-3.5" aria-hidden /> For organizations
                </Link>
                <span aria-hidden className="mx-1 h-4 w-px bg-hairline" />
                <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Start free <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 lg:hidden">
            <IconButton label={themeLabel} onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
            </IconButton>
            <IconButton
              label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((p) => !p)}
            >
              {menuOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            </IconButton>
          </div>
        </div>

        {menuOpen && (
          <div
            id="mobile-menu"
            className="animate-slide-up max-h-[calc(100dvh-var(--nav-h))] overflow-y-auto border-t border-hairline bg-canvas px-4 pb-6 pt-4 lg:hidden"
          >
            <nav aria-label="Mobile" className="flex flex-col">
              {NAV_LINKS.map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between border-b border-hairline-soft py-3.5 text-sm font-medium text-muted transition-colors hover:text-ink"
                >
                  {label}
                  <ArrowRight className="h-4 w-4 text-faint" aria-hidden />
                </a>
              ))}
            </nav>
            <div className="mt-5 flex flex-col gap-2">
              {user ? (
                <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="btn btn-primary btn-lg w-full">Dashboard</Link>
              ) : (
                <>
                  <Link to="/register" onClick={() => setMenuOpen(false)} className="btn btn-primary btn-lg w-full">
                    Start free <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                  <Link to="/login" onClick={() => setMenuOpen(false)} className="btn btn-secondary btn-lg w-full">Sign in</Link>
                  <Link to="/org/login" onClick={() => setMenuOpen(false)} className="btn btn-ghost btn-lg w-full">
                    <Building2 className="h-4 w-4" aria-hidden /> For organizations
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main id="main" ref={revealRef} className="overflow-x-clip">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section
          aria-labelledby="hero-heading"
          ref={enterRef}
          className="relative overflow-hidden pb-16 pt-[calc(var(--nav-h)+3rem)] sm:pb-24 sm:pt-[calc(var(--nav-h)+5rem)]"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-[34rem] line-grid opacity-50 [mask-image:radial-gradient(ellipse_65%_60%_at_50%_0%,black_35%,transparent_100%)]" />
            <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-accent/20 blur-[100px]" />
            <div className="absolute -right-20 top-0 h-80 w-80 rounded-full bg-ai/15 blur-[110px]" />
          </div>

          <div className="container-page relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12">
            <div className="min-w-0">
              <a
                data-enter
                href="#why-us"
                className="tap-link group inline-flex max-w-full items-center gap-2 rounded-full border border-hairline bg-surface/70 px-3.5 py-1.5 text-xs font-medium text-muted shadow-1 backdrop-blur transition-colors duration-fast hover:border-hairline-strong hover:text-ink"
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-ai" aria-hidden />
                <span className="truncate">The AI interview room</span>
                <span aria-hidden className="h-3 w-px bg-hairline" />
                <span className="shrink-0 text-accent">See how it works</span>
                <ArrowRight className="h-3 w-3 shrink-0 text-accent transition-transform duration-fast group-hover:translate-x-0.5" aria-hidden />
              </a>

              <h1 data-enter id="hero-heading" className="t-display mt-6 text-balance">
                Interview practice
                <br className="hidden sm:block" /> that{' '}
                <span className="gradient-text">talks back.</span>
              </h1>

              <p data-enter className="t-lead mt-5 max-w-xl">
                A voice-native AI interviewer that listens, probes, and writes real feedback —
                on your resume, your code, and how you explain it. No scripts. No scheduling.
              </p>

              <div data-enter className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Link to="/interview/create" className="btn btn-primary btn-xl w-full sm:w-auto">
                  Start a mock interview <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <a href="#how-it-works" className="btn btn-secondary btn-xl w-full sm:w-auto">
                  <Play className="h-4 w-4" aria-hidden /> See the flow
                </a>
              </div>

              <ul data-enter className="mt-7 flex flex-wrap gap-x-5 gap-y-2.5 text-xs text-muted">
                {['Voice or text', 'Built-in code editor', 'Report after every round'].map((t) => (
                  <li key={t} className="inline-flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-success-500" strokeWidth={2.25} aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div data-enter className="min-w-0">
              <HeroMock />
            </div>
          </div>
        </section>

        {/* ── Round strip ──────────────────────────────────────────────── */}
        <section aria-labelledby="rounds-heading" className="relative border-y border-hairline bg-surface/50">
          <div className="container-page mx-auto flex max-w-6xl flex-col gap-4 py-6 sm:flex-row sm:items-center sm:gap-8">
            <p id="rounds-heading" className="shrink-0 text-2xs font-semibold uppercase tracking-[0.16em] text-faint">
              Rounds we simulate
            </p>
            <ul className="flex flex-wrap items-center gap-x-2 gap-y-2">
              {ROUNDS.map((round) => (
                <li
                  key={round}
                  className="rounded-full border border-hairline bg-canvas px-3 py-1 text-2xs font-medium text-muted"
                >
                  {round}
                </li>
              ))}
            </ul>
            <span className="hidden shrink-0 items-center gap-1.5 text-2xs text-subtle sm:ml-auto sm:flex">
              <Waves className="h-3.5 w-3.5 text-ai" aria-hidden />
              Voice + code in one room
            </span>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────────────── */}
        <section id="features" aria-labelledby="features-heading" className="container-page max-w-6xl scroll-mt-28 py-16 sm:py-24">
          <SectionHead
            id="features-heading"
            eyebrow="The platform"
            title="Everything a real round throws at you."
            description="Voice, code, resume context, and structured feedback — one continuous loop instead of five disconnected tools."
          />

          <div className="grid gap-5 lg:grid-cols-6">
            {FEATURES.map((f) => <FeatureCard key={f.title} {...f} />)}

            <article data-reveal className="card relative overflow-hidden p-6 sm:p-8 lg:col-span-6">
              <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
              <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                <div className="min-w-0">
                  <span className={`grid h-11 w-11 place-items-center rounded-xl ${ICON_TONE.success}`} aria-hidden>
                    <Shield className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <h3 className="t-h2 mt-5 text-balance text-ink">Proctoring that stays out of the way.</h3>
                  <p className="t-body mt-3 max-w-xl">
                    For organizations running screening at scale: enforce the rules that matter,
                    flag the sessions that need a human look, and keep the candidate experience clean.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {PROCTOR_POINTS.map(({ icon: Icon, label }) => (
                      <span
                        key={label}
                        className="inline-flex items-center gap-2 rounded-full border border-hairline bg-inset px-3 py-1.5 text-2xs font-medium text-muted"
                      >
                        <Icon className="h-3.5 w-3.5 text-success-500" aria-hidden />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="relative mx-auto flex aspect-[4/3] w-full max-w-sm items-center justify-center rounded-2xl border border-hairline bg-canvas-inset" aria-hidden>
                  <span className="absolute h-40 w-40 rounded-full border border-accent/20" />
                  <span className="absolute h-28 w-28 rounded-full border border-accent/30" />
                  <span className="absolute h-16 w-16 rounded-full border border-accent/40" />
                  <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-accent to-ai text-white shadow-3">
                    <Shield className="h-6 w-6" strokeWidth={1.75} />
                  </span>
                  <span className="absolute left-5 top-5 rounded-full border border-hairline bg-surface px-2.5 py-1 text-2xs text-muted">Focus mode on</span>
                  <span className="absolute bottom-5 right-5 inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-2.5 py-1 text-2xs text-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-success-500" /> Device check
                  </span>
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* ── Inside the room ──────────────────────────────────────────── */}
        <section aria-labelledby="room-heading" className="border-y border-hairline bg-inset py-16 sm:py-24">
          <div className="container-page mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <div data-reveal className="min-w-0">
              <p className="eyebrow mb-3 flex items-center gap-2">
                <span aria-hidden className="h-px w-6 bg-accent/60" />
                Inside the room
              </p>
              <h2 id="room-heading" className="t-h1 text-balance text-ink">
                Talk through the problem. Code it live.
              </h2>
              <p className="t-lead mt-4">
                The interviewer sees your editor and hears your reasoning at the same time —
                so the follow-ups land where a real one would: on the edge case you skipped,
                the complexity you hand-waved, or the trade-off you never mentioned.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  ['One continuous session', 'Voice, code, and notes stay in the same context window.'],
                  ['Follow-ups with memory', 'Questions build on your earlier answers, not a fixed list.'],
                  ['Structured close', 'Every round ends with a scored report and a next-step plan.'],
                ].map(([title, desc]) => (
                  <li key={title} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-accent" aria-hidden>
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{title}</p>
                      <p className="mt-0.5 text-sm text-muted">{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div data-reveal className="min-w-0">
              <RoomPreview />
            </div>
          </div>
        </section>

        {/* ── Report / why us ──────────────────────────────────────────── */}
        <section id="why-us" aria-labelledby="why-us-heading" className="container-page max-w-6xl scroll-mt-28 py-16 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div data-reveal className="min-w-0 order-2 lg:order-1">
              <ReportPreview />
            </div>

            <div data-reveal className="min-w-0 order-1 lg:order-2">
              <p className="eyebrow mb-3 flex items-center gap-2">
                <span aria-hidden className="h-px w-6 bg-accent/60" />
                Why IntervuSetu
              </p>
              <h2 id="why-us-heading" className="t-h1 text-balance text-ink">
                Feedback you can act on — not a score you have to guess at.
              </h2>
              <p className="t-lead mt-4">
                Most developers don&apos;t fail interviews because they can&apos;t code. They fail because
                they can&apos;t explain their thinking under pressure. Every metric in the report
                points back to something you actually said.
              </p>

              <ul className="mt-8 space-y-4">
                {[
                  [BookOpen, 'Transcript-linked evidence', 'See the exact moment a score was earned or lost, in your own words.'],
                  [Zap, 'Strengths and gaps, named', 'No vague “needs improvement” — the report says which topic and why.'],
                  [Target, 'A practice plan, not a verdict', 'Turn weak areas into the next set of rounds you should sit.'],
                ].map(([Icon, title, desc]) => (
                  <li key={title} className="flex items-start gap-3.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-inset text-muted" aria-hidden>
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted">{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <Link to="/interview/create" className="tap-link mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-hover">
                Sit a round and see the report <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Reviews ──────────────────────────────────────────────────── */}
        <section id="reviews" aria-labelledby="reviews-heading" className="border-y border-hairline bg-inset py-16 sm:py-24">
          <div className="container-page max-w-6xl">
            <SectionHead
              id="reviews-heading"
              eyebrow="Word of mouth"
              title="Mentors, evaluators, and candidates."
              description="The people closest to the hiring bar, on what changes when practice feels like the real room."
            />
            <div className="grid gap-5 md:grid-cols-3">
              {REVIEWS.map((r) => <ReviewCard key={r.name} {...r} />)}
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────── */}
        <section id="how-it-works" aria-labelledby="how-heading" className="container-page max-w-6xl scroll-mt-28 py-16 sm:py-24">
          <SectionHead
            id="how-heading"
            eyebrow="The loop"
            title="Three steps to a calmer interview."
            description="No setup calls, no scheduling, no waiting for a mentor to be free."
          />

          <ol className="relative grid gap-5 lg:grid-cols-3">
            <span aria-hidden className="absolute left-[16.6%] right-[16.6%] top-16 hidden border-t border-dashed border-hairline-strong lg:block" />
            {STEPS.map((s) => (
              <li key={s.n} data-reveal className="card-interactive group relative flex flex-col p-6 sm:p-7">
                <div className="flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl border border-hairline bg-surface-2 text-accent shadow-1" aria-hidden>
                    <s.icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <span className="num text-4xl font-semibold text-hairline-strong transition-colors duration-base group-hover:text-accent/40" aria-hidden>
                    {s.n}
                  </span>
                </div>
                <h3 className="t-h3 mt-6 text-ink">{s.title}</h3>
                <p className="t-body mt-2">{s.desc}</p>
              </li>
            ))}
          </ol>

          <div data-reveal className="mt-12 flex flex-col items-center justify-between gap-5 rounded-2xl border border-hairline bg-gradient-to-r from-accent-soft/60 via-surface to-ai-soft/50 p-6 sm:flex-row sm:p-8">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">Your next round is the one you can repeat.</p>
              <p className="mt-1 text-sm text-muted">Start free, then sit as many as you need before the real thing.</p>
            </div>
            <Link to="/interview/create" className="btn btn-primary btn-lg w-full shrink-0 sm:w-auto">
              Start a mock interview <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>

        {/* ── Pricing ──────────────────────────────────────────────────── */}
        <section id="pricing" aria-labelledby="pricing-heading" className="border-y border-hairline bg-inset py-16 sm:py-24">
          <div className="container-page max-w-5xl scroll-mt-28">
            <SectionHead
              id="pricing-heading"
              eyebrow="Pricing"
              title="Start free. Upgrade when it counts."
              description="One plan for practising on your own. Pro for the week before the real round."
            />

            <div className="mx-auto grid max-w-3xl items-stretch gap-6 md:grid-cols-2">
              <PriceCard {...PLANS[0]} to={user ? '/dashboard' : '/register'} />
              <PriceCard
                {...PLANS[1]}
                to={user ? undefined : '/register'}
                onCtaClick={user ? () => setShowUpgradeModal(true) : undefined}
              />
            </div>

            <p className="mt-8 text-center text-2xs text-subtle">
              Prices shown in INR. Organization plans are available on request.
            </p>
          </div>
        </section>

        {/* ── Contact ──────────────────────────────────────────────────── */}
        <section id="contact" aria-labelledby="contact-heading" className="container-page max-w-6xl scroll-mt-28 py-16 sm:py-24">
          <div data-reveal className="overflow-hidden rounded-[var(--r-2xl)] border border-hairline bg-surface shadow-2">
            <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
              <div className="relative overflow-hidden border-b border-hairline bg-gradient-to-br from-accent-soft/80 via-surface to-ai-soft/60 p-7 sm:p-9 lg:border-b-0 lg:border-r">
                <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-accent/15 blur-3xl" />
                <p className="eyebrow mb-3">Contact</p>
                <h2 id="contact-heading" className="t-h2 text-balance text-ink">
                  Tell us what you&apos;re preparing for.
                </h2>
                <p className="t-body mt-3 max-w-md">
                  Whether you&apos;re an individual getting ready for a transition, a mentor guiding
                  a cohort, or a team rebuilding its screening loop — we&apos;ll point you to the
                  right setup.
                </p>

                <ul className="mt-8 space-y-4">
                  {[
                    [GraduationCap, 'Candidates', 'Practice rounds that reflect the role you want.'],
                    [Building2, 'Institutions', 'Give every student a consistent practice loop.'],
                    [Briefcase, 'Hiring teams', 'Run structured screening with proctoring built in.'],
                  ].map(([Icon, title, desc]) => (
                    <li key={title} className="flex items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-hairline bg-surface/80 text-accent" aria-hidden>
                        <Icon className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">{title}</p>
                        <p className="mt-0.5 text-2xs leading-relaxed text-subtle">{desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 flex items-center gap-2 text-2xs text-subtle">
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  A real reply from the team, not an autoresponder.
                </div>
              </div>

              <div className="p-7 sm:p-9">
                <form onSubmit={handleContactSubmit} className="flex flex-col gap-4">
                  <Input
                    type="email"
                    label="Email"
                    placeholder="you@example.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    required
                  />
                  <Textarea
                    label="Message"
                    placeholder="What role, round, or team are you preparing for?"
                    rows={5}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    required
                  />
                  <Button type="submit" size="lg" loading={sendingContact} icon={<Send className="h-4 w-4" aria-hidden />}>
                    {sendingContact ? 'Sending…' : 'Send message'}
                  </Button>
                  <p className="text-2xs leading-relaxed text-faint">
                    We use your message only to reply. No lists, no forwarding.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="border-t border-hairline bg-canvas">
        <div className="container-page mx-auto max-w-6xl py-12 sm:py-16">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div className="max-w-sm">
              <BrandLogo to="/" size="md" className="tap-link w-fit" />
              <p className="mt-4 text-sm leading-relaxed text-muted">
                The AI interview room for people who&apos;d rather practise than guess.
              </p>
              <div className="mt-5 flex items-center gap-2 text-2xs text-subtle">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-2.5 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-success-500" aria-hidden />
                  All systems operational
                </span>
              </div>
            </div>

            {FOOTER_GROUPS.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-faint">{group.title}</p>
                <ul className="mt-4 space-y-3">
                  {group.links.map(([label, href]) => (
                    <li key={label}>
                      <Link
                        to={href}
                        className="tap-link rounded-sm text-sm text-muted transition-colors duration-fast hover:text-ink focus-visible:text-ink"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-hairline pt-6 sm:flex-row sm:items-center">
            <p className="text-2xs text-subtle">© {new Date().getFullYear()} IntervuSetu. All rights reserved.</p>
            <p className="flex items-center gap-1.5 text-2xs text-subtle">
              Built for candidates and the teams that hire them
              <Heart className="h-3.5 w-3.5 text-accent" aria-hidden />
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
