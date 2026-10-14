// v2 topic flow: Learn → Watch → Guided → Practice (pilot: Number System).
import type { Subject, Topic, WatchExample, Guided, StepInput, Visual } from './types'
import { renderMarkdown, esc } from './markdown'
import { renderVisual } from './visuals'
import { gradeInput, parseFraction } from './v2check.js'
import { icon } from './icons'
import { meta } from './content'
import * as G from './game'

export interface Deps {
  app: HTMLElement
  header: (title: string, back: string | null, color?: string) => string
  announceResult: (r: { levelUp: number | null; badges: G.Badge[] }) => void
}
type Tab = 'learn' | 'watch' | 'guided'
const vis = (v?: Visual) => renderVisual(v)
const md = (s: string) => renderMarkdown(String(s ?? ''))

// in-memory per-visit position (resets when switching topic)
let pos = { key: '', learn: 0, ex: 0, step: 0, gi: 0 }
function posFor(key: string) { if (pos.key !== key) pos = { key, learn: 0, ex: 0, step: 0, gi: 0 }; return pos }

export function topicV2(d: Deps, s: Subject, t: Topic, tab: Tab) {
  const m = meta(s.id)
  const st = G.v2State(s.id, t.id)
  const base = `/s/${s.id}/t/${t.id}`
  const tabs: [string, string, boolean, string][] = [
    ['learn', 'Learn', !!st.learned, `#${base}/learn`],
    ['watch', 'Watch', !!st.watched, `#${base}/watch`],
    ['guided', 'Guided', st.guidedDone > 0, `#${base}/guided`],
    ['practice', 'Practice', G.topicStat(s.id, t.id).attempts > 0, `#/run/practice/${s.id}/${t.id}`],
  ]
  const stepper = `<nav class="stepper" aria-label="Lesson steps">${tabs.map(([id, label, done, href], i) =>
    `<a class="st ${id === tab ? 'on' : ''} ${done ? 'done' : ''}" href="${href}" ${id === tab ? 'aria-current="step"' : ''}><span class="st-n">${done ? '✓' : i + 1}</span>${label}</a>`).join('')}</nav>`
  d.app.innerHTML = d.header(t.title, `/s/${s.id}`, m.color) + `<main class="v2" style="--accent:${m.color};--soft:${m.soft}">${stepper}<section id="v2body"></section></main>`
  const body = d.app.querySelector<HTMLElement>('#v2body')!
  const p = posFor(`${s.id}/${t.id}`)
  if (tab === 'learn') learn(d, s, t, body, p)
  else if (tab === 'watch') watch(d, s, t, body, p)
  else guided(d, s, t, body, p)
}

// ---------------- Learn ----------------
function learn(d: Deps, s: Subject, t: Topic, body: HTMLElement, p: typeof pos) {
  const L = t.learn
  if (!L) { body.innerHTML = `<article class="card">No Learn section yet for this topic.</article>`; return }
  const n = L.sections.length
  const draw = () => {
    const i = p.learn
    const dots = `<div class="dots">${Array.from({ length: n + 1 }, (_, k) => `<span class="${k === i ? 'on' : k < i ? 'past' : ''}"></span>`).join('')}</div>`
    if (i < n) {
      const sec = L.sections[i]
      body.innerHTML = `${dots}<article class="card lesson learn-card">${md(sec.text)}${vis(sec.visual)}</article>
        <div class="nav-row">${i > 0 ? '<button class="btn back">Back</button>' : '<span></span>'}<button class="big-btn next">Next</button></div>`
    } else {
      const r = G.markLearned(s.id, t.id); d.announceResult(r)
      body.innerHTML = `${dots}<article class="card key-idea"><div class="ki-label">${icon('bulb', 22)} Key idea</div><div class="ki-text">${md(L.keyIdea)}</div></article>
        <div class="nav-row"><button class="btn back">Back</button><a class="big-btn" href="#/s/${s.id}/t/${t.id}/watch">Next: Watch an example</a></div>`
    }
    body.querySelector<HTMLButtonElement>('.next')?.addEventListener('click', () => { p.learn++; draw(); window.scrollTo(0, 0) })
    body.querySelector<HTMLButtonElement>('.back')?.addEventListener('click', () => { p.learn = Math.max(0, p.learn - 1); draw() })
  }
  draw()
}

// ---------------- Watch ----------------
function watch(d: Deps, s: Subject, t: Topic, body: HTMLElement, p: typeof pos) {
  const exs = (t.examples as unknown as WatchExample[]).filter((e) => e && Array.isArray(e.steps))
  if (!exs.length) { body.innerHTML = `<article class="card">No worked examples yet.</article>`; return }
  const draw = () => {
    const e = exs[Math.min(p.ex, exs.length - 1)]
    const shown = p.step, done = shown >= e.steps.length
    const pick = `<div class="ex-pick">${exs.map((_, k) => `<button class="chip-btn ${k === p.ex ? 'on' : ''}" data-k="${k}">Example ${k + 1}</button>`).join('')}</div>`
    body.innerHTML = `${pick}<article class="card watch-card">
      <div class="ex-title">${esc(e.title)}</div>
      <div class="q-prompt">${esc(e.prompt)}</div>${vis(e.visual)}
      <ol class="wsteps">${e.steps.slice(0, shown).map((st, k) => `<li class="wstep ${k === shown - 1 ? 'fresh' : ''}">
        <div class="w-do">${esc(st.do)}</div><div class="w-why">${esc(st.why)}</div>${st.rule ? `<span class="rule-chip">${esc(st.rule)}</span>` : ''}${vis(st.visual)}</li>`).join('')}</ol>
      ${done ? `<div class="answer-line">Answer: <b>${esc(e.answer)}</b></div>
        <div class="callout check"><b>✔ Check:</b> ${esc(e.check)}</div>
        ${e.mistake ? `<div class="callout mistake"><b>⚠️ Common mistake:</b> ${esc(e.mistake)}</div>` : ''}` : ''}
    </article>
    <div class="nav-row"><span class="muted">${done ? 'Example complete' : `Step ${shown} of ${e.steps.length}`}</span>
      ${!done ? `<button class="big-btn next">${shown === 0 ? 'Show first step' : 'Next step'}</button>`
        : p.ex < exs.length - 1 ? '<button class="big-btn next-ex">Next example</button>'
        : `<a class="big-btn" href="#/s/${s.id}/t/${t.id}/guided">Try it yourself →</a>`}</div>`
    if (done && p.ex === exs.length - 1) d.announceResult(G.markWatched(s.id, t.id))
    body.querySelector('.next')?.addEventListener('click', () => { p.step++; draw(); body.querySelector('.wstep.fresh, .callout.check')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) })
    body.querySelector('.next-ex')?.addEventListener('click', () => { p.ex++; p.step = 0; draw(); window.scrollTo(0, 0) })
    body.querySelectorAll<HTMLButtonElement>('.chip-btn').forEach((b) => b.addEventListener('click', () => { p.ex = Number(b.dataset.k); p.step = 0; draw() }))
  }
  draw()
}

// ---------------- Guided ----------------
/** Step used in final-answer-only mode: the one whose answer equals the problem answer, else the last. */
function finalStep(pr: Guided) {
  const want = parseFraction(pr.answer)
  const hit = want ? [...pr.steps].reverse().find((s) => s.input.type !== 'choice' && Math.abs((parseFraction(s.input.answer)?.value ?? NaN) - want.value) < 1e-9) : undefined
  return hit ?? pr.steps[pr.steps.length - 1]
}
interface GState { si: number; tries: number; hinted: boolean; worked: boolean; clean: boolean; neededWorked: boolean; log: { answer: string; ok: boolean; worked: boolean }[]; locked: boolean }
function guided(d: Deps, s: Subject, t: Topic, body: HTMLElement, p: typeof pos) {
  const probs = (t.guided ?? []) as Guided[]
  if (!probs.length) { body.innerHTML = `<article class="card">No guided problems yet.</article>`; return }
  let g: GState = fresh()
  function fresh(): GState { return { si: 0, tries: 0, hinted: false, worked: false, clean: true, neededWorked: false, log: [], locked: false } }
  const LEVELS = ['Full support', 'Some support', 'On your own']

  const draw = (flash?: string) => {
    if (p.gi >= probs.length) return finish()
    const st = G.v2State(s.id, t.id)
    const level = st.level
    const pr = probs[p.gi]
    const finalOnly = level === 2
    const target = finalStep(pr)
    const steps = finalOnly ? [{ ...target, do: 'Final answer', why: '', hint: pr.steps.map((x) => x.hint).filter(Boolean).slice(-1)[0] ?? '', worked: pr.steps.map((x) => x.worked).join(' ') }] : pr.steps
    const cur = steps[g.si]
    const done = g.si >= steps.length
    const levelSel = `<div class="lvl-row"><span class="muted small">Support:</span>${LEVELS.map((l, k) => `<button class="chip-btn lvl ${k === level ? 'on' : ''}" data-l="${k}">${l}</button>`).join('')}</div>`
    const past = steps.slice(0, g.si).map((x, k) => `<li class="gstep past ${g.log[k]?.ok ? 'ok' : 'shown'}"><div class="w-do">${esc(x.do)}</div>
      <div class="g-ans">${g.log[k]?.ok ? `✓ ${esc(g.log[k].answer)}` : `Worked: ${esc(x.worked)}`}</div></li>`).join('')
    const curHtml = done ? '' : `<li class="gstep current"><div class="w-do">${esc(cur.do)}</div>
      ${level === 0 && cur.why ? `<div class="w-why">${esc(cur.why)}</div>` : ''}
      ${level === 1 && cur.why ? `<details class="why-btn"><summary>Why?</summary><div class="w-why">${esc(cur.why)}</div></details>` : ''}
      ${inputHtml(cur.input, g.locked)}
      <div class="g-fb" aria-live="polite">${flash ?? ''}</div></li>`
    body.innerHTML = `${levelSel}<div class="progress-row"><span>Problem ${p.gi + 1} of ${probs.length}</span><span>${finalOnly ? 'Final answer only' : `Step ${Math.min(g.si + 1, steps.length)} of ${steps.length}`}</span></div>
      <article class="card guided-card"><div class="q-prompt">${esc(pr.prompt)}</div>${vis(pr.visual)}
      <ol class="gsteps">${past}${curHtml}</ol>
      ${done ? `${flash ?? ''}<div class="answer-line">Answer: <b>${esc(String(pr.answer))}</b></div>` : ''}</article>
      <div class="nav-row"><span></span>${done ? `<button class="big-btn next-prob">${p.gi < probs.length - 1 ? 'Next problem' : 'Finish'}</button>` : g.locked ? '<button class="big-btn cont">Continue</button>' : ''}</div>`
    wire(cur?.input, steps, finalOnly)
    body.querySelectorAll<HTMLButtonElement>('.lvl').forEach((b) => b.addEventListener('click', () => { G.setLevel(s.id, t.id, Number(b.dataset.l) as 0 | 1 | 2); g = fresh(); draw() }))
    body.querySelector('.next-prob')?.addEventListener('click', () => {
      const r = G.finishGuidedProblem(s.id, t.id, g.clean, g.neededWorked)
      d.announceResult(r)
      const msg = r.changed === 1 ? `Great work — moving to “${LEVELS[r.level]}”.` : r.changed === -1 ? `Let's add a bit more support (“${LEVELS[r.level]}”).` : ''
      p.gi++; g = fresh(); draw(msg ? `<div class="fb ok">${msg}</div>` : undefined); window.scrollTo(0, 0)
    })
    body.querySelector('.cont')?.addEventListener('click', () => { g.si++; g.tries = 0; g.hinted = false; g.locked = false; draw() })
    if (!done && !g.locked) setTimeout(() => body.querySelector<HTMLInputElement>('.g-input')?.focus(), 30)
  }

  function inputHtml(inp: StepInput, locked: boolean) {
    if (locked) return ''
    if (inp.type === 'choice') return `<div class="choices g-choices">${(inp.choices ?? []).map((c, i) => `<button class="choice" data-i="${i}"><span class="letter">${'ABCDEFGH'[i]}</span>${esc(c)}</button>`).join('')}</div>`
    const keys = inp.type === 'fraction' ? ['/', '−'] : ['−', '.']
    return `<form class="num-form g-form" autocomplete="off"><input class="num g-input" type="text" inputmode="decimal" enterkeyhint="done" placeholder="${inp.type === 'fraction' ? 'e.g. 5/2' : 'Your answer'}" aria-label="Answer" autocapitalize="off" spellcheck="false" />
      <div class="keys">${keys.map((k) => `<button type="button" class="key" data-k="${k}">${k}</button>`).join('')}</div><button class="btn primary" type="submit">Check</button></form>`
  }

  function wire(inp: StepInput | undefined, steps: typeof probs[number]['steps'], finalOnly: boolean) {
    if (!inp) return
    const submit = (resp: string | number, shown: string) => {
      const res = gradeInput(inp, resp)
      const step = steps[g.si]
      if (res.correct) {
        const r = G.recordGuidedStep(s.id, t.id, g.hinted, finalOnly)
        g.log[g.si] = { answer: shown, ok: true, worked: false }
        if (g.hinted) g.clean = false
        d.announceResult(r)
        g.si++; g.tries = 0; g.hinted = false
        draw(`<div class="fb ok">✅ Correct! +${r.xp} XP${res.nudge ? ` <span class="nudge">${esc(res.nudge)}</span>` : ''}</div>`)
        return
      }
      g.tries++; g.clean = false
      if (res.nudge) { g.tries--; return flashFb(`<div class="fb hint">${esc(res.nudge)}</div>`) }
      if (g.tries === 1) { g.hinted = true; return flashFb(`<div class="fb hint">💡 <b>Hint:</b> ${esc(step.hint)}</div>`) }
      g.neededWorked = true; g.locked = true
      g.log[g.si] = { answer: shown, ok: false, worked: true }
      draw(`<div class="fb worked"><b>Here's how:</b> ${esc(step.worked)}</div>`)
    }
    const flashFb = (h: string) => { const fb = body.querySelector<HTMLElement>('.g-fb'); if (fb) fb.innerHTML = h; const i = body.querySelector<HTMLInputElement>('.g-input'); if (i) { i.select(); i.classList.add('wrong'); setTimeout(() => i.classList.remove('wrong'), 600) } }
    body.querySelectorAll<HTMLButtonElement>('.g-choices .choice').forEach((b) => b.addEventListener('click', () => submit(Number(b.dataset.i), b.textContent?.slice(1) ?? '')))
    const form = body.querySelector<HTMLFormElement>('.g-form')
    if (form) {
      const i = form.querySelector<HTMLInputElement>('.g-input')!
      form.querySelectorAll<HTMLButtonElement>('.key').forEach((k) => k.addEventListener('click', () => {
        const ch = k.dataset.k === '−' ? '-' : k.dataset.k!
        if (ch === '-') i.value = i.value.startsWith('-') ? i.value.slice(1) : '-' + i.value; else i.value += ch
        i.focus()
      }))
      form.addEventListener('submit', (e) => { e.preventDefault(); if (i.value.trim()) submit(i.value, i.value.trim()) })
    }
  }

  function finish() {
    const st = G.v2State(s.id, t.id)
    body.innerHTML = `<article class="card summary"><div class="big-score">🎉</div><div class="summary-msg">Guided practice complete!</div>
      <div class="muted">Support level now: <b>${LEVELS[st.level]}</b> · ${st.guidedClean} of ${st.guidedDone} problems solved without help</div></article>
      <div class="row2"><button class="big-btn again">Do them again</button><a class="big-btn alt" href="#/run/practice/${s.id}/${t.id}">Practice (5 questions)</a></div>`
    body.querySelector('.again')?.addEventListener('click', () => { p.gi = 0; g = fresh(); draw() })
  }
  draw()
}
