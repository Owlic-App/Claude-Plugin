export type ActionSummary = {
  id: string
  title: string
  status: string
  trainingProgramId: string | null
  updatedAt: string
}

export type Step = { label: string; isDone: boolean; detail?: string }

export type ActionDetail = {
  id: string
  title: string
  requiresQualiopiCompliance: boolean
  steps: Step[]
}

export type View = { kind: 'list' } | { kind: 'detail'; id: string }

export type Load = { isLoading: boolean; error?: string }

declare module 'claude-code' {
  interface PluginState {
    'owlic': {
      view: View
      actions: ActionSummary[]
      detail: ActionDetail | null
      load: Load
    }
  }
}
