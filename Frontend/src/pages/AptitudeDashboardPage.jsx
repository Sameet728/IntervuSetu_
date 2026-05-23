import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../components/layout/Navbar'
import { Button, Card, Badge, Spinner, ScoreRing } from '../components/ui/index'
import { getAptitudeHistory } from '../api/aptitudeAPI'
import { Brain, ExternalLink, Plus, Calendar, Target } from 'lucide-react'

export default function AptitudeDashboardPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await getAptitudeHistory()
        setHistory(res.data.data)
      } catch (err) {
        console.error('Failed to load history', err)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [])

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 mb-3">
              <Brain className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-[Poppins]">
              Aptitude Dashboard
            </h1>
            <p className="text-sm text-zinc-500 mt-1">Review your past performance and start new tests</p>
          </div>
          <Link to="/aptitude/setup">
            <Button variant="primary" className="shadow-lg shadow-blue-500/20">
              <Plus className="w-4 h-4" /> Start New Test
            </Button>
          </Link>
        </div>

        <h2 className="text-lg font-semibold mb-4 text-zinc-800 dark:text-zinc-200">Recent Tests</h2>

        {loading ? (
          <div className="flex justify-center p-12"><Spinner /></div>
        ) : history.length === 0 ? (
          <Card className="p-12 text-center text-zinc-500">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="mb-4">You haven't taken any aptitude tests yet.</p>
            <Link to="/aptitude/setup"><Button variant="outline">Take your first test</Button></Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {history.map((attempt) => (
              <Card 
                key={attempt._id} 
                className="p-5 flex flex-col hover:border-blue-300 dark:hover:border-blue-800 transition-colors cursor-pointer group"
                onClick={() => navigate(`/aptitude/${attempt._id}/report`)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(attempt.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <Badge color={attempt.accuracy >= 70 ? 'green' : attempt.accuracy >= 40 ? 'amber' : 'red'}>
                    {Math.round(attempt.accuracy)}% Accuracy
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      Score: {attempt.totalScore}/{attempt.answers?.length}
                    </span>
                  </div>
                  <div className="text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="w-5 h-5" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
