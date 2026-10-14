export interface Example { prompt: string; steps: string[]; answer: string }
export interface Topic { id: string; title: string; ccss?: string; lesson: string; examples: Example[] }
export interface Question {
  id: string; topicId: string; type: 'mc' | 'numeric'; prompt: string
  choices?: string[]; answer: number | string; tolerance?: number; explanation?: string; difficulty?: number
}
export interface Subject { id: string; title: string; masteryThreshold: number; topics: Topic[]; questions: Question[] }
