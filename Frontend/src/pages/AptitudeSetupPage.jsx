import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/layout/Navbar'
import { Button, Card } from '../components/ui/index'
import { startAptitudeTest, getAptitudeCompanies, getAptitudeTopics, checkAptitudeAvailability } from '../api/aptitudeAPI'
import toast from 'react-hot-toast'
import { Brain, Clock, Zap, Building2, Tag, AlertTriangle, Settings2, Target } from 'lucide-react'

const MODES = [
  { id: 'beginner', label: 'Beginner Mode', questions: 15, duration: 20, difficulty: "easy-to-medium", tag: "Practice", desc: "For learning & practice.", bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800", activeBg: "bg-emerald-100 border-emerald-500 shadow-md ring-2 ring-emerald-500/20 dark:bg-emerald-900/40" },
  { id: 'standard', label: 'Standard Mode', questions: 30, duration: 40, difficulty: "medium", tag: "Placement Simulation", desc: "Real placement prep.", bg: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800", activeBg: "bg-blue-100 border-blue-500 shadow-md ring-2 ring-blue-500/20 dark:bg-blue-900/40" },
  { id: 'advanced', label: 'Advanced Mode', questions: 45, duration: 60, difficulty: "medium-to-hard", tag: "MNC Level", desc: "High-pressure simulation.", bg: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800", activeBg: "bg-rose-100 border-rose-500 shadow-md ring-2 ring-rose-500/20 dark:bg-rose-900/40" },
  { id: 'custom', label: 'Custom Mode', questions: 20, duration: 26, difficulty: "custom", tag: "Advanced Users", desc: "Configure your own rules.", bg: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-300 dark:border-zinc-700", activeBg: "bg-zinc-200 border-zinc-500 shadow-md ring-2 ring-zinc-500/20 dark:bg-zinc-800" },
]

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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 mb-4">
              <Brain className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2 font-['Poppins']">
              Professional Aptitude Assessment
            </h1>
            <p className="text-zinc-500">
              Structured placement simulations tailored to major MNC benchmarks.
            </p>
          </div>

          <div className="mb-6">
            <h2 className="text-sm font-semibold flex items-center gap-2 mb-3 dark:text-zinc-100">
              <Target className="w-4 h-4 text-indigo-500" /> Select Test Mode
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {MODES.map(m => (
                <div 
                  key={m.id}
                  onClick={() => setActiveMode(m.id)}
                  className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 relative overflow-hidden ${
                    activeMode === m.id ? m.activeBg : m.bg
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-sm tracking-tight">{m.label}</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded border border-current opacity-70">
                      {m.tag}
                    </span>
                  </div>
                  <p className="text-xs mb-3 opacity-80 h-4">{m.desc}</p>
                  
                  {m.id !== 'custom' ? (
                    <div className="flex gap-3 text-sm font-semibold mt-auto pt-2 border-t border-current/10">
                       <span className="flex items-center gap-1"><Brain className="w-3 h-3"/> {m.questions} Q</span>
                       <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {m.duration} Min</span>
                    </div>
                  ) : (
                    <div className="mt-auto pt-2 border-t border-current/10 flex items-center text-xs font-semibold">
                      <Settings2 className="w-3 h-3 mr-1"/> Configurable
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {activeMode === 'custom' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6">
              <Card className="p-5 border-dashed border-2 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col sm:flex-row gap-6">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2 block">Question Count</label>
                  <select 
                    value={customQCount} onChange={(e) => setCustomQCount(Number(e.target.value))}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={10}>10 Questions</option>
                    <option value={20}>20 Questions</option>
                    <option value={30}>30 Questions</option>
                    <option value={40}>40 Questions</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2 block">Difficulty</label>
                  <select 
                    value={customDiff} onChange={(e) => setCustomDiff(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="easy">Easy (100%)</option>
                    <option value="medium">Medium (100%)</option>
                    <option value="hard">Hard (100%)</option>
                  </select>
                </div>
                <div className="flex-1 flex flex-col justify-center bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-100 dark:border-blue-900/30">
                  <div className="text-[10px] uppercase font-bold text-blue-500 mb-1 flex items-center justify-between">
                    <span>Calculated Time</span>
                    <div className="group relative cursor-help">
                      <div className="w-4 h-4 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-blue-700 dark:text-blue-300">?</div>
                      <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-zinc-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                        Avg 1.2–1.5 min per question based on professional standards. Time cannot be manually overridden.
                      </div>
                    </div>
                  </div>
                  <div className="text-xl font-black text-blue-700 dark:text-blue-400 font-['Poppins']">
                    {customCalculatedTime} Mins
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          <Card className="p-6 mb-6">
            <h2 className="text-sm font-semibold flex items-center gap-2 mb-4 dark:text-zinc-100">
              <Brain className="w-4 h-4 text-pink-500" /> Target Sections (Categories)
            </h2>
            <div className="flex flex-wrap gap-2">
              {["numerical", "verbal", "logical", "situational"].map(cat => (
                <button 
                  key={cat} onClick={() => toggleSelection(setSelectedCategories, cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize border transition-all ${
                    selectedCategories.includes(cat) 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                    : 'bg-zinc-100 border-zinc-200 text-zinc-600 dark:bg-zinc-900/50 dark:border-zinc-800 dark:text-zinc-400 hover:border-blue-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            {selectedCategories.length === 0 && <p className="text-red-500 text-xs mt-3 font-semibold">You must select at least one section.</p>}
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="p-6 flex flex-col h-full">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-3 dark:text-zinc-100">
                <Building2 className="w-4 h-4 text-emerald-500" /> Target Companies (Optional)
              </h2>
              {availableCompanies.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">No companies available yet.</p>
              ) : (
                <>
                  <input 
                    type="text" 
                    placeholder="Search companies..." 
                    value={companySearch}
                    onChange={(e) => setCompanySearch(e.target.value)}
                    className="w-full text-xs px-3 py-2 mb-3 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-shadow transition-colors placeholder:text-zinc-400"
                  />
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {availableCompanies.filter(c => c.toLowerCase().includes(companySearch.toLowerCase())).map(c => (
                      <button 
                        key={c} onClick={() => toggleSelection(setSelectedCompanies, c)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold border transition-all ${
                          selectedCompanies.includes(c) 
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' 
                          : 'bg-zinc-50 border-zinc-200 text-zinc-600 dark:bg-zinc-900/30 dark:border-zinc-800 dark:text-zinc-400 hover:border-emerald-400'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </Card>

            <Card className="p-6 flex flex-col h-full">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-3 dark:text-zinc-100">
                <Tag className="w-4 h-4 text-purple-500" /> Target Topics (Optional)
              </h2>
              {availableTopics.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">No exact topics available yet.</p>
              ) : (
                <>
                  <input 
                    type="text" 
                    placeholder="Search topics..." 
                    value={topicSearch}
                    onChange={(e) => setTopicSearch(e.target.value)}
                    className="w-full text-xs px-3 py-2 mb-3 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-shadow transition-colors placeholder:text-zinc-400"
                  />
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {availableTopics.filter(t => t.toLowerCase().includes(topicSearch.toLowerCase())).map(t => (
                      <button 
                        key={t} onClick={() => toggleSelection(setSelectedTopics, t)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold border transition-all ${
                          selectedTopics.includes(t) 
                          ? 'bg-purple-500 border-purple-500 text-white shadow-sm' 
                          : 'bg-zinc-50 border-zinc-200 text-zinc-600 dark:bg-zinc-900/30 dark:border-zinc-800 dark:text-zinc-400 hover:border-purple-400'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </div>

          <Card className="p-6 mb-8 bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-2 text-zinc-900 dark:text-zinc-100">
              <Zap className="w-4 h-4 text-amber-500" /> Test Instructions & Proctoring
            </h3>
            <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2 list-disc pl-5">
              <li>Test will automatically submit when time is up.</li>
              <li>You MUST remain in <strong className="text-zinc-900 dark:text-zinc-200">Fullscreen mode</strong>.</li>
              <li>Do not switch tabs or windows. Doing so will record a violation.</li>
              <li>3 violations will result in automatic submission.</li>
            </ul>
          </Card>

          <Button 
            className="w-full py-4 text-lg" 
            loading={loading} 
            onClick={handlePreflightCheck}
          >
            Verify & Start Test
          </Button>
        </motion.div>
      </div>

      {/* Warning Fallback Dialog */}
      <AnimatePresence>
        {showWarning && warningData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Limited Database Availability</h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                  There are limited <strong className="text-zinc-900 dark:text-zinc-200">'{warningData.missingDiff}'</strong> questions available in our database matching your strict specific filters (Companies/Topics).
                </p>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg mb-6 border border-zinc-200 dark:border-zinc-800">
                  <h4 className="text-xs uppercase font-bold text-zinc-500 mb-2">Current Available Pool</h4>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="bg-white dark:bg-zinc-900 py-2 rounded">
                      <div className="text-rose-500 font-bold">{warningData.avail.hard}</div>
                      <div className="text-[10px] text-zinc-500">Hard</div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 py-2 rounded">
                      <div className="text-blue-500 font-bold">{warningData.avail.medium}</div>
                      <div className="text-[10px] text-zinc-500">Medium</div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 py-2 rounded">
                      <div className="text-emerald-500 font-bold">{warningData.avail.easy}</div>
                      <div className="text-[10px] text-zinc-500">Easy</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={() => executeTestStart('mixed', warningData.count, warningData.diff)}
                    className="w-full relative overflow-hidden bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold py-3 px-4 rounded-xl text-sm transition-all hover:opacity-90 flex flex-col items-center justify-center"
                  >
                    <span>Accept Mixed Difficulty (Default)</span>
                    <span className="text-xs font-normal opacity-70">Will smartly auto-pad remaining slots to maintain {warningData.count} Qs</span>
                  </button>
                  <button 
                    onClick={() => executeTestStart('strict', warningData.count, warningData.diff)}
                    className="w-full bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-700 text-zinc-900 dark:text-zinc-300 font-bold py-3 px-4 rounded-xl text-sm transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800 flex flex-col items-center justify-center"
                  >
                    <span>Take Strict Test Instead</span>
                    <span className="text-xs font-normal opacity-70">Reduces total questions to strictly match parameters</span>
                  </button>
                  <button 
                    onClick={() => setShowWarning(false)}
                    className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  >
                    Cancel & Change Filters
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
