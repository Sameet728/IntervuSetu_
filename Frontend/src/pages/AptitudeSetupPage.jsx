import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import { Button, Card, Input, Select, Modal, Tooltip, SectionHeading } from '../components/ui/index'
import { startAptitudeTest, getAptitudeCompanies, getAptitudeTopics, checkAptitudeAvailability } from '../api/aptitudeAPI'
import toast from 'react-hot-toast'
import { usePageEnter, useScrollReveal } from '../motion/index'
import { Brain, Zap, Building2, Tag, Settings2, Target, Check, HelpCircle } from 'lucide-react'

const cx = (...p) => p.filter(Boolean).join(' ')

const MODES = [
  { id: 'beginner', label: 'Beginner Mode', questions: 15, duration: 20, difficulty: 'easy-to-medium', tag: 'Practice',    desc: 'For learning & practice.',        tone: 'success' },
  { id: 'standard', label: 'Standard Mode', questions: 30, duration: 40, difficulty: 'medium',         tag: 'Placement',   desc: 'Real placement simulation.',      tone: 'accent'  },
  { id: 'advanced', label: 'Advanced Mode', questions: 45, duration: 60, difficulty: 'medium-to-hard', tag: 'MNC level',   desc: 'High-pressure simulation.',       tone: 'danger'  },
  { id: 'custom',   label: 'Custom Mode',   questions: 20, duration: 26, difficulty: 'custom',         tag: 'Configurable',desc: 'Configure your own rules.',       tone: 'neutral' },
]

/* Static class maps — interpolated Tailwind names never compile. */
const MODE_TAG_TONE = {
  success: 'badge badge-success',
  accent:  'badge badge-accent',
  danger:  'badge badge-danger',
  neutral: 'badge',
}
const CARD_IDLE   = 'border-hairline bg-surface hover:border-hairline-strong'
const CARD_ACTIVE = 'border-accent bg-accent-soft ring-1 ring-accent/25'
const POOL_TONE   = { hard: 'text-danger-500', medium: 'text-warning-500', easy: 'text-success-500' }

const CATEGORIES = ['numerical', 'verbal', 'logical', 'situational']

export default function AptitudeSetupPage() {
  const [activeMode, setActiveMode] = useState('standard')
  const [customQCount, setCustomQCount] = useState(20)
  const [customDiff, setCustomDiff] = useState('medium')

  const [selectedCompanies, setSelectedCompanies] = useState([])
  const [selectedTopics, setSelectedTopics] = useState([])
  const [selectedCategories, setSelectedCategories] = useState(["numerical", "verbal", "logical", "situational"])

  const [companySearch, setCompanySearch] = useState('')
  const [topicSearch, setTopicSearch] = useState('')
  const [availableCompanies, setAvailableCompanies] = useState([])
  const [availableTopics, setAvailableTopics] = useState([])
  const [loading, setLoading] = useState(false)

  const [showWarning, setShowWarning] = useState(false)
  const [warningData, setWarningData] = useState(null)

  const navigate = useNavigate()

  const enterRef = usePageEnter([activeMode])
  const revealRef = useScrollReveal([activeMode, availableCompanies, availableTopics])

  useEffect(() => {
    getAptitudeCompanies().then(res => setAvailableCompanies(res.data.data)).catch(console.error)
    getAptitudeTopics().then(res => setAvailableTopics(res.data.data)).catch(console.error)
  }, [])

  const toggleSelection = (setter, item) => {
    setter(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])
  }

  const getDeficit = (avail, modeId, qCount, diff) => {
    let reqE = 0, reqM = 0, reqH = 0;
    if(modeId === 'beginner') { reqE = Math.ceil(qCount * 0.7); reqM = qCount - reqE; }
    else if(modeId === 'standard') { reqE = Math.ceil(qCount * 0.2); reqM = Math.ceil(qCount * 0.7); reqH = qCount - reqE - reqM; }
    else if(modeId === 'advanced') { reqM = Math.ceil(qCount * 0.4); reqH = qCount - reqM; }
    else if(diff === 'easy') reqE = qCount;
    else if(diff === 'medium') reqM = qCount;
    else if(diff === 'hard') reqH = qCount;

    if (avail.easy < reqE || avail.medium < reqM || avail.hard < reqH) {
      // Find what difficulty we are missing the most of
      let missingDiff = reqH > avail.hard ? 'Hard' : reqM > avail.medium ? 'Medium' : 'Easy';
      return { deficit: true, reqE, reqM, reqH, avail, missingDiff };
    }
    if (avail.total < qCount) {
      return { deficit: true, reqE, reqM, reqH, avail, missingDiff: 'General' }
    }
    return { deficit: false };
  }

  const handlePreflightCheck = async () => {
    if (selectedCategories.length === 0) return toast.error("Please select at least one Test Section.")
    setLoading(true)

    const count = activeMode === 'custom' ? customQCount : MODES.find(m => m.id === activeMode).questions;
    const diff = activeMode === 'custom' ? customDiff : activeMode;

    try {
      const availRes = await checkAptitudeAvailability({
        companies: selectedCompanies.length > 0 ? selectedCompanies : undefined,
        topics: selectedTopics.length > 0 ? selectedTopics : undefined,
        categories: selectedCategories
      });

      const avail = availRes.data.data;
      const deficitCheck = getDeficit(avail, activeMode, count, diff);

      if (deficitCheck.deficit) {
        setWarningData({ ...deficitCheck, count, diff });
        setShowWarning(true);
        setLoading(false);
        return;
      }

      // No deficit, start strictly
      await executeTestStart('strict', count, diff);

    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to check availability.')
      setLoading(false)
    }
  }

  const executeTestStart = async (fallbackStrategy, count, diff) => {
    setLoading(true)
    setShowWarning(false)
    try {
      const res = await startAptitudeTest({
        questionCount: count,
        difficultyLevel: diff,
        fallbackStrategy,
        companies: selectedCompanies.length > 0 ? selectedCompanies : undefined,
        topics: selectedTopics.length > 0 ? selectedTopics : undefined,
        categories: selectedCategories
      })

      const { attemptId, sections, duration } = res.data.data
      navigate(`/aptitude/${attemptId}/test`, { state: { sections, duration } })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start test. No matching questions found.')
    } finally {
      setLoading(false)
    }
  }

  const customCalculatedTime = Math.floor(customQCount * 1.3);

  const filteredCompanies = availableCompanies.filter(c => c.toLowerCase().includes(companySearch.toLowerCase()))
  const filteredTopics = availableTopics.filter(t => t.toLowerCase().includes(topicSearch.toLowerCase()))

  const activeDefinition = MODES.find((m) => m.id === activeMode)
  const plannedCount = activeMode === 'custom' ? customQCount : activeDefinition?.questions ?? 0
  const plannedDuration = activeMode === 'custom' ? customCalculatedTime : activeDefinition?.duration ?? 0

  return (
    <div className="page-shell text-ink">
      <Navbar />

      <main className="container-page max-w-5xl pb-24 pt-[calc(var(--nav-h)+1.5rem)]">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <header ref={enterRef} className="ambient relative mb-6 overflow-hidden rounded-3xl border border-hairline bg-surface p-6 shadow-2 sm:p-8">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="line-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_70%_90%_at_88%_0%,black,transparent_72%)]" />
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/12 blur-3xl" />
          </div>

          <div data-enter className="relative max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                <Brain className="h-5 w-5" aria-hidden />
              </span>
              <p className="eyebrow">Aptitude lab</p>
            </div>
            <h1 className="t-h1 mt-4">Build your assessment</h1>
            <p className="t-body mt-2 max-w-xl">
              Choose a mode and target the sections that matter. The room handles timing, proctoring and submission.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="badge badge-accent capitalize">{activeMode} mode</span>
              <span className="badge num">{plannedCount} questions</span>
              <span className="badge num">{plannedDuration} min</span>
              <span className="badge num">{selectedCategories.length} of {CATEGORIES.length} sections</span>
            </div>
          </div>
        </header>

        <div ref={revealRef} className="space-y-6">
          {/* ── Test mode ─────────────────────────────────────────────── */}
          <section data-reveal aria-labelledby="mode-heading">
            <div className="mb-3 flex items-start gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                <Target className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <h2 id="mode-heading" className="t-h3 leading-tight">Choose a mode</h2>
                <p className="t-xs mt-0.5">Pick a preset, or define your own question count and difficulty.</p>
              </div>
            </div>

            <div role="radiogroup" aria-label="Test mode" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {MODES.map(m => {
                const active = activeMode === m.id
                const count = m.id === 'custom' ? customQCount : m.questions
                const duration = m.id === 'custom' ? customCalculatedTime : m.duration
                return (
                  <label key={m.id} className="cursor-pointer">
                    <input
                      type="radio"
                      name="aptitude-mode"
                      className="peer sr-only"
                      checked={active}
                      onChange={() => setActiveMode(m.id)}
                    />
                    <div
                      className={cx(
                        'flex h-full flex-col rounded-2xl border p-4 transition-all duration-fast',
                        'peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50',
                        active ? CARD_ACTIVE : CARD_IDLE,
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold tracking-tight text-ink">{m.label}</h3>
                        <span
                          aria-hidden
                          className={cx(
                            'grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors',
                            active
                              ? 'border-accent bg-accent text-accent-on'
                              : 'border-hairline-strong bg-surface text-transparent'
                          )}
                        >
                          <Check className="h-3 w-3" />
                        </span>
                      </div>
                      <span className={cx(MODE_TAG_TONE[m.tone], 'mt-2 w-fit')}>{m.tag}</span>
                      <p className="t-xs mb-4 mt-2.5">{m.desc}</p>

                      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-hairline pt-3">
                        <div>
                          <p className="num text-sm font-semibold text-ink">{count}</p>
                          <p className="text-2xs text-faint">Questions</p>
                        </div>
                        <div>
                          <p className="num text-sm font-semibold text-ink">{duration}<span className="text-2xs font-normal text-subtle"> min</span></p>
                          <p className="text-2xs text-faint">Time limit</p>
                        </div>
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          </section>

          {/* ── Custom configuration ──────────────────────────────────── */}
          {activeMode === 'custom' && (
            <section data-reveal aria-label="Custom test configuration">
              <Card className="border-dashed p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-accent" aria-hidden />
                  <h2 className="text-sm font-semibold text-ink">Custom setup</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Select
                    label="Question count"
                    value={customQCount}
                    onChange={(e) => setCustomQCount(Number(e.target.value))}
                  >
                    <option value={10}>10 questions</option>
                    <option value={20}>20 questions</option>
                    <option value={30}>30 questions</option>
                    <option value={40}>40 questions</option>
                  </Select>
                  <Select
                    label="Difficulty"
                    value={customDiff}
                    onChange={(e) => setCustomDiff(e.target.value)}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </Select>
                  <div className="flex flex-col justify-center rounded-xl border border-accent/15 bg-accent-soft/50 px-4 py-3">
                    <div className="eyebrow mb-1 flex items-center justify-between">
                      <span>Calculated time</span>
                      <Tooltip content="Avg 1.2–1.5 min per question based on professional standards. Time cannot be manually overridden.">
                        <button type="button" aria-label="About calculated time" className="grid h-6 w-6 place-items-center rounded-full bg-surface text-accent">
                          <HelpCircle className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </Tooltip>
                    </div>
                    <div className="num text-xl font-semibold text-accent">{customCalculatedTime} min</div>
                  </div>
                </div>
              </Card>
            </section>
          )}

          {/* ── Sections (categories) ─────────────────────────────────── */}
          <section data-reveal aria-labelledby="sections-heading">
            <Card className="p-5 sm:p-6">
              <div className="mb-4 flex items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ai-soft text-ai">
                  <Brain className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <h2 id="sections-heading" className="t-h3 leading-tight">Target sections</h2>
                  <p className="t-xs mt-0.5">Every selected category appears in the paper. Pick at least one.</p>
                </div>
              </div>
              <div role="group" aria-label="Test sections" className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => {
                  const active = selectedCategories.includes(cat)
                  return (
                    <button
                      key={cat}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleSelection(setSelectedCategories, cat)}
                      className="chip min-h-[2.75rem] px-4 capitalize"
                    >
                      {active && <Check className="h-3.5 w-3.5" aria-hidden />}
                      {cat}
                    </button>
                  )
                })}
              </div>
              {selectedCategories.length === 0 && (
                <p role="alert" className="mt-3 text-xs font-medium text-danger-500">You must select at least one section.</p>
              )}
            </Card>
          </section>

          {/* ── Companies + Topics ────────────────────────────────────── */}
          <div data-reveal className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="flex h-full flex-col p-5 sm:p-6">
              <div className="mb-4 flex items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-success-bg text-success-500">
                  <Building2 className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <h2 className="t-h3 leading-tight">Target companies</h2>
                  <p className="t-xs mt-0.5">Optional. Leave blank to draw from every company.</p>
                </div>
              </div>
              {availableCompanies.length === 0 ? (
                <div className="rounded-xl border border-dashed border-hairline bg-inset/50 p-4">
                  <p className="t-sm font-medium text-muted">No companies in the question bank yet.</p>
                  <p className="t-xs mt-1">Your paper will draw from the full pool instead.</p>
                </div>
              ) : (
                <>
                  <Input
                    label="Search companies"
                    type="text"
                    placeholder="Type to filter…"
                    value={companySearch}
                    onChange={(e) => setCompanySearch(e.target.value)}
                  />
                  <div className="mt-3 flex max-h-48 flex-wrap gap-2 overflow-y-auto pr-1">
                    {filteredCompanies.map(c => {
                      const active = selectedCompanies.includes(c)
                      return (
                        <button key={c} type="button" aria-pressed={active} onClick={() => toggleSelection(setSelectedCompanies, c)} className="chip">
                          {active && <Check className="h-3 w-3" aria-hidden />}
                          {c}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </Card>

            <Card className="flex h-full flex-col p-5 sm:p-6">
              <div className="mb-4 flex items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ai-soft text-ai">
                  <Tag className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <h2 className="t-h3 leading-tight">Target topics</h2>
                  <p className="t-xs mt-0.5">Optional. Narrow the paper to specific skills.</p>
                </div>
              </div>
              {availableTopics.length === 0 ? (
                <div className="rounded-xl border border-dashed border-hairline bg-inset/50 p-4">
                  <p className="t-sm font-medium text-muted">No topics tagged in the question bank yet.</p>
                  <p className="t-xs mt-1">Your paper will cover every topic in the selected sections.</p>
                </div>
              ) : (
                <>
                  <Input
                    label="Search topics"
                    type="text"
                    placeholder="Type to filter…"
                    value={topicSearch}
                    onChange={(e) => setTopicSearch(e.target.value)}
                  />
                  <div className="mt-3 flex max-h-48 flex-wrap gap-2 overflow-y-auto pr-1">
                    {filteredTopics.map(t => {
                      const active = selectedTopics.includes(t)
                      return (
                        <button key={t} type="button" aria-pressed={active} onClick={() => toggleSelection(setSelectedTopics, t)} className="chip">
                          {active && <Check className="h-3 w-3" aria-hidden />}
                          {t}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* ── Instructions ──────────────────────────────────────────── */}
          <section data-reveal aria-labelledby="instructions-heading">
            <Card className="p-5 sm:p-6">
              <div className="mb-4 flex items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-warning-bg text-warning-500">
                  <Zap className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <h2 id="instructions-heading" className="t-h3 leading-tight">Before the clock starts</h2>
                  <p className="t-xs mt-0.5">The session is timed and monitored for fairness.</p>
                </div>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {[
                  'The test submits automatically when time is up.',
                  'Stay in fullscreen mode for the entire session.',
                  'Switching tabs or windows records a violation.',
                  'Repeated violations end the test automatically.',
                ].map((rule, i) => (
                  <li key={rule} className="flex gap-3 rounded-xl border border-hairline bg-inset/40 p-3">
                    <span className="num grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface text-2xs font-semibold text-warning-500 shadow-1">{i + 1}</span>
                    <p className="t-sm leading-relaxed">{rule}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </section>

          {/* ── Start ─────────────────────────────────────────────────── */}
          <section data-reveal className="card overflow-hidden">
            <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                  <Target className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="eyebrow">Ready when you are</p>
                  <p className="t-h3 mt-1 text-ink">
                    <span className="num">{plannedCount}</span> questions
                    <span className="mx-1.5 text-faint" aria-hidden>·</span>
                    <span className="num">{plannedDuration}</span> min
                  </p>
                  <p className="t-xs mt-1">Timing and scope are fixed once the clock starts.</p>
                </div>
              </div>
              <Button size="lg" loading={loading} onClick={handlePreflightCheck} className="w-full shrink-0 lg:w-auto">
                Verify &amp; start test
              </Button>
            </div>
          </section>
        </div>
      </main>

      {/* ── Availability warning ───────────────────────────────────────── */}
      <Modal
        open={showWarning}
        onClose={() => setShowWarning(false)}
        title="Limited database availability"
        description={`Only a limited pool of '${warningData?.missingDiff}' questions matches your filters.`}
      >
        {warningData && (
          <div className="space-y-5">
            <div className="rounded-lg border border-hairline bg-inset p-4">
              <p className="eyebrow mb-2">Current available pool</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {['hard', 'medium', 'easy'].map(k => (
                  <div key={k} className="rounded-md bg-surface py-2">
                    <div className={`num text-lg font-semibold ${POOL_TONE[k]}`}>{warningData.avail[k]}</div>
                    <div className="text-2xs capitalize text-subtle">{k}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Button block onClick={() => executeTestStart('mixed', warningData.count, warningData.diff)}>
                Accept mixed difficulty
              </Button>
              <p className="t-xs text-center">Auto-pads remaining slots to keep <span className="num">{warningData.count}</span> questions.</p>
              <Button block variant="outline" onClick={() => executeTestStart('strict', warningData.count, warningData.diff)}>
                Take strict test instead
              </Button>
              <p className="t-xs text-center">Reduces total questions to strictly match your filters.</p>
              <Button block variant="ghost" onClick={() => setShowWarning(false)}>Cancel &amp; change filters</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
