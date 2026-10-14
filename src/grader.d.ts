import type { Question, Subject } from './types'
export function parseNumber(raw: unknown): number
export function grade(q: Question, response: string | number): boolean
export function validateQuestion(q: unknown, topicIds: Set<string>): string | null
export function validateSubject(raw: unknown): { subject: Subject | null; warnings: string[] }
