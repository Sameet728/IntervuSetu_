import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Navbar from '../components/layout/Navbar'
import { Button, Card, Badge, Spinner, Input, Select } from '../components/ui/index'
import { getQuestions, addQuestion, deleteQuestion, bulkUploadQuestions } from '../api/adminAPI'
import toast from 'react-hot-toast'
import { Trash2, Plus, Upload, Brain, TerminalSquare, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'

function QuestionCard({ q, i, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <Card className="overflow-hidden">
      <div className="p-4 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex gap-2 mb-3 flex-wrap items-center">
            <span className="text-xs font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-mono">Q{i+1}</span>
            <Badge color={q.difficulty === 'hard' ? 'red' : q.difficulty === 'medium' ? 'amber' : 'green'}>{q.difficulty}</Badge>
            <Badge color="blue">{q.category}</Badge>
            {q.tags?.length > 0 && q.tags.map(tag => (
              <span key={tag} className="text-[11px] px-2 py-0.5 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800 rounded-full">#{tag}</span>
            ))}
            {q.companies?.length > 0 && q.companies.map(c => (
              <span key={c} className="text-[11px] px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-full">💼 {c}</span>
            ))}
          </div>
          <p className="text-zinc-900 dark:text-zinc-100 font-medium text-sm leading-relaxed mb-3">{q.question}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-3">
            {q.options.map((opt, oi) => (
              <div key={opt._id} className={`p-2 rounded-md border text-sm flex items-center gap-2 ${opt.isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium' : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${opt.isCorrect ? 'bg-green-500 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'}`}>
                  {opt.isCorrect ? '✓' : String.fromCharCode(65 + oi)}
                </span>
                {opt.text}
              </div>
            ))}
          </div>
          {q.detailedSolution && (
            <div>
              <button
                onClick={() => setExpanded(e => !e)}
                className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 flex items-center gap-1 mb-2 transition-colors"
              >
                <Brain className="w-3.5 h-3.5" />
                {expanded ? 'Hide Solution' : 'View Detailed Solution'}
                {expanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
              </button>
              {expanded && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-900 dark:text-amber-200 leading-relaxed whitespace-pre-wrap">
                  {q.detailedSolution}
                </div>
              )}
            </div>
          )}
        </div>
        <button onClick={() => onDelete(q._id)} className="text-zinc-400 hover:text-red-500 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex-shrink-0">
          <Trash2 className="w-5 h-5" />
        </button>
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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-[Poppins]">
              Admin Panel
            </h1>
            <p className="text-sm text-zinc-500 mt-1">Manage Aptitude Test Question Bank</p>
          </div>
          <div className="flex bg-zinc-200 dark:bg-zinc-800 p-1 rounded-lg">
            {['list', 'add', 'bulk'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === t 
                    ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm' 
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {tab === 'list' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {loading ? <div className="flex justify-center p-12"><Spinner /></div> : (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm text-zinc-500 mb-2 px-2">
                  <span>Total Questions: {questions.length}</span>
                </div>
                {questions.map((q, i) => (
                  <QuestionCard key={q._id} q={q} i={i} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {tab === 'add' && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
            <Card className="p-6">
              <form onSubmit={handleAddSubmit} className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-2">Question Text</label>
                  <textarea 
                    className="w-full rounded-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:border-blue-500 outline-none border"
                    rows={4}
                    required
                    value={qForm.question}
                    onChange={e => setQForm({...qForm, question: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Select label="Category" value={qForm.category} onChange={e => setQForm({...qForm, category: e.target.value})}>
                    <option value="numerical">Numerical</option>
                    <option value="verbal">Verbal</option>
                    <option value="logical">Logical</option>
                    <option value="situational">Situational</option>
                  </Select>
                  <Select label="Difficulty" value={qForm.difficulty} onChange={e => setQForm({...qForm, difficulty: e.target.value})}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </Select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Options</label>
                    <Button type="button" variant="ghost" size="xs" onClick={handleAddOption}><Plus className="w-3 h-3"/> Add Option</Button>
                  </div>
                  <div className="space-y-2">
                    {qForm.options.map((opt, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input 
                          type="radio" 
                          name="isCorrect" 
                          checked={opt.isCorrect} 
                          onChange={() => handleOptionChange(i, 'isCorrect')}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <Input 
                          placeholder={`Option ${i+1}`}
                          value={opt.text}
                          onChange={e => handleOptionChange(i, 'text', e.target.value)}
                          className="flex-1"
                          required
                        />
                        {qForm.options.length > 2 && (
                          <button type="button" onClick={() => setQForm(p => ({ ...p, options: p.options.filter((_, idx)=>idx!==i)}))} className="text-red-500 p-2"><Trash2 className="w-4 h-4"/></button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input label="Tags (comma separated)" placeholder="e.g. algebra, fractions" value={qForm.tags} onChange={e => setQForm({...qForm, tags: e.target.value})} />
                  <Input label="Companies (comma separated)" placeholder="e.g. Google, TCS, Amazon" value={qForm.companies} onChange={e => setQForm({...qForm, companies: e.target.value})} />
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-2">Detailed Solution (Markdown Supported, Optional)</label>
                  <textarea 
                    className="w-full rounded-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:border-blue-500 outline-none border"
                    rows={4}
                    placeholder="Provide a step-by-step solution..."
                    value={qForm.detailedSolution}
                    onChange={e => setQForm({...qForm, detailedSolution: e.target.value})}
                  />
                </div>

                <Button type="submit" className="w-full">Save Question</Button>
              </form>
            </Card>
          </motion.div>
        )}

        {tab === 'bulk' && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
            <Card className="p-6">
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-lg text-sm flex gap-3 items-start">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">JSON Format Required</p>
                  <p className="font-mono text-[10px] sm:text-xs opacity-80 break-all leading-relaxed">
                    [{`{"question":"Q text","category":"numerical","difficulty":"easy","options":[{"text":"Opt 1","isCorrect":true},{"text":"Opt 2","isCorrect":false}],"tags":["algebra"],"companies":["Google","TCS"],"detailedSolution":"Step by step..."}`}]
                  </p>
                </div>
              </div>
              <form onSubmit={handleBulkSubmit}>
                <textarea
                  className="w-full font-mono text-xs rounded-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3 focus:border-blue-500 outline-none border mb-4"
                  rows={15}
                  placeholder="Paste JSON array here..."
                  value={bulkJson}
                  onChange={e => setBulkJson(e.target.value)}
                  required
                />
                <Button type="submit" className="w-full"><Upload className="w-4 h-4 mr-2"/> Upload JSON</Button>
              </form>
            </Card>
          </motion.div>
        )}

      </div>
    </div>
  )
}
