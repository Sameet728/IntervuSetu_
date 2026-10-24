import { motion } from 'framer-motion'
import { Badge } from '../ui/index'
import { Sparkles, Code2, Brain, Users, CornerUpLeft } from 'lucide-react'
import { prefersReducedMotion } from '../../motion/index'

const TYPE_CONFIG = {
  code: { color: 'cyan', icon: <Code2 className="h-3 w-3" aria-hidden />, label: 'Code' },
  theory: { color: 'violet', icon: <Brain className="h-3 w-3" aria-hidden />, label: 'Theory' },
  hr: { color: 'emerald', icon: <Users className="h-3 w-3" aria-hidden />, label: 'HR' },
  behavioral: { color: 'amber', icon: <Users className="h-3 w-3" aria-hidden />, label: 'Behavioral' },
  system_design: { color: 'rose', icon: <Sparkles className="h-3 w-3" aria-hidden />, label: 'System Design' },
}

const DIFFICULTY_COLOR = { easy: 'emerald', medium: 'amber', hard: 'rose' }

export default function QuestionCard({ question, index, total, followupCount = 0, isFollowup = false }) {
  if (!question) return null
  const cfg = TYPE_CONFIG[question.questionType] || TYPE_CONFIG.theory
  const reduced = prefersReducedMotion()

  return (
    <motion.div
      key={question.questionId}
      initial={reduced ? false : { opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduced ? { opacity: 1 } : { opacity: 0, x: -8 }}
      transition={{ duration: reduced ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="card"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {isFollowup ? (
          <Badge color="amber">
            <CornerUpLeft className="h-3 w-3" aria-hidden />
            Follow-up #{followupCount}
          </Badge>
        ) : (
          <Badge color="slate">
            <span>Question</span>
            <span className="num">{index + 1}/{total}</span>
          </Badge>
        )}
        <Badge color={cfg.color}>
          {cfg.icon}
          {cfg.label}
        </Badge>
        <Badge color={DIFFICULTY_COLOR[question.difficulty] || 'slate'}>
          {question.difficulty || 'unspecified'}
        </Badge>
        {question.topic && <Badge color="slate">{question.topic}</Badge>}
      </div>

      <p className="t-body text-ink">{question.question || question}</p>
    </motion.div>
  )
}
