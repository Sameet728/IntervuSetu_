import { useState, useEffect } from 'react'
import Navbar from '../components/layout/Navbar'
import {
  Button, Card, Badge, Input, Select, Textarea, SegmentedControl,
  EmptyState, IconButton, Skeleton,
} from '../components/ui/index'
import { usePageEnter, useScrollReveal } from '../motion/index'
import { getQuestions, addQuestion, deleteQuestion, bulkUploadQuestions } from '../api/adminAPI'
import toast from 'react-hot-toast'
import {
  Trash2, Plus, Upload, Brain, AlertCircle, ChevronDown, ChevronUp,
  Briefcase, Check, ListChecks, FilePlus2, FileJson
} from 'lucide-react'

const cx = (...parts) => parts.filter(Boolean).join(' ')

const TAB_OPTIONS = [
  { value: 'list', label: 'List', icon: <ListChecks className="h-3.5 w-3.5" aria-hidden /> },
  { value: 'add', label: 'Add', icon: <FilePlus2 className="h-3.5 w-3.5" aria-hidden /> },
  { value: 'bulk', label: 'Bulk', icon: <FileJson className="h-3.5 w-3.5" aria-hidden /> },
]

/* Mirrors QuestionCard — badge row, question line, option grid — so the
   list never reflows when the real rows land. */
function QuestionSkeleton({ count = 4 }) {
  return (
    <div className="space-y-4">
      <span className="sr-only" role="status">Loading questions…</span>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} aria-hidden className="card p-4">
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="ml-auto h-8 w-8 shrink-0" />
          </div>
          <div className="mb-3 space-y-2">
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* Difficulty is status, so it rides the status tokens — plus the word itself. */
const DIFFICULTY_BADGE = { easy: 'success', medium: 'warning', hard: 'danger' }

function QuestionCard({ q, i, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const panelId = `admin-solution-${q._id}`
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-4 p-4">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span className="badge num font-medium">Q{i + 1}</span>
            <Badge color={DIFFICULTY_BADGE[q.difficulty] || 'default'} className="capitalize">{q.difficulty}</Badge>
            <Badge color="accent" className="capitalize">{q.category}</Badge>
            {q.tags?.length > 0 && q.tags.map(tag => (
              <Badge key={tag}>#{tag}</Badge>
            ))}
            {q.companies?.length > 0 && q.companies.map(c => (
              <Badge key={c} color="ai">
                <Briefcase className="h-3 w-3" aria-hidden />
                {c}
              </Badge>
            ))}
          </div>
          <h3 className="mb-3 text-sm font-medium leading-relaxed text-ink">{q.question}</h3>
          <ul className="mb-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {q.options.map((opt, oi) => (
              <li key={opt._id} className={cx(
                'flex items-center gap-2 rounded-md border p-2 text-sm',
                opt.isCorrect
                  ? 'border-success/40 bg-success-bg font-medium text-success-500'
                  : 'border-hairline text-muted'
              )}>
                <span className={cx(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-3xs font-semibold',
                  opt.isCorrect ? 'bg-success-500 text-white' : 'bg-hairline text-subtle'
                )}>
                  {opt.isCorrect ? <Check className="h-3 w-3" aria-hidden /> : String.fromCharCode(65 + oi)}
                </span>
                <span className="min-w-0 flex-1">{opt.text}</span>
                {/* the word as well — correctness is never green on its own */}
                {opt.isCorrect && <span className="badge badge-success shrink-0">Correct</span>}
              </li>
            ))}
          </ul>
          {q.detailedSolution && (
            <div>
              <button
                type="button"
                onClick={() => setExpanded(e => !e)}
                aria-expanded={expanded}
                aria-controls={panelId}
                className="mb-2 inline-flex items-center gap-1 rounded text-xs font-semibold text-ai transition-colors duration-fast hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                <Brain className="h-3.5 w-3.5" aria-hidden />
                {expanded ? 'Hide solution' : 'View detailed solution'}
                {expanded ? <ChevronUp className="ml-1 h-3 w-3" aria-hidden /> : <ChevronDown className="ml-1 h-3 w-3" aria-hidden />}
              </button>
              {expanded && (
                <div id={panelId} className="whitespace-pre-wrap rounded-md border border-ai/25 bg-ai-soft p-3 text-sm leading-relaxed text-ink">
                  {q.detailedSolution}
                </div>
              )}
            </div>
          )}
        </div>
        <IconButton label={`Delete question ${i + 1}`} onClick={() => onDelete(q._id)}
          className="shrink-0 hover:text-danger-500">
          <Trash2 className="h-4 w-4" aria-hidden />
        </IconButton>
      </div>
    </Card>
  )
}

export default function AdminPanelPage() {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('list') // 'list' | 'add' | 'bulk'

  const [qForm, setQForm] = useState({
    question: '',
    category: 'numerical',
    difficulty: 'medium',
    options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }],
    tags: '',
    companies: '',
    detailedSolution: ''
  })

  // Bulk Upload State
  const [bulkJson, setBulkJson] = useState('')

  const enterRef = usePageEnter([tab])
  const revealRef = useScrollReveal([tab, questions, loading])

  useEffect(() => {
    fetchQuestions()
  }, [])

  const fetchQuestions = async () => {
    setLoading(true)
    try {
      const res = await getQuestions()
      setQuestions(res.data.data)
    } catch (err) {
      toast.error('Failed to load questions. Admin access required.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this question?')) return
    try {
      await deleteQuestion(id)
      setQuestions(p => p.filter(q => q._id !== id))
      toast.success('Question deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleAddOption = () => {
    setQForm(p => ({ ...p, options: [...p.options, { text: '', isCorrect: false }] }))
  }

  const handleOptionChange = (idx, field, val) => {
    const newOpts = [...qForm.options]
    if (field === 'isCorrect') {
      // only one correct answer
      newOpts.forEach(o => o.isCorrect = false)
      newOpts[idx].isCorrect = true
    } else {
      newOpts[idx].text = val
    }
    setQForm(p => ({ ...p, options: newOpts }))
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    if (qForm.options.length < 2) return toast.error('At least 2 options required')
    if (!qForm.options.some(o => o.isCorrect)) return toast.error('One option must be correct')
    if (qForm.options.some(o => !o.text.trim())) return toast.error('Options cannot be empty')

    try {
      const tags = qForm.tags.split(',').map(t => t.trim()).filter(Boolean)
      const companies = qForm.companies.split(',').map(c => c.trim()).filter(Boolean)
      const payload = { ...qForm, tags, companies }
      await addQuestion(payload)
      toast.success('Question added')
      setQForm({ question: '', category: 'numerical', difficulty: 'medium', options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }], tags: '', companies: '', detailedSolution: '' })
      fetchQuestions()
      setTab('list')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add question')
    }
  }

  const handleBulkSubmit = async (e) => {
    e.preventDefault()
    try {
      const parsed = JSON.parse(bulkJson)
      if (!Array.isArray(parsed)) throw new Error('Root must be an array')
      await bulkUploadQuestions({ questions: parsed })
      toast.success('Bulk upload successful')
      setBulkJson('')
      fetchQuestions()
      setTab('list')
    } catch (err) {
      toast.error(err.message || 'Invalid JSON format or upload failed')
    }
  }

  return (
    <div className="page-shell text-ink">
      <Navbar />
      <main ref={revealRef} className="container-page max-w-6xl pb-24 pt-[calc(var(--nav-h)+1.5rem)]">

        <header
          ref={enterRef}
          className="ambient relative mb-6 overflow-hidden rounded-3xl border border-hairline bg-surface p-6 shadow-2 sm:p-8"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="line-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_70%_90%_at_90%_0%,black,transparent_72%)]" />
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-ai/12 blur-3xl" />
          </div>

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div data-enter className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ai-soft text-ai">
                  <ListChecks className="h-5 w-5" aria-hidden />
                </span>
                <p className="eyebrow">Administration</p>
              </div>
              <h1 className="t-h1 mt-4 text-ink">Question bank</h1>
              <p className="t-body mt-2 max-w-xl">
                Review the live question pool, add new prompts, or paste a JSON batch.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="badge badge-accent num">{questions.length} questions</span>
                <span className="badge num">{new Set(questions.map(q => q.category)).size} categories</span>
                <span className="badge num">{questions.filter(q => q.difficulty === 'hard').length} hard</span>
              </div>
            </div>
            <SegmentedControl
              ariaLabel="Admin panel section"
              options={TAB_OPTIONS}
              value={tab}
              onChange={setTab}
              size="sm"
              className="w-full shrink-0 sm:w-auto"
            />
          </div>
        </header>

        {tab === 'list' && (
          <section data-reveal aria-labelledby="admin-list-heading">
            <h2 id="admin-list-heading" className="mb-4 flex flex-wrap items-baseline gap-x-2 px-1 text-sm font-semibold text-ink">
              All questions
              {!loading && (
                <span className="num text-xs font-normal text-subtle">
                  {questions.length} {questions.length === 1 ? 'question' : 'questions'}
                </span>
              )}
            </h2>

            {loading ? <QuestionSkeleton /> : questions.length === 0 ? (
              <Card>
                <EmptyState icon={<ListChecks className="h-5 w-5" aria-hidden />}
                  title="No questions yet"
                  description="Add one question at a time, or paste a JSON array in the bulk tab."
                  action={<Button size="md" onClick={() => setTab('add')} icon={<FilePlus2 className="h-4 w-4" aria-hidden />}>Add a question</Button>} />
              </Card>
            ) : (
              <div className="space-y-4">
                {questions.map((q, i) => (
                  <QuestionCard key={q._id} q={q} i={i} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </section>
        )}

        {tab === 'add' && (
          <section data-reveal aria-labelledby="admin-add-heading" className="card p-5 sm:p-6">
            <h2 id="admin-add-heading" className="t-h3 mb-5 flex items-center gap-2 text-ink">
              <FilePlus2 className="h-4 w-4 text-accent-500" aria-hidden />
              Add a question
            </h2>
            <form onSubmit={handleAddSubmit} className="space-y-6">
                <Textarea label="Question text" rows={4} required
                  value={qForm.question}
                  onChange={e => setQForm({ ...qForm, question: e.target.value })} />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Select label="Category" value={qForm.category} onChange={e => setQForm({ ...qForm, category: e.target.value })}>
                    <option value="numerical">Numerical</option>
                    <option value="verbal">Verbal</option>
                    <option value="logical">Logical</option>
                    <option value="situational">Situational</option>
                  </Select>
                  <Select label="Difficulty" value={qForm.difficulty} onChange={e => setQForm({ ...qForm, difficulty: e.target.value })}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </Select>
                </div>

                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="field-label" id="qform-options-label">Options <span className="font-normal text-subtle">— select the correct answer</span></p>
                    <Button type="button" variant="ghost" size="xs" onClick={handleAddOption}
                      icon={<Plus className="h-3 w-3" aria-hidden />}>
                      Add option
                    </Button>
                  </div>
                  <div className="space-y-2" role="group" aria-labelledby="qform-options-label">
                    {qForm.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="isCorrect"
                          checked={opt.isCorrect}
                          onChange={() => handleOptionChange(i, 'isCorrect')}
                          aria-label={`Mark option ${i + 1} as the correct answer`}
                          className="h-4 w-4 shrink-0 cursor-pointer accent-accent"
                        />
                        <div className="min-w-0 flex-1">
                          <Input
                            aria-label={`Option ${i + 1} text`}
                            placeholder={`Option ${i + 1}`}
                            value={opt.text}
                            onChange={e => handleOptionChange(i, 'text', e.target.value)}
                            required
                          />
                        </div>
                        {qForm.options.length > 2 && (
                          <IconButton label={`Remove option ${i + 1}`} type="button"
                            onClick={() => setQForm(p => ({ ...p, options: p.options.filter((_, idx) => idx !== i) }))}
                            className="shrink-0 hover:text-danger-500">
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </IconButton>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input label="Tags (comma separated)" placeholder="e.g. algebra, fractions" value={qForm.tags} onChange={e => setQForm({ ...qForm, tags: e.target.value })} />
                  <Input label="Companies (comma separated)" placeholder="e.g. Google, TCS, Amazon" value={qForm.companies} onChange={e => setQForm({ ...qForm, companies: e.target.value })} />
                </div>

                <Textarea label="Detailed solution (Markdown supported, optional)" rows={4}
                  placeholder="Provide a step-by-step solution..."
                  value={qForm.detailedSolution}
                  onChange={e => setQForm({ ...qForm, detailedSolution: e.target.value })} />

                <Button type="submit" block icon={<Check className="h-4 w-4" aria-hidden />}>Save question</Button>
              </form>
          </section>
        )}

        {tab === 'bulk' && (
          <section data-reveal aria-labelledby="admin-bulk-heading" className="card p-5 sm:p-6">
            <h2 id="admin-bulk-heading" className="t-h3 mb-5 flex items-center gap-2 text-ink">
              <Upload className="h-4 w-4 text-accent-500" aria-hidden />
              Bulk upload
            </h2>
            <div className="card-inset mb-4 flex items-start gap-3 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                <div className="min-w-0">
                  <p className="t-sm mb-1 font-semibold text-ink">JSON format required</p>
                  <p className="num break-all text-xs leading-relaxed text-muted">
                    [{`{"question":"Q text","category":"numerical","difficulty":"easy","options":[{"text":"Opt 1","isCorrect":true},{"text":"Opt 2","isCorrect":false}],"tags":["algebra"],"companies":["Google","TCS"],"detailedSolution":"Step by step..."}`}]
                  </p>
                </div>
              </div>
              <form onSubmit={handleBulkSubmit}>
                <Textarea label="Questions JSON" rows={15} required
                  className="font-mono text-xs"
                  hint="A JSON array of question objects — the root must be an array."
                  placeholder="Paste JSON array here..."
                  value={bulkJson}
                  onChange={e => setBulkJson(e.target.value)} />
                <div className="mt-4">
                  <Button type="submit" block icon={<Upload className="h-4 w-4" aria-hidden />}>
                    Upload JSON
                  </Button>
                </div>
              </form>
          </section>
        )}

      </main>
    </div>
  )
}
