import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  Mic, Code, BarChart3, CheckCircle, ArrowRight,
  Shield, Users, Menu, X, MessageSquare, FileText,
  Heart, Zap, Target, BookOpen, Send, Moon, Sun
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import UpgradeModal from '../components/ui/UpgradeModal'
import toast from 'react-hot-toast'
import api from '../api/axios'

const fadeUp = { 
  initial: { opacity: 0, y: 16 }, 
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  whileInView: { opacity: 1, y: 0, transition: { duration: 0.5 } } 
}
const stagger = { 
  initial: {},
  animate: { transition: { staggerChildren: 0.1 } },
  whileInView: { transition: { staggerChildren: 0.1 } }
}

function NavLink({ href, children }) {
  return (
    <a href={href} className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
      {children}
    </a>
  )
}

function FeatureCard({ icon: Icon, title, description, accent = false }) {
  return (
    <motion.div variants={fadeUp} className={`rounded-xl border p-6 flex flex-col gap-3 transition-all duration-300 hover:shadow-lg ${
      accent
        ? 'bg-zinc-50 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-700'
        : 'bg-white border-zinc-100 dark:bg-zinc-900/50 dark:border-zinc-800'
    }`}>
      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-600/10 border border-blue-200 dark:border-blue-600/20 flex items-center justify-center">
        <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
      </div>
      <div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5" style={{ fontFamily: 'Poppins, sans-serif' }}>{title}</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-500 leading-relaxed">{description}</p>
      </div>
    </motion.div>
  )
}

function PriceCard({ name, price, features, primary, cta, to, onCtaClick }) {
  return (
    <motion.div variants={fadeUp} className={`relative rounded-xl border p-8 flex flex-col gap-6 shadow-sm ${
      primary
        ? 'bg-zinc-50 border-blue-200 dark:bg-zinc-900 dark:border-blue-600/40'
        : 'bg-white border-zinc-200 dark:bg-zinc-900/50 dark:border-zinc-800'
    }`}>
      {primary && (
        <div className="absolute top-0 right-8 -translate-y-1/2 px-3 py-1 rounded-full bg-blue-600 text-white text-[11px] font-bold uppercase tracking-wider shadow-sm">
          Recommended
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{name}</p>
        <div className="mt-2 flex items-end gap-1">
          <span className="text-4xl font-bold text-zinc-900 dark:text-zinc-100" style={{ fontFamily: 'Poppins, sans-serif' }}>{price}</span>
          {price !== 'Free' && <span className="text-zinc-500 text-sm mb-1">/month</span>}
        </div>
      </div>
      <ul className="flex flex-col gap-3 flex-1 mb-2">
        {features.map(f => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-400">
            <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" strokeWidth={1.5} />
            {f}
          </li>
        ))}
      </ul>
      {to ? (
        <Link
          to={to}
          className={`w-full py-3 rounded-lg text-sm font-medium text-center transition-colors ${
            primary
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20'
              : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
          }`}
        >
          {cta}
        </Link>
      ) : (
        <button
          onClick={onCtaClick}
          className={`w-full py-3 rounded-lg text-sm font-medium text-center transition-colors ${
            primary
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20'
              : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
          }`}
        >
          {cta}
        </button>
      )}
    </motion.div>
  )
}

export default function LandingPage() {
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [contactEmail, setContactEmail] = useState('')
  const [contactMessage, setContactMessage] = useState('')
  const [sendingContact, setSendingContact] = useState(false)
  
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 500], [0, 150])

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

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
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 transition-colors" style={{ fontFamily: 'Inter, system-ui' }}>

      {/* ── Navbar ───────────────────────────────────────────────── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled ? 'bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800' : 'bg-transparent'
      }`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center transition-transform group-hover:scale-105">
              <Mic className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100" style={{ fontFamily: 'Poppins, sans-serif' }}>
              IntervuSetu
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            <NavLink href="#features">Features</NavLink>
            <NavLink href="#how-it-works">How it works</NavLink>
            <NavLink href="#why-us">Why Us</NavLink>
            <NavLink href="#pricing">Pricing</NavLink>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 mr-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            {user ? (
              <Link to="/dashboard" className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm">
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/org/login" className="px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                  🏢 For Organizations
                </Link>
                <Link to="/login" className="px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                  Sign in
                </Link>
                <Link to="/register" className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm">
                  Get started free
                </Link>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => setMenuOpen(p => !p)}>
              {menuOpen ? <X className="w-5 h-5 text-zinc-900 dark:text-zinc-100" /> : <Menu className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="md:hidden bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 px-4 py-4 flex flex-col gap-3">
            {[['#features', 'Features'], ['#how-it-works', 'How it works'], ['#why-us', 'Why Us'], ['#pricing', 'Pricing']].map(([href, label]) => (
              <a key={href} href={href} className="text-sm font-medium text-zinc-600 dark:text-zinc-400 py-1.5" onClick={() => setMenuOpen(false)}>{label}</a>
            ))}
            <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
            {user ? (
              <Link to="/dashboard" className="mt-2 w-full py-3 rounded-lg text-sm font-semibold bg-blue-600 text-white text-center shadow-sm">Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="font-medium text-sm text-zinc-900 dark:text-zinc-100 py-1.5">Sign in</Link>
                <Link to="/register" className="mt-2 w-full py-3 rounded-lg text-sm font-semibold bg-blue-600 text-white text-center shadow-sm">Get started free</Link>
              </>
            )}
          </motion.div>
        )}
      </header>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 max-w-5xl mx-auto overflow-hidden text-center flex flex-col items-center">
        <motion.div style={{ y: heroY }} className="absolute -top-40 -z-10 left-1/2 -translate-x-1/2 w-[800px] h-[500px] opacity-20 dark:opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-teal-400/30 dark:from-teal-600/30 to-transparent blur-3xl rounded-full" />
        </motion.div>

        <motion.div variants={fadeUp} initial="initial" animate="whileInView" transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer">
          <Link to="#why-us" className="flex items-center gap-2"><span className="text-teal-500 font-bold">✨</span> A flagship resume-aware engine <ArrowRight className="w-3 h-3"/></Link>
        </motion.div>

        <motion.h1 variants={fadeUp} initial="initial" animate="whileInView" transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl sm:text-6xl md:text-[5.5rem] font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-6 leading-[1.05]"
          style={{ fontFamily: 'Poppins, sans-serif' }}>
          Interview Simulation,<br />
          <span className="text-[#14b8a6] dark:text-[#2dd4bf]">Powered by AI.</span>
        </motion.h1>

        <motion.p variants={fadeUp} initial="initial" animate="whileInView" transition={{ duration: 0.5, delay: 0.2 }}
          className="text-base sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
          Deploy, test, and optimize your interview skills in natural language.<br className="hidden sm:block" />
          Access deep-dive technical evaluations instantly.
        </motion.p>

        <motion.div variants={fadeUp} initial="initial" animate="whileInView" transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          {user ? (
            <Link to="/dashboard" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#14b8a6] text-white text-base font-semibold hover:bg-teal-600 transition-all shadow-sm">
              Go to Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link to="/register" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#14b8a6] text-white text-base font-semibold hover:bg-teal-600 transition-all shadow-sm">
              Start Building <ArrowRight className="w-4 h-4" />
            </Link>
          )}
          {!user && (
            <Link to="/org/login" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-base font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all">
              Contact Sales
            </Link>
          )}
        </motion.div>

        {/* ── Abstract UI Graphic ── */}
        <motion.div variants={fadeUp} initial="initial" animate="whileInView" transition={{ duration: 0.8, delay: 0.4 }} className="mt-16 w-full max-w-4xl mx-auto relative group">
          <div className="absolute inset-0 bg-teal-500/10 dark:bg-teal-500/10 blur-[80px] rounded-full opacity-50 group-hover:scale-105 transition-transform duration-700" />
          
          {/* Window Frame */}
          <div className="relative z-10 w-full bg-white dark:bg-[#0c0c0e] rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col transition-transform duration-700 hover:-translate-y-1">
             {/* Header */}
             <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/20">
               <div className="w-3 h-3 rounded-full bg-rose-400" />
               <div className="w-3 h-3 rounded-full bg-amber-400" />
               <div className="w-3 h-3 rounded-full bg-emerald-400" />
             </div>
             {/* Body */}
             <div className="p-8 md:p-12 flex flex-col md:flex-row gap-12 items-center text-left">
                {/* Left Side: Abstract Transcript */}
                <div className="flex-1 w-full space-y-6">
                  {/* AI Block */}
                  <div className="flex gap-4 items-start mb-6">
                     <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800/50 shrink-0 flex items-center justify-center">
                        <div className="w-4 h-4 bg-zinc-300 dark:bg-zinc-600 rounded-sm" />
                     </div>
                     <div className="flex-1 space-y-2.5 pt-1.5">
                       <div className="h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded-full w-[85%]" />
                       <div className="h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded-full w-[60%]" />
                       <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800/50 rounded-full w-[70%]" />
                     </div>
                  </div>
                  {/* User Block */}
                  <div className="flex gap-4 flex-row-reverse items-start">
                     <div className="w-8 h-8 rounded-full bg-teal-50 dark:bg-teal-900/20 shrink-0 flex items-center justify-center">
                        <div className="w-4 h-4 bg-teal-200 dark:bg-teal-800/80 rounded-full" />
                     </div>
                     <div className="flex-1 space-y-2.5 pt-1.5 flex flex-col items-end">
                       <div className="h-2.5 bg-teal-100 dark:bg-teal-900/40 rounded-full w-[90%]" />
                       <div className="h-2.5 bg-teal-50 dark:bg-teal-900/20 rounded-full w-[40%]" />
                     </div>
                  </div>
                </div>

                {/* Right Side: Animated "Voice Wave" representation */}
                <div className="w-full md:w-[45%] h-56 bg-zinc-50 dark:bg-[#111114] rounded-xl border border-zinc-100 dark:border-zinc-800/80 flex flex-col items-center justify-center p-6 relative overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 dark:from-teal-500/10 to-transparent pointer-events-none" />
                   {/* Animated Bars */}
                   <div className="relative z-10 flex items-end justify-center gap-1.5 sm:gap-2 h-20 w-full mb-3">
                      {[30, 70, 100, 40, 80, 50, 90, 30].map((h, i) => (
                         <motion.div
                           key={i}
                           animate={{ height: ["20%", `${h}%`, "20%"] }}
                           transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.1, ease: "easeInOut" }}
                           className="w-2.5 sm:w-3.5 bg-teal-400 dark:bg-[#14b8a6] rounded-t-sm mix-blend-multiply dark:mix-blend-lighten"
                         />
                      ))}
                   </div>
                   <div className="relative z-10 flex gap-4 w-full justify-center text-[10px] font-mono text-zinc-400 mt-2">
                     <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"/> Listening</span>
                     <span>00:04</span>
                   </div>
                </div>
             </div>
          </div>
        </motion.div>
      </section>

      {/* ── Actual Interview UI Presentation ─────────────────────── */}
      <section className="px-4 pb-20 max-w-6xl mx-auto relative z-10 -mt-10">
        <motion.div variants={fadeUp} initial="initial" whileInView="whileInView" viewport={{ once: true }} className="relative rounded-2xl md:rounded-[2rem] border border-zinc-200/80 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/50 p-2 sm:p-4 shadow-2xl backdrop-blur-sm">
          <div className="rounded-xl md:rounded-[1.5rem] overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 relative">
            {/* Browser Dots */}
            <div className="absolute top-0 left-0 right-0 h-10 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 gap-2 z-20">
              <div className="w-3 h-3 rounded-full bg-rose-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
            </div>
            {/* Replace /interview-ui.png with the actual filename if needed */}
            <img 
              src="/interview-ui.png" 
              alt="Actual Interview Room Interface" 
              className="w-full h-auto object-cover mt-10"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://via.placeholder.com/1200x800.png?text=Please+Save+Your+Screenshot+as+frontend/public/interview-ui.png";
              }}
            />
          </div>
        </motion.div>
      </section>

      {/* ── Reviews Section ──────────────────────────────────────── */}
      <section id="reviews" className="px-4 py-16 border-y border-zinc-100 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-950/50 mb-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-500 uppercase tracking-wider mb-3">Testimonials</p>
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Trusted by mentors, evaluators, and students
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            
            {/* Mentor Review */}
            <motion.div variants={fadeUp} initial="initial" whileInView="whileInView" viewport={{ once: true, delay: 0.1 }} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 flex flex-col gap-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex text-amber-400 gap-1">
                {[1,2,3,4,5].map(i => <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}
              </div>
              <p className="text-zinc-700 dark:text-zinc-300 italic flex-1">"A revolutionary tool for academic institutions. It bridges the gap between theoretical knowledge and practical interview readiness. My students are far more confident facing corporate technical rounds."</p>
              <div className="flex items-center gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-lg">
                  SG
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">Dr. Satish Gajbhiv</h4>
                  <p className="text-sm text-zinc-500">Mentor Guide • Pune</p>
                </div>
              </div>
            </motion.div>

            {/* External Evaluator Review */}
            <motion.div variants={fadeUp} initial="initial" whileInView="whileInView" viewport={{ once: true, delay: 0.2 }} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 flex flex-col gap-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex text-amber-400 gap-1">
                {[1,2,3,4,5].map(i => <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}
              </div>
              <p className="text-zinc-700 dark:text-zinc-300 italic flex-1">"The analytical depth of the AI evaluations is exactly what we look for when hiring. It identifies the same behavioral patterns and coding edge cases an expert human interviewer would."</p>
              <div className="flex items-center gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-lg">
                  EE
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">External Evaluator</h4>
                  <p className="text-sm text-zinc-500">Industry Expert</p>
                </div>
              </div>
            </motion.div>

            {/* Student Review */}
            <motion.div variants={fadeUp} initial="initial" whileInView="whileInView" viewport={{ once: true, delay: 0.3 }} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 flex flex-col gap-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex text-amber-400 gap-1">
                {[1,2,3,4,5].map(i => <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}
              </div>
              <p className="text-zinc-700 dark:text-zinc-300 italic flex-1">"Practicing with IntervuSetu completely cured my interview anxiety. The real-time voice interaction and instant feedback report helped me identify exactly what I was doing wrong before my actual tech rounds."</p>
              <div className="flex items-center gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-700 dark:text-rose-400 font-bold text-lg">
                  ST
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">Students</h4>
                  <p className="text-sm text-zinc-500">Placed Candidates</p>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section id="features" className="px-4 sm:px-6 max-w-6xl mx-auto mb-16 pt-10">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-500 uppercase tracking-wider mb-3">Power tools</p>
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Everything you need to prepare
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-lg max-w-2xl mx-auto">
            A comprehensive suite of tools designed to simulate real-world technical interviews and provide actionable insights.
          </p>
        </div>
        <motion.div
          variants={stagger} initial="initial" whileInView="animate" viewport={{ once: true, margin: '-40px' }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {[
            { icon: MessageSquare, title: 'Conversational Voice AI', description: 'Speak naturally. The AI understands context, interrupts politely, and asks relevant follow-up questions.', accent: true },
            { icon: Code, title: 'Live Code Execution', description: 'Write code in a robust Monaco editor. Discuss tradeoffs while the AI evaluates your logic.' },
            { icon: BarChart3, title: 'Deep Analytics', description: 'Get scored across 10 distinct metrics including technical depth, problem-solving speed, and communication clarity.' },
            { icon: BookOpen, title: 'Tailored roadmaps', description: 'Discover precisely which topics to study based on your weaknesses identified during the mock interviews.' },
            { icon: FileText, title: 'Resume-Aware Context', description: 'Upload your PDF resume. The AI will personalize behavioral and technical questions based on your background.' },
            { icon: Shield, title: 'Organization Proctoring', description: 'For B2B: Enforce fullscreen, camera, and mic rules to ensure candidate authenticity during screening.' },
          ].map(f => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </motion.div>
      </section>

      {/* ── Why Us ───────────────────────────────────────────────── */}
      <section id="why-us" className="px-4 py-16 bg-zinc-50 dark:bg-zinc-900/30 border-y border-zinc-100 dark:border-zinc-900 mb-16 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div variants={fadeUp} initial="initial" whileInView="whileInView" className="order-2 md:order-1 relative group w-full perspective-1000">
              <div className="absolute inset-0 bg-teal-500/10 blur-[80px] rounded-full group-hover:scale-110 transition-transform duration-700" />
              
              <div className="relative z-10 w-full bg-white dark:bg-[#0c0c0e] rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] p-6 md:p-8 flex flex-col gap-6 rotate-y-[4deg] group-hover:rotate-y-0 group-hover:-translate-y-1 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]">
                {/* Top Header */}
                <div className="flex justify-between items-center pb-5 border-b border-zinc-100 dark:border-zinc-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
                      <Target className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                       <div className="h-2 w-24 bg-zinc-200 dark:bg-zinc-700 rounded-full mb-2" />
                       <div className="h-1.5 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50" style={{ fontFamily: 'Poppins, sans-serif' }}>8.4</div>
                    <div className="text-[10px] uppercase tracking-widest text-teal-500 font-bold mt-0.5">Top 12%</div>
                  </div>
                </div>
                
                {/* Body / Feedback Metrics */}
                <div className="space-y-5">
                  <div className="group/metric">
                     <div className="flex justify-between text-xs font-semibold mb-2 text-zinc-600 dark:text-zinc-400">
                       <span>System Design</span>
                       <span>9.0</span>
                     </div>
                     <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800/50 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} whileInView={{ width: '90%' }} transition={{ duration: 1.2, delay: 0.1, ease: "easeOut" }} className="h-full bg-[#14b8a6] rounded-full group-hover/metric:brightness-110 transition-all" />
                     </div>
                  </div>
                  <div className="group/metric">
                     <div className="flex justify-between text-xs font-semibold mb-2 text-zinc-600 dark:text-zinc-400">
                       <span>Communication</span>
                       <span>8.5</span>
                     </div>
                     <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800/50 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} whileInView={{ width: '85%' }} transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }} className="h-full bg-blue-500 rounded-full group-hover/metric:brightness-110 transition-all" />
                     </div>
                  </div>
                  <div className="group/metric">
                     <div className="flex justify-between text-xs font-semibold mb-2 text-zinc-600 dark:text-zinc-400">
                       <span>Code Quality</span>
                       <span>6.0</span>
                     </div>
                     <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800/50 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} whileInView={{ width: '60%' }} transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }} className="h-full bg-amber-500 rounded-full group-hover/metric:brightness-110 transition-all" />
                     </div>
                  </div>
                </div>

                {/* AI Suggestion Box */}
                <div className="mt-2 bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800/80 rounded-xl p-5 flex gap-4 items-start shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/10 flex justify-center items-center shrink-0">
                    <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 space-y-2.5 pt-1.5">
                    <div className="h-1.5 w-[95%] bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                    <div className="h-1.5 w-[75%] bg-zinc-200 dark:bg-zinc-700/60 rounded-full" />
                    <div className="h-1.5 w-[40%] bg-zinc-200 dark:bg-zinc-700/60 rounded-full" />
                  </div>
                </div>
              </div>
            </motion.div>
            <motion.div variants={fadeUp} initial="initial" whileInView="whileInView" className="order-1 md:order-2">
              <h2 className="text-3xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-6" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Bridging the gap between knowing to code, and knowing to interview.
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 text-lg mb-6 leading-relaxed">
                Most developers fail interviews not because they can't code, but because they can't communicate their thought process effectively under pressure.
              </p>
              <ul className="space-y-3">
                {['Speak your thoughts aloud with live STT', 'Simulate edge-case curveballs', 'Track your improvement over time'].map(t => (
                  <li key={t} className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300 font-medium">
                    <CheckCircle className="w-5 h-5 text-blue-500 shrink-0" /> {t}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section id="how-it-works" className="px-4 sm:px-6 max-w-4xl mx-auto mb-16 pt-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-500 uppercase tracking-wider mb-3">Workflow</p>
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-zinc-50" style={{ fontFamily: 'Poppins, sans-serif' }}>
            From signup to offer letter
          </h2>
        </div>
        <div className="flex flex-col gap-0 max-w-2xl mx-auto">
          {[
            { n: '01', title: 'Create your session', desc: 'Pick your target role, tech stack, difficulty, and type of round.' },
            { n: '02', title: 'Start talking & coding', desc: 'Interact entirely via voice. Share your screen or use the built-in code editor while you explain your approach.' },
            { n: '03', title: 'Review your score', desc: 'Instantly download a 9-page PDF report with line-by-line feedback, AI evaluations, and your full transcript.' },
          ].map(({ n, title, desc }, i) => (
            <motion.div key={n} variants={fadeUp} initial="initial" whileInView="whileInView" className="flex gap-6 group">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex items-center justify-center text-sm font-bold font-mono text-zinc-500 group-hover:border-blue-500 group-hover:text-blue-600 transition-colors">
                  {n}
                </div>
                {i < 2 && <div className="w-px flex-1 bg-zinc-200 dark:bg-zinc-800 mt-4 mb-4" />}
              </div>
              <div className={`pt-1 pb-12`}>
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>{title}</h3>
                <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────── */}
      <section id="pricing" className="px-4 sm:px-6 max-w-5xl mx-auto mb-16 pt-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-500 uppercase tracking-wider mb-3">Pricing</p>
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-zinc-50" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Simple, transparent pricing
          </h2>
        </div>
        <motion.div variants={stagger} initial="initial" whileInView="animate" viewport={{ once: true }} className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <PriceCard
            name="Starter"
            price="Free"
            cta="Start for free"
            to={user ? "/dashboard" : "/register"}
            features={['3 mock interviews included', 'Basic feedback report', 'Standard question bank', 'Voice interview basics']}
          />
          <PriceCard
            name="Pro"
            price="₹499"
            cta="Upgrade to Pro"
            primary
            to={user ? undefined : "/register"}
            onCtaClick={user ? () => setShowUpgradeModal(true) : undefined}
            features={['Unlimited mock interviews', '9-page Deep Analytics PDF', 'Resume-aware AI questions', 'Live code editor & system design integration']}
          />
        </motion.div>
      </section>

      {/* Upgrade Modal */}
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />

      {/* ── Contact Us ───────────────────────────────────────────── */}
      <section className="px-4 py-16 bg-zinc-50 dark:bg-zinc-900/30 border-t border-zinc-100 dark:border-zinc-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>Have questions? Let's talk.</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-8">Whether you are an individual preparing for a transition, or a company looking to streamline screening, we're here to help.</p>
          <form onSubmit={handleContactSubmit} className="max-w-md mx-auto flex flex-col gap-3">
            <input 
              type="email" 
              placeholder="Your email address" 
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-zinc-100" 
            />
            <textarea 
              placeholder="How can we help?" 
              rows={3} 
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-zinc-100" 
            />
            <button 
              type="submit" 
              disabled={sendingContact}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium hover:bg-zinc-800 dark:hover:bg-white transition-colors disabled:opacity-70"
            >
              <Send className="w-4 h-4" /> {sendingContact ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-200 dark:border-zinc-900 px-4 sm:px-6 py-12 bg-white dark:bg-zinc-950">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Mic className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100" style={{ fontFamily: 'Poppins, sans-serif' }}>IntervuSetu</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm text-zinc-500 dark:text-zinc-400">
            {[['Privacy', '#'], ['Terms', '#'], ['For Organizations', '/org/login'], ['Changelog', '#']].map(([label, href]) => (
              <Link key={label} to={href} className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">{label}</Link>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-sm text-zinc-400">
            Made with <Heart className="w-4 h-4 text-rose-500" /> in India
          </div>
        </div>
      </footer>
    </div>
  )
}
