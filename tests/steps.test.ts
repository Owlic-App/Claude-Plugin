import { expect, test } from 'claude-code/testing'

import { toSteps } from '../hooks/register'

const empty = {
  createdAt: '2026-09-28T15:17:07.464Z',
  needsAnalysis: null,
  trainingProgram: null,
  beneficiaries: [],
  sessions: [],
  trainers: [],
  pricingData: {},
  conventionsStatus: { hasConventions: false, conventionCount: 0, areAllSigned: false, pendingSignatureCount: 0 },
}

test('a new action has only its creation done', () => {
  const steps = toSteps(empty)
  expect(steps).toHaveLength(8)
  expect(steps.map(s => s.isDone)).toEqual([true, false, false, false, false, false, false, false])
  expect(steps[7]?.detail).toBe('requiert des bénéficiaires')
})

test('an action through pricing has 7 steps done and details', () => {
  const steps = toSteps({
    ...empty,
    needsAnalysis: { id: 'n1' },
    trainingProgram: { title: 'Claude Code' },
    beneficiaries: [{}, {}],
    sessions: [{ date: '2026-06-18' }, { date: '2026-06-19' }],
    trainers: [{ firstName: 'Ada', lastName: 'Lovelace' }],
    pricingData: { expenses: [{ amount: 1800 }], totalAmount: 1800 },
  })
  expect(steps.map(s => s.isDone)).toEqual([true, true, true, true, true, true, true, false])
  expect(steps[2]?.detail).toBe('2 bénéficiaires')
  expect(steps[3]?.detail).toBe('Claude Code')
  expect(steps[4]?.detail).toBe('2 séances · 18/06, 19/06')
  expect(steps[5]?.detail).toBe('Ada Lovelace')
  expect(steps[6]?.detail).toBe('1800 €')
  expect(steps[7]?.detail).toBeUndefined()
})

test('signed and pending conventions are reported', () => {
  const steps = toSteps({
    ...empty,
    beneficiaries: [{}],
    conventionsStatus: { hasConventions: true, conventionCount: 1, areAllSigned: false, pendingSignatureCount: 1 },
  })
  expect(steps[7]).toEqual({ label: 'Convention', isDone: true, detail: '1 convention, 1 en attente de signature' })
})
