export interface Example { prompt: string; steps: string[]; answer: string; figure?: Figure }
export interface Topic { id: string; title: string; ccss?: string; lesson: string; examples: Example[]; v2?: boolean; learn?: Learn; guided?: Guided[] }
export interface Visual { kind: string; [k: string]: unknown }
export interface Learn { sections: { text: string; visual?: Visual }[]; keyIdea: string }
export interface WatchStep { do: string; why: string; rule?: string; visual?: Visual }
export interface WatchExample { title: string; prompt: string; visual?: Visual; steps: WatchStep[]; check: string; mistake?: string; answer: string }
export interface StepInput { type: 'number' | 'choice' | 'fraction'; answer: string | number; choices?: string[]; tolerance?: number; simplest?: boolean }
export interface GuidedStep { do: string; why: string; input: StepInput; hint: string; worked: string }
export interface Guided { prompt: string; visual?: Visual; steps: GuidedStep[]; answer: string | number }
export interface Question {
  id: string; topicId: string; type: 'mc' | 'numeric'; prompt: string
  choices?: string[]; answer: number | string; tolerance?: number; explanation?: string; difficulty?: number; figure?: Figure
}
export interface Subject { id: string; title: string; masteryThreshold: number; topics: Topic[]; questions: Question[] }
export interface Figure {
  kind: string; unit?: string; fmt?: 'frac'; unknown?: string | string[]
  base?: number; height?: number; right?: boolean; obtuse?: boolean
  l?: number; w?: number; h?: number; cubes?: number; area?: number
  side?: number; top?: number; bottom?: number; apothem?: number
  W?: number; H?: number; cutW?: number; cutH?: number; roofBase?: number; roofHeight?: number
  a?: number; b?: number; c?: number; length?: number; s?: number; slant?: number
  points?: number[][]; closed?: boolean
}
