export const VISUAL_KINDS: string[]
export function isV2Topic(t: unknown): boolean
export interface Frac { n: number; d: number; value: number; plain?: boolean; mixed?: boolean }
export function parseFraction(raw: unknown): Frac | null
export function gradeInput(input: unknown, response: string | number): { correct: boolean; nudge?: string }
export function fmtFrac(f: Frac): string
export function validateV2Topic(t: unknown, idx?: number): { errors: string[]; warnings: string[] }
