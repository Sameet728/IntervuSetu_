import { motion } from 'framer-motion'
import { Badge } from '../ui/index'
import { Sparkles, Code2, Brain, Users } from 'lucide-react'

const typeConfig = {
  code:          { color: 'cyan',    icon: <Code2 className="w-3.5 h-3.5" />,     label: 'Code' },
  theory:        { color: 'violet',  icon: <Brain className="w-3.5 h-3.5" />,     label: 'Theory' },
  hr:            { color: 'emerald', icon: <Users className="w-3.5 h-3.5" />,     label: 'HR' },
  behavioral:    { color: 'amber',   icon: <Users className="w-3.5 h-3.5" />,     label: 'Behavioral' },
  system_design: { color: 'rose',    icon: <Sparkles className="w-3.5 h-3.5" />,  label: 'System Design' },
}

const diffColor = { easy: 'emerald', medium: 'amber', hard: 'rose' }

export default function QuestionCard({ question, index, total, followupCount = 0, isFollowup = false }) {
  if (!question) return null
  const cfg = typeConfig[question.questionType] || typeConfig.theory

  return (
    <motion.div
      key={question.questionId}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="bg-card border border-border rounded-2xl p-5 shadow-card"
    >
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {isFollowup ? (
          <Badge color="amber">↩ Follow-up #{followupCount}</Badge>
        ) : (
          <Badge color="slate">Q {index + 1} / {total}</Badge>
        )}
        <Badge color={cfg.color}>{cfg.icon}{cfg.label}</Badge>
        <Badge color={diffColor[question.difficulty] || 'slate'}>{question.difficulty}</Badge>
        {question.topic && (
          <Badge color="slate">{question.topic}</Badge>
        )}
      </div>

      {/* Question text */}
      <p className="text-slate-100 font-body text-base sm:text-lg leading-relaxed">
        {question.question || question}
      </p>
    </motion.div>
  )
}
