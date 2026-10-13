import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { ActionDetail, ActionSummary, Load, Step, View } from '../types'

const PANE = 'owlic-suivi'
const API = 'https://api.owlic.fr/v1'

const view = atom({ plugin: 'owlic', key: 'view' } as const, { kind: 'list' } as View)
const actions = atom({ plugin: 'owlic', key: 'actions' } as const, [] as ActionSummary[])
const detail = atom({ plugin: 'owlic', key: 'detail' } as const, null as ActionDetail | null)
const load = atom({ plugin: 'owlic', key: 'load' } as const, { isLoading: false } as Load)

// Same sources, same order as the call-owlic-api skill.
async function apiKey($: EngineInterface): Promise<string | undefined> {
  const fromEnv = await $.env.get('OWLIC_API_KEY')
  if (fromEnv) return fromEnv
  const cwd = await $.session.cwd()
  try {
    const config = JSON.parse(await $.fs.read(`${cwd}/.owlic/config.json`))
    if (typeof config.apiKey === 'string') return config.apiKey
  } catch {}
  try {
    const match = (await $.fs.read(`${cwd}/.env`)).match(/^OWLIC_API_KEY=(.+)$/m)
    if (match?.[1]) return match[1].trim().replace(/^["']|["']$/g, '')
  } catch {}
  return undefined
}

async function get($: EngineInterface, path: string): Promise<any> {
  const key = await apiKey($)
  if (!key) throw new Error('No Owlic API key: set OWLIC_API_KEY, or add .env / .owlic/config.json')
  const res = await $.http.fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${key}` } })
  if (!res.ok) {
    let message = res.text.slice(0, 120)
    try {
      message = JSON.parse(res.text).error?.message ?? message
    } catch {}
    throw new Error(`HTTP ${res.status}: ${message}`)
  }
  return JSON.parse(res.text).data
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`
const day = (iso: string) => iso.slice(8, 10) + '/' + iso.slice(5, 7)

export function toSteps(d: any): Step[] {
  const beneficiaries = d.beneficiaries ?? []
  const sessions = d.sessions ?? []
  const trainers = d.trainers ?? []
  const expenses = d.pricingData?.expenses ?? []
  const conventions = d.conventionsStatus ?? {}
  return [
    { label: 'Création', isDone: true, detail: day(d.createdAt) },
    { label: 'Analyse des besoins', isDone: d.needsAnalysis != null },
    { label: 'Bénéficiaires', isDone: beneficiaries.length > 0, detail: beneficiaries.length ? plural(beneficiaries.length, 'bénéficiaire') : undefined },
    { label: 'Programme', isDone: d.trainingProgram != null, detail: d.trainingProgram?.title },
    {
      label: 'Séances',
      isDone: sessions.length > 0,
      detail: sessions.length ? `${plural(sessions.length, 'séance')} · ${sessions.map((s: any) => day(s.date)).join(', ')}` : undefined,
    },
    {
      label: 'Formateurs',
      isDone: trainers.length > 0,
      detail: trainers.length ? trainers.map((t: any) => `${t.firstName} ${t.lastName}`).join(', ') : undefined,
    },
    { label: 'Tarification', isDone: expenses.length > 0, detail: expenses.length ? `${d.pricingData.totalAmount} €` : undefined },
    {
      label: 'Convention',
      isDone: conventions.hasConventions === true,
      detail: conventions.hasConventions
        ? `${plural(conventions.conventionCount, 'convention')}, ${conventions.pendingSignatureCount} en attente de signature`
        : beneficiaries.length ? undefined : 'requiert des bénéficiaires',
    },
  ]
}

async function refresh($: EngineInterface) {
  const current = await read($, view)
  await update($, load, () => ({ isLoading: true }))
  try {
    if (current.kind === 'list') {
      const data: any[] = await get($, '/training-actions')
      const list = data
        .map(a => ({ id: a.id, title: a.title, status: a.status, trainingProgramId: a.trainingProgramId, updatedAt: a.updatedAt }))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      await update($, actions, () => list)
    } else {
      const d = await get($, `/training-actions/${current.id}`)
      await update($, detail, () => ({ id: d.id, title: d.title, requiresQualiopiCompliance: d.requiresQualiopiCompliance, steps: toSteps(d) }))
    }
    await update($, load, () => ({ isLoading: false }))
  } catch (error) {
    await update($, load, () => ({ isLoading: false, error: String((error as Error).message ?? error) }))
  }
}

async function show($: EngineInterface, next: View) {
  if (next.kind === 'detail') await update($, detail, () => null)
  await update($, view, () => next)
  await refresh($)
}

export const register: Register = on => {
  // commands/suivi.md declares /owlic:suivi; with mods, the pane answers it instead of the prompt.
  on('command.run', { command: 'owlic:suivi' }, async ($, e) => {
    const id = e.args.trim()
    const opened = await $.ui.open({ id: PANE, title: 'Owlic · Suivi', focus: true })
    void show($, id ? { kind: 'detail', id } : { kind: 'list' })
    return { text: opened.isPlaced ? 'Panneau de suivi Owlic ouvert.' : 'Panneau de suivi Owlic : élargis le terminal pour l’afficher.' }
  }).catch(($, e, next) => next(e))

  // Redraw after Claude calls the Owlic API, so the pane follows the agent's writes.
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    if (e.command.includes('api.owlic.fr') && (await $.ui.panes()).some(p => p.id === PANE)) void refresh($)
    return ran
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const current = await read($, view)
    const state = await read($, load)

    const footer = (
      <Box flexDirection="column" marginTop={1}>
        {state.isLoading && <Text dimColor>Chargement…</Text>}
        {state.error && <Text color="red">{state.error}</Text>}
        <Box flexDirection="row" gap={1}>
          {current.kind === 'detail' && <Button key="back" label="← Actions" hotkey="b" dimColor onPress={() => void show($, { kind: 'list' })} />}
          <Button key="refresh" label="Rafraîchir" hotkey="r" dimColor onPress={() => void refresh($)} />
        </Box>
      </Box>
    )

    if (current.kind === 'list') {
      const list = await read($, actions)
      const room = Math.max(1, (e.viewport?.rows ?? 24) - 6)
      return (
        <Box flexDirection="column">
          <Text bold>{plural(list.length, 'action')} de formation</Text>
          {!state.isLoading && list.length === 0 && !state.error && <Text dimColor>Aucune action de formation.</Text>}
          {list.slice(0, room).map((a, i) => (
            <Button key={`row:${a.id}`} plain autoFocus={i === 0 ? true : undefined} onPress={() => void show($, { kind: 'detail', id: a.id })}>
              {a.title} <Text dimColor>{a.status} · {day(a.updatedAt)}</Text>
            </Button>
          ))}
          {list.length > room && <Text dimColor>… {list.length - room} de plus (agrandis le panneau)</Text>}
          {footer}
        </Box>
      )
    }

    const d = await read($, detail)
    if (!d) return <Box flexDirection="column">{footer}</Box>
    const nextStep = d.steps.findIndex(s => !s.isDone)
    return (
      <Box flexDirection="column">
        <Text bold>{d.title}</Text>
        <Text dimColor>
          {d.requiresQualiopiCompliance ? 'Qualiopi · ' : ''}
          {d.steps.filter(s => s.isDone).length}/{d.steps.length} étapes
        </Text>
        {d.steps.map((s, i) => (
          <Text dimColor={!s.isDone && i !== nextStep}>
            {s.isDone ? '✓' : i === nextStep ? '→' : ' '} {i + 1} {s.label}
            {s.detail ? <Text dimColor>  {s.detail}</Text> : ''}
          </Text>
        ))}
        {footer}
      </Box>
    )
  })
}
