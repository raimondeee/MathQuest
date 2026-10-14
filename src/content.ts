import type { Subject } from './types'
import { validateSubject } from './grader.js'
import geometry from './content/geometry.json'
import statistics from './content/statistics.json'
import expressions from './content/expressions.json'
import numberSystem from './content/number-system.json'
import ratios from './content/ratios.json'

export interface SubjectMeta { color: string; soft: string; focus: boolean; icon: string }
export const META: Record<string, SubjectMeta> = {
  geometry: { color: '#7c5cd6', soft: '#efeafd', focus: true, icon: 'shape' },
  statistics: { color: '#1f9d8b', soft: '#e3f6f2', focus: true, icon: 'chart' },
  expressions: { color: '#e0803a', soft: '#fdefe3', focus: false, icon: 'x' },
  'number-system': { color: '#3a7fd8', soft: '#e5effc', focus: false, icon: 'num' },
  ratios: { color: '#d9527a', soft: '#fce8ee', focus: false, icon: 'ratio' },
}
const FALLBACK: SubjectMeta = { color: '#557', soft: '#eef', focus: false, icon: 'num' }
export const meta = (id: string) => META[id] ?? FALLBACK

export const SUBJECTS: Subject[] = []
for (const raw of [geometry, statistics, expressions, numberSystem, ratios] as unknown[]) {
  const { subject, warnings } = validateSubject(raw)
  warnings.forEach((w) => console.warn(`[content] ${(raw as { id?: string })?.id ?? '?'}: ${w}`))
  if (subject) SUBJECTS.push(subject)
}
export const subjectById = (id: string) => SUBJECTS.find((s) => s.id === id)
