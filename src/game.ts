import type { Question, Subject } from './types'
import { SUBJECTS } from './content'

export interface TopicStat { attempts: number; correct: number }
export interface Progress {
  version: 1
  xp: number
  topics: Record<string, TopicStat> // key: subjectId/topicId
  seen: Record<string, number>
  badges: Record<string, string> // id -> ISO date earned
  streak: { count: number; best: number; last: string | null }
  quizzes: number
  perfectQuizzes: number
  tests: number
  totalCorrect: number
}
const KEY = 'mathquest.progress.v1'
export const blank = (): Progress => ({ version: 1, xp: 0, topics: {}, seen: {}, badges: {}, streak: { count: 0, best: 0, last: null }, quizzes: 0, perfectQuizzes: 0, tests: 0, totalCorrect: 0 })

export let P: Progress = load()
function load(): Progress {
  try { const r = localStorage.getItem(KEY); if (r) return sanitize(JSON.parse(r)) } catch (e) { console.warn('progress load failed', e) }
  return blank()
}
export function sanitize(x: unknown): Progress {
  const b = blank()
  if (!x || typeof x !== 'object') throw new Error('Not a MathQuest progress file')
  const o = x as Partial<Progress>
  if (typeof o.xp !== 'number' || typeof o.topics !== 'object') throw new Error('Not a MathQuest progress file')
  return { ...b, ...o, streak: { ...b.streak, ...(o.streak || {}) }, version: 1 }
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(P)) } catch (e) { console.warn(e) } }
export function replace(p: Progress) { P = p; save() }

// ---- Levels ----
export const LEVELS = [0, 50, 120, 220, 350, 520, 730, 1000, 1320, 1700, 2150, 2700, 3350, 4100, 5000, 6000, 7200, 8600, 10200, 12000]
export function levelInfo(xp = P.xp) {
  let lvl = 1
  while (lvl < LEVELS.length && xp >= LEVELS[lvl]) lvl++
  const floor = LEVELS[lvl - 1]
  const next = lvl < LEVELS.length ? LEVELS[lvl] : floor + 2000 * (lvl - LEVELS.length + 1)
  if (lvl >= LEVELS.length) { const extra = Math.floor((xp - floor) / 2000); return { level: lvl + extra, floor: floor + extra * 2000, next: floor + (extra + 1) * 2000 } }
  return { level: lvl, floor, next }
}
export const xpFor = (q: Question) => 10 * Math.min(3, Math.max(1, q.difficulty ?? 1))

// ---- Streak ----
const day = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export function currentStreak(): number {
  if (!P.streak.last) return 0
  const y = new Date(); y.setDate(y.getDate() - 1)
  return P.streak.last === day() || P.streak.last === day(y) ? P.streak.count : 0
}
function touchStreak() {
  const today = day()
  if (P.streak.last === today) return
  const y = new Date(); y.setDate(y.getDate() - 1)
  P.streak.count = P.streak.last === day(y) ? P.streak.count + 1 : 1
  P.streak.last = today
  P.streak.best = Math.max(P.streak.best, P.streak.count)
}

// ---- Mastery ----
export const tkey = (s: string, t: string) => `${s}/${t}`
export function topicStat(s: string, t: string): TopicStat { return P.topics[tkey(s, t)] ?? { attempts: 0, correct: 0 } }
export function topicPct(s: string, t: string) { const st = topicStat(s, t); return st.attempts ? st.correct / st.attempts : 0 }
export function topicMastered(sub: Subject, t: string) { const st = topicStat(sub.id, t); return st.attempts >= 10 && st.correct / st.attempts >= sub.masteryThreshold }
export function subjectPct(sub: Subject) { return sub.topics.length ? sub.topics.reduce((a, t) => a + Math.min(1, topicPct(sub.id, t.id)), 0) / sub.topics.length : 0 }
export function subjectMastered(sub: Subject) { return sub.topics.length > 0 && sub.topics.every((t) => topicMastered(sub, t.id)) }

// ---- Badges ----
export interface Badge { id: string; name: string; desc: string; icon: string }
export function allBadges(): Badge[] {
  const b: Badge[] = [
    { id: 'first-answer', name: 'First Step', desc: 'Answer your first question correctly', icon: '👣' },
    { id: 'first-quiz', name: 'Quiz Rookie', desc: 'Finish your first quiz', icon: '📝' },
    { id: 'quiz-10', name: 'Quiz Pro', desc: 'Finish 10 quizzes', icon: '🎓' },
    { id: 'perfect-quiz', name: 'Flawless', desc: 'Get 100% on a quiz', icon: '💎' },
    { id: 'first-test', name: 'Test Taker', desc: 'Finish a 25-question Test', icon: '🏁' },
    { id: 'correct-100', name: 'Century', desc: '100 correct answers', icon: '💯' },
    { id: 'correct-500', name: 'Math Machine', desc: '500 correct answers', icon: '⚙️' },
    ...[100, 500, 1000, 2500, 5000].map((n) => ({ id: `xp-${n}`, name: `${n} XP`, desc: `Earn ${n} XP`, icon: '⭐' })),
    ...[3, 7, 14, 30].map((n) => ({ id: `streak-${n}`, name: `${n}-Day Streak`, desc: `Practice ${n} days in a row`, icon: '🔥' })),
    ...[5, 10].map((n) => ({ id: `level-${n}`, name: `Level ${n}`, desc: `Reach level ${n}`, icon: '🚀' })),
    { id: 'first-topic', name: 'Topic Master', desc: 'Master any topic', icon: '🏅' },
    { id: 'explorer', name: 'Explorer', desc: 'Answer a question in every world', icon: '🗺️' },
  ]
  for (const s of SUBJECTS) b.push({ id: `subject-${s.id}`, name: `${s.title} Master`, desc: `Master every topic in ${s.title}`, icon: '👑' })
  return b
}
export function checkBadges(): Badge[] {
  const earned: Badge[] = []
  const lvl = levelInfo().level
  const has = (id: string, cond: boolean) => { if (cond && !P.badges[id]) { P.badges[id] = new Date().toISOString(); const bd = allBadges().find((x) => x.id === id); if (bd) earned.push(bd) } }
  has('first-answer', P.totalCorrect >= 1)
  has('first-quiz', P.quizzes >= 1)
  has('quiz-10', P.quizzes >= 10)
  has('perfect-quiz', P.perfectQuizzes >= 1)
  has('first-test', P.tests >= 1)
  has('correct-100', P.totalCorrect >= 100)
  has('correct-500', P.totalCorrect >= 500)
  for (const n of [100, 500, 1000, 2500, 5000]) has(`xp-${n}`, P.xp >= n)
  for (const n of [3, 7, 14, 30]) has(`streak-${n}`, P.streak.best >= n)
  for (const n of [5, 10]) has(`level-${n}`, lvl >= n)
  has('first-topic', SUBJECTS.some((s) => s.topics.some((t) => topicMastered(s, t.id))))
  has('explorer', SUBJECTS.every((s) => s.topics.some((t) => topicStat(s.id, t.id).attempts > 0)))
  for (const s of SUBJECTS) has(`subject-${s.id}`, subjectMastered(s))
  return earned
}

export interface AnswerResult { xp: number; levelUp: number | null; badges: Badge[] }
export function recordAnswer(sub: Subject, q: Question, correct: boolean): AnswerResult {
  const before = levelInfo().level
  const k = tkey(sub.id, q.topicId)
  const st = P.topics[k] ?? { attempts: 0, correct: 0 }
  st.attempts++; if (correct) st.correct++
  P.topics[k] = st
  P.seen[`${sub.id}/${q.id}`] = (P.seen[`${sub.id}/${q.id}`] ?? 0) + 1
  const xp = correct ? xpFor(q) : 0
  P.xp += xp
  if (correct) P.totalCorrect++
  touchStreak()
  const after = levelInfo().level
  const badges = checkBadges()
  save()
  return { xp, levelUp: after > before ? after : null, badges }
}
export function recordRun(kind: 'quiz' | 'test' | 'practice', correct: number, total: number): Badge[] {
  if (kind === 'quiz') { P.quizzes++; if (correct === total && total > 0) P.perfectQuizzes++ }
  if (kind === 'test') { P.tests++; if (correct === total && total > 0) P.perfectQuizzes++ }
  const b = checkBadges(); save(); return b
}

/** Random pick, preferring less-seen questions. */
export function pick(sub: Subject, qs: Question[], n: number): Question[] {
  return qs.map((q) => ({ q, r: (P.seen[`${sub.id}/${q.id}`] ?? 0) + Math.random() * 1.5 }))
    .sort((a, b) => a.r - b.r).slice(0, n).map((x) => x.q).sort(() => Math.random() - 0.5)
}
