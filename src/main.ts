import './style.css'
import type { Question, Subject } from './types'
import { SUBJECTS, subjectById, meta } from './content'
import { grade } from './grader.js'
import { renderMarkdown, esc } from './markdown'
import { icon } from './icons'
import { renderFigure } from './figures'
import * as G from './game'

const app = document.getElementById('app')!
const fx = document.createElement('div'); fx.className = 'fx'; document.body.appendChild(fx)

// ---------- celebration ----------
function celebrate(title: string, sub: string) {
  const colors = ['#7c5cd6', '#1f9d8b', '#e0803a', '#3a7fd8', '#d9527a', '#f2c94c']
  const bits = Array.from({ length: 28 }, (_, i) => `<i style="--x:${Math.round(Math.random() * 100)}vw;--d:${(Math.random() * 0.6).toFixed(2)}s;--r:${Math.round(Math.random() * 360)}deg;background:${colors[i % colors.length]}"></i>`).join('')
  const el = document.createElement('div')
  el.className = 'celebrate'
  el.innerHTML = `${bits}<div class="toast"><div class="toast-t">${esc(title)}</div><div class="toast-s">${esc(sub)}</div></div>`
  fx.appendChild(el)
  setTimeout(() => el.remove(), 2800)
}
const queue: [string, string][] = []
let showing = false
function announce(t: string, s: string) { queue.push([t, s]); if (!showing) next() }
function next() { const n = queue.shift(); if (!n) { showing = false; return } showing = true; celebrate(n[0], n[1]); setTimeout(next, 2900) }
function announceResult(r: { levelUp: number | null; badges: G.Badge[] }) {
  if (r.levelUp) announce(`Level ${r.levelUp}!`, 'You leveled up — nice work!')
  r.badges.forEach((b) => announce(`${b.icon} ${b.name}`, b.desc))
}

// ---------- shared bits ----------
function header(title: string, back: string | null, color?: string) {
  return `<header class="bar" ${color ? `style="--accent:${color}"` : ''}>
    ${back !== null ? `<a class="btn-icon" href="#${back}" aria-label="Back">${icon('back')}</a>` : '<span class="logo">🧭</span>'}
    <h1>${esc(title)}</h1>
    <a class="btn-icon" href="#/settings" aria-label="Settings">${icon('gear')}</a></header>`
}
function statsStrip() {
  const L = G.levelInfo()
  const pct = Math.min(100, ((G.P.xp - L.floor) / (L.next - L.floor)) * 100)
  return `<section class="stats card">
    <div class="lvl"><div class="lvl-num">${L.level}</div><div class="lvl-lbl">Level</div></div>
    <div class="xp"><div class="xp-row"><span><b>${G.P.xp}</b> XP</span><span class="muted">${L.next - G.P.xp} to level ${L.level + 1}</span></div>
      <div class="meter"><div style="width:${pct}%"></div></div></div>
    <div class="chip">${icon('fire', 22)}<b>${G.currentStreak()}</b><span>day streak</span></div>
    <a class="chip" href="#/badges">${icon('trophy', 22)}<b>${Object.keys(G.P.badges).length}</b><span>badges</span></a>
  </section>`
}
const pctTxt = (x: number) => `${Math.round(x * 100)}%`

// ---------- views ----------
function home() {
  app.innerHTML = header('MathQuest', null) + `<main>
    <p class="hello">Hi Andrew! Pick a world to explore.</p>
    ${statsStrip()}
    <section class="map">${SUBJECTS.map((s, i) => {
      const m = meta(s.id)
      const p = G.subjectPct(s)
      return `<a class="world card" href="#/s/${s.id}" style="--accent:${m.color};--soft:${m.soft}">
        ${i < SUBJECTS.length - 1 ? '' : ''}
        <div class="world-icon">${icon(m.icon, 34)}</div>
        <div class="world-body"><div class="world-title">${esc(s.title)} ${m.focus ? '<span class="focus">Focus</span>' : ''}</div>
        <div class="muted">${s.topics.length} topics · ${s.questions.length} questions${G.subjectMastered(s) ? ' · 👑 Mastered' : ''}</div>
        <div class="meter sm"><div style="width:${p * 100}%"></div></div></div>
        <div class="world-pct">${pctTxt(p)}</div></a>`
    }).join('')}</section></main>`
}

function subjectView(s: Subject) {
  const m = meta(s.id)
  app.innerHTML = header(s.title, '/', m.color) + `<main style="--accent:${m.color};--soft:${m.soft}">
    ${m.focus ? '<p class="note">⭐ Focus world — a little practice here each day goes a long way!</p>' : ''}
    <div class="row2">
      <a class="big-btn" href="#/run/quiz/${s.id}">${icon('target')}<span><b>Quiz</b><small>10 questions</small></span></a>
      <a class="big-btn alt" href="#/run/test/${s.id}">${icon('star')}<span><b>Test</b><small>25 questions</small></span></a>
    </div>
    <p class="muted small">Mastery = ${pctTxt(s.masteryThreshold)} correct over 10+ tries.</p>
    <section class="topics">${s.topics.map((t) => {
      const st = G.topicStat(s.id, t.id), p = G.topicPct(s.id, t.id), done = G.topicMastered(s, t.id)
      const n = s.questions.filter((q) => q.topicId === t.id).length
      return `<article class="topic card ${done ? 'done' : ''}">
        <div class="topic-head"><div><div class="topic-title">${done ? icon('check', 20) : ''} ${esc(t.title)}</div>
        <div class="muted small">${t.ccss ? esc(t.ccss) + ' · ' : ''}${st.attempts} tries · ${n} questions</div></div>
        <div class="ring" style="--p:${p * 100}"><span>${pctTxt(p)}</span></div></div>
        <div class="topic-actions">
          <a class="pill" href="#/s/${s.id}/t/${t.id}/lesson">${icon('book', 20)} Lesson</a>
          <a class="pill" href="#/s/${s.id}/t/${t.id}/examples">${icon('bulb', 20)} Examples</a>
          ${n ? `<a class="pill solid" href="#/run/practice/${s.id}/${t.id}">${icon('target', 20)} Practice</a>` : ''}
        </div></article>`
    }).join('')}</section></main>`
}

function lessonView(s: Subject, tid: string) {
  const t = s.topics.find((x) => x.id === tid); if (!t) return go(`/s/${s.id}`)
  const m = meta(s.id)
  app.innerHTML = header(t.title, `/s/${s.id}`, m.color) + `<main style="--accent:${m.color};--soft:${m.soft}">
    <article class="card lesson">${renderMarkdown(t.lesson || '_No lesson yet._')}</article>
    <div class="row2"><a class="big-btn" href="#/s/${s.id}/t/${t.id}/examples">${icon('bulb')}<span><b>Worked Examples</b></span></a>
    <a class="big-btn alt" href="#/run/practice/${s.id}/${t.id}">${icon('target')}<span><b>Practice</b><small>5 questions</small></span></a></div></main>`
}

function examplesView(s: Subject, tid: string) {
  const t = s.topics.find((x) => x.id === tid); if (!t) return go(`/s/${s.id}`)
  const m = meta(s.id)
  app.innerHTML = header('Worked Examples', `/s/${s.id}`, m.color) + `<main style="--accent:${m.color};--soft:${m.soft}">
    <p class="muted">${esc(t.title)} — tap to reveal each step.</p>
    ${t.examples.map((e, i) => `<article class="card example" data-i="${i}" data-shown="0">
      <div class="ex-prompt"><b>Example ${i + 1}.</b> ${esc(e.prompt)}</div>${renderFigure(e.figure)}
      <ol class="steps">${e.steps.map((st) => `<li hidden>${esc(st)}</li>`).join('')}</ol>
      <div class="ex-answer" hidden>Answer: <b>${esc(e.answer)}</b></div>
      <button class="btn reveal">Show step 1</button></article>`).join('') || '<p>No examples yet.</p>'}
    <a class="big-btn alt" href="#/run/practice/${s.id}/${t.id}">${icon('target')}<span><b>Try Practice</b><small>5 questions</small></span></a></main>`
  app.querySelectorAll<HTMLElement>('.example').forEach((card) => {
    const btn = card.querySelector<HTMLButtonElement>('.reveal')!
    const steps = [...card.querySelectorAll<HTMLElement>('.steps li')]
    const ans = card.querySelector<HTMLElement>('.ex-answer')!
    btn.onclick = () => {
      const n = Number(card.dataset.shown)
      if (n < steps.length) { steps[n].hidden = false; card.dataset.shown = String(n + 1) }
      else { ans.hidden = false; btn.remove(); return }
      btn.textContent = n + 1 < steps.length ? `Show step ${n + 2}` : 'Show answer'
    }
  })
}

// ---------- runs (practice / quiz / test) ----------
interface Run { kind: 'practice' | 'quiz' | 'test'; s: Subject; topicId?: string; qs: Question[]; i: number; correct: number; xp: number; answered: boolean; misses: Question[] }
let run: Run | null = null

function startRun(kind: Run['kind'], s: Subject, topicId?: string) {
  const pool = topicId ? s.questions.filter((q) => q.topicId === topicId) : s.questions
  const n = kind === 'practice' ? 5 : kind === 'quiz' ? 10 : 25
  run = { kind, s, topicId, qs: G.pick(s, pool, n), i: 0, correct: 0, xp: 0, answered: false, misses: [] }
  renderRun()
}
function runBack(r: Run) { return r.topicId ? `/s/${r.s.id}` : `/s/${r.s.id}` }

function renderRun() {
  const r = run!; const m = meta(r.s.id)
  if (r.i >= r.qs.length) return summary()
  const q = r.qs[r.i]
  const label = r.kind === 'practice' ? 'Practice' : r.kind === 'quiz' ? 'Quiz' : 'Test'
  const topic = r.s.topics.find((t) => t.id === q.topicId)
  app.innerHTML = header(`${label} · ${r.s.title}`, runBack(r), m.color) + `<main style="--accent:${m.color};--soft:${m.soft}">
    <div class="progress-row"><span>Question ${r.i + 1} of ${r.qs.length}</span><span>${'★'.repeat(q.difficulty ?? 1)}</span><span>${r.correct} correct · +${r.xp} XP</span></div>
    <div class="meter"><div style="width:${(r.i / r.qs.length) * 100}%"></div></div>
    <article class="card question">
      <div class="muted small">${esc(topic?.title ?? '')}</div>
      <div class="q-prompt">${esc(q.prompt)}</div>${renderFigure(q.figure)}
      ${q.type === 'mc'
        ? `<div class="choices">${(q.choices ?? []).map((c, i) => `<button class="choice" data-i="${i}"><span class="letter">${'ABCDEFGH'[i]}</span>${esc(c)}</button>`).join('')}</div>`
        : `<form class="num-form" autocomplete="off"><input class="num" type="text" inputmode="decimal" enterkeyhint="done" placeholder="Type your answer" aria-label="Answer" autocapitalize="off" spellcheck="false" />
           <div class="keys">${['−', '.', '/'].map((k) => `<button type="button" class="key" data-k="${k}">${k}</button>`).join('')}</div>
           <button class="btn primary" type="submit">Check</button></form>`}
      <div class="feedback" hidden></div>
    </article></main>`
  if (q.type === 'mc') {
    app.querySelectorAll<HTMLButtonElement>('.choice').forEach((b) => (b.onclick = () => answer(Number(b.dataset.i))))
  } else {
    const form = app.querySelector<HTMLFormElement>('.num-form')!
    const inp = form.querySelector<HTMLInputElement>('.num')!
    form.querySelectorAll<HTMLButtonElement>('.key').forEach((k) => (k.onclick = () => {
      const ch = k.dataset.k === '−' ? '-' : k.dataset.k!
      if (ch === '-') inp.value = inp.value.startsWith('-') ? inp.value.slice(1) : '-' + inp.value
      else inp.value += ch
      inp.focus()
    }))
    form.onsubmit = (e) => { e.preventDefault(); if (inp.value.trim()) answer(inp.value) }
    setTimeout(() => inp.focus(), 50)
  }
}

function answer(resp: string | number) {
  const r = run!; if (r.answered) return
  r.answered = true
  const q = r.qs[r.i]
  const ok = grade(q, resp)
  if (ok) r.correct++; else r.misses.push(q)
  const res = G.recordAnswer(r.s, q, ok)
  r.xp += res.xp
  const correctTxt = q.type === 'mc' ? `${'ABCDEFGH'[Number(q.answer)]}. ${q.choices![Number(q.answer)]}` : String(q.answer)
  if (q.type === 'mc') {
    app.querySelectorAll<HTMLButtonElement>('.choice').forEach((b) => {
      b.disabled = true
      const i = Number(b.dataset.i)
      if (i === Number(q.answer)) b.classList.add('right')
      else if (i === resp) b.classList.add('wrong')
    })
  } else {
    app.querySelectorAll<HTMLInputElement | HTMLButtonElement>('.num-form input, .num-form button').forEach((el) => (el.disabled = true))
    app.querySelector('.num')!.classList.add(ok ? 'right' : 'wrong')
  }
  const fb = app.querySelector<HTMLElement>('.feedback')!
  fb.hidden = false
  fb.className = `feedback ${ok ? 'ok' : 'no'}`
  fb.innerHTML = `<div class="fb-title">${ok ? `✅ Correct! +${res.xp} XP` : `Not quite — the answer is <b>${esc(correctTxt)}</b>`}</div>
    ${q.explanation ? `<div class="fb-exp">${esc(q.explanation)}</div>` : ''}
    <button class="btn primary next">${r.i + 1 < r.qs.length ? 'Next question' : 'See results'}</button>`
  const nb = fb.querySelector<HTMLButtonElement>('.next')!
  nb.onclick = () => { r.i++; r.answered = false; renderRun(); window.scrollTo(0, 0) }
  nb.focus({ preventScroll: true }); fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  announceResult(res)
}

function summary() {
  const r = run!; const m = meta(r.s.id)
  const badges = G.recordRun(r.kind, r.correct, r.qs.length)
  const pct = r.qs.length ? r.correct / r.qs.length : 0
  const msg = pct === 1 ? 'Perfect score! 🌟' : pct >= 0.8 ? 'Excellent work!' : pct >= 0.6 ? 'Good job — keep going!' : 'Nice effort! Review the lesson and try again.'
  app.innerHTML = header('Results', runBack(r), m.color) + `<main style="--accent:${m.color};--soft:${m.soft}">
    <article class="card summary"><div class="big-score">${r.correct}/${r.qs.length}</div><div class="summary-msg">${msg}</div>
    <div class="muted">+${r.xp} XP earned · Level ${G.levelInfo().level}</div></article>
    ${r.misses.length ? `<h3>Review</h3>${r.misses.map((q) => `<article class="card review"><div>${esc(q.prompt)}</div>
      <div class="muted small">Answer: <b>${esc(q.type === 'mc' ? q.choices![Number(q.answer)] : String(q.answer))}</b>${q.explanation ? ' — ' + esc(q.explanation) : ''}</div></article>`).join('')}` : ''}
    <div class="row2"><button class="big-btn again">${icon('target')}<span><b>Go again</b></span></button>
    <a class="big-btn alt" href="#/s/${r.s.id}">${icon('back')}<span><b>Back to ${esc(r.s.title)}</b></span></a></div></main>`
  app.querySelector<HTMLButtonElement>('.again')!.onclick = () => startRun(r.kind, r.s, r.topicId)
  badges.forEach((b) => announce(`${b.icon} ${b.name}`, b.desc))
}

function badgesView() {
  app.innerHTML = header('Badges', '/') + `<main>${statsStrip()}<section class="badges">${G.allBadges().map((b) => {
    const at = G.P.badges[b.id]
    return `<div class="badge card ${at ? 'got' : ''}"><div class="b-icon">${at ? b.icon : '🔒'}</div><div class="b-name">${esc(b.name)}</div><div class="muted small">${esc(b.desc)}</div></div>`
  }).join('')}</section></main>`
}

function settingsView() {
  app.innerHTML = header('Settings', '/') + `<main>
    <article class="card set"><h3>Back up progress</h3><p class="muted">Saves a .json file you can keep or move to another device.</p>
      <button class="btn primary" id="exp">Export progress</button></article>
    <article class="card set"><h3>Restore progress</h3><p class="muted">Choose a MathQuest .json backup file.</p>
      <label class="file-label" for="imp">Backup file:</label>
      <input id="imp" class="file" type="file" accept=".json,application/json" />
      <p class="msg" id="impmsg"></p></article>
    <article class="card set"><h3>Reset</h3><p class="muted">Erase all XP, badges and progress on this device.</p>
      <button class="btn danger" id="reset">Reset all progress</button></article>
    <p class="muted small">MathQuest works offline once loaded. ${SUBJECTS.map((s) => `${esc(s.title)}: ${s.questions.length}`).join(' · ')}</p></main>`
  app.querySelector<HTMLButtonElement>('#exp')!.onclick = () => {
    const blob = new Blob([JSON.stringify(G.P, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `mathquest-progress-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  }
  const inp = app.querySelector<HTMLInputElement>('#imp')!, msg = app.querySelector<HTMLElement>('#impmsg')!
  inp.onchange = async () => {
    const f = inp.files?.[0]; if (!f) return
    try {
      const p = G.sanitize(JSON.parse(await f.text()))
      if (!confirm(`Replace current progress with this backup (${p.xp} XP)?`)) { inp.value = ''; return }
      G.replace(p); msg.textContent = `✅ Restored ${p.xp} XP and ${Object.keys(p.badges).length} badges.`
    } catch (e) { msg.textContent = `⚠️ Could not import: ${(e as Error).message}` }
    inp.value = ''
  }
  app.querySelector<HTMLButtonElement>('#reset')!.onclick = () => {
    if (confirm('Really erase ALL MathQuest progress? This cannot be undone.')) { G.replace(G.blank()); go('/') }
  }
}

// ---------- router ----------
function go(path: string) { location.hash = '#' + path }
function route() {
  try { routeInner() } catch (e) {
    console.error('route failed', e)
    app.innerHTML = header('MathQuest', '/') + `<main><article class="card"><h3>Oops — that page couldn't load.</h3><p class="muted">${esc((e as Error)?.message)}</p><a class="btn primary" href="#/" style="display:inline-grid;place-items:center">Back to the map</a></article></main>`
  }
}
function routeInner() {
  const parts = (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean)
  window.scrollTo(0, 0)
  if (parts[0] === 's' && parts[1]) {
    const s = subjectById(parts[1]); if (!s) return go('/')
    if (parts[2] === 't' && parts[3]) return parts[4] === 'examples' ? examplesView(s, parts[3]) : lessonView(s, parts[3])
    return subjectView(s)
  }
  if (parts[0] === 'run' && parts[2]) {
    const s = subjectById(parts[2]); if (!s) return go('/')
    const kind = parts[1] as Run['kind']
    if (!['practice', 'quiz', 'test'].includes(kind)) return go('/')
    return startRun(kind, s, kind === 'practice' ? parts[3] : undefined)
  }
  if (parts[0] === 'badges') return badgesView()
  if (parts[0] === 'settings') return settingsView()
  home()
}
window.addEventListener('hashchange', route)
route()

// ---------- offline: service worker (Pages/production only; never on file://) ----------
if ('serviceWorker' in navigator && import.meta.env.PROD && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' })
      .then((reg) => reg.update())
      .catch((e) => console.warn('SW failed', e))
  })
  // A new SW took over (new deploy): reload once so the page uses the new build.
  // (Skipped on the very first install, when there was no previous controller.)
  const hadController = !!navigator.serviceWorker.controller
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded || !hadController) return
    reloaded = true
    location.reload()
  })
}
