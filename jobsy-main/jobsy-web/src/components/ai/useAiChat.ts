import { useCallback, useReducer, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { apiPost, apiStream } from '../../lib/api'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ChatRole = 'user' | 'assistant' | 'system'

export type ChatMessage =
  | { id: string; role: ChatRole; type: 'text'; content: string; streaming?: boolean }
  | { id: string; role: 'assistant'; type: 'rejected'; content: string }
  | { id: string; role: 'assistant'; type: 'tile_prompt'; content: string; options: string[] }
  | { id: string; role: 'assistant'; type: 'cost_breakdown'; payload: CostProjection }
  | { id: string; role: 'assistant'; type: 'budget_warning'; payload: BudgetVerdict }
  | { id: string; role: 'assistant'; type: 'market_research'; payload: MarketResearchPayload }
  | { id: string; role: 'assistant'; type: 'job_preview'; payload: JobPreviewPayload }

export interface BudgetVerdict {
  verdict: 'too_low' | 'low_ok' | 'mid_ok' | 'high_ok' | 'too_high' | 'unknown'
  recommended_min_jmd: number
  recommended_max_jmd: number
  explanation: string
  used_reference: boolean
  used_llm?: boolean
  low_jmd?: number
  mid_jmd?: number
  high_jmd?: number
}

export interface CostTier {
  materials_jmd: number
  labor_jmd: number
  total_jmd: number
  materials_breakdown: Array<{ item: string; jmd: number }>
  labor_description: string
}

export interface CostProjection {
  low: CostTier
  mid: CostTier
  high: CostTier
  recommended: { tier: 'low' | 'mid' | 'high'; total_jmd: number; reasoning: string }
  assumptions: string[]
  citations: Array<{ url: string; used_for: string }>
  used_web_search: boolean
  used_reference: boolean
  source: string
}

export interface MarketResearchPayload {
  answer?: string
  results: Array<{ title: string; url: string; snippet: string; domain: string }>
}

export interface JobPreviewPayload {
  title: string
  description: string
  category: string
  subcategory?: string | null
  parish: string
  budget_min?: number | null
  budget_max?: number | null
  required_skills?: string[]
}

export interface AiSession {
  id: string
  mode: 'guided' | 'auto' | 'estimate' | 'contract_qa'
  status: string
  collected_slots: Record<string, unknown>
  cost_projection: CostProjection | null
  messages: Array<{ role: ChatRole; content: string }>
  contract_id?: string | null
  created_job_post_id?: string | null
}

type State = {
  session: AiSession | null
  messages: ChatMessage[]
  streaming: boolean
  error: string | null
}

type Action =
  | { type: 'session_loaded'; session: AiSession; messages: ChatMessage[] }
  | { type: 'user_send'; id: string; content: string }
  | { type: 'stream_start'; id: string }
  | { type: 'delta'; id: string; content: string }
  | { type: 'stream_done'; id: string }
  | { type: 'append'; message: ChatMessage }
  | { type: 'replace_last'; message: ChatMessage }
  | { type: 'error'; error: string }
  | { type: 'reset' }

const initialState: State = {
  session: null,
  messages: [],
  streaming: false,
  error: null,
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'session_loaded':
      return { ...state, session: action.session, messages: action.messages, error: null }
    case 'user_send':
      return {
        ...state,
        messages: [
          ...state.messages,
          { id: action.id, role: 'user', type: 'text', content: action.content },
        ],
      }
    case 'stream_start':
      return {
        ...state,
        streaming: true,
        error: null,
        messages: [
          ...state.messages,
          { id: action.id, role: 'assistant', type: 'text', content: '', streaming: true },
        ],
      }
    case 'delta': {
      const messages = state.messages.map(m =>
        m.id === action.id && m.type === 'text' && m.role === 'assistant'
          ? { ...m, content: m.content + action.content }
          : m
      )
      return { ...state, messages }
    }
    case 'stream_done': {
      const messages = state.messages.map(m =>
        m.id === action.id && m.type === 'text' && m.role === 'assistant'
          ? { ...m, streaming: false }
          : m
      )
      return { ...state, messages, streaming: false }
    }
    case 'append':
      return { ...state, messages: [...state.messages, action.message] }
    case 'replace_last':
      return {
        ...state,
        messages: [...state.messages.slice(0, -1), action.message],
      }
    case 'error':
      return { ...state, error: action.error, streaming: false }
    case 'reset':
      return initialState
    default:
      return state
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

function genId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function useAiChat() {
  const { token } = useAuth()
  const [state, dispatch] = useReducer(reducer, initialState)
  const abortRef = useRef<AbortController | null>(null)

  /** Create a brand-new session for a given mode. */
  const createSession = useCallback(
    async (mode: 'guided' | 'auto' | 'estimate' | 'contract_qa' = 'guided', contractId?: string) => {
      try {
        const res = (await apiPost(
          '/api/ai/sessions',
          { mode, contract_id: contractId },
          token
        )) as { session: AiSession }
        dispatch({ type: 'session_loaded', session: res.session, messages: [] })
        return res.session
      } catch (err) {
        dispatch({ type: 'error', error: err instanceof Error ? err.message : 'Could not create session' })
        return null
      }
    },
    [token]
  )

  /** Load an existing session and replay its messages. */
  const loadSession = useCallback(
    async (sessionId: string) => {
      try {
        const res = (await (await fetch(
          `${import.meta.env.VITE_API_BASE ?? 'https://api.jobsyja.com'}/api/ai/sessions/${sessionId}`,
          {
            headers: { Authorization: `Bearer ${token ?? ''}` },
          }
        )).json()) as { session: AiSession }
        const replayed: ChatMessage[] = (res.session.messages ?? []).map((m, i) => ({
          id: `replay_${i}`,
          role: m.role,
          type: 'text',
          content: m.content,
        }))
        // If cost_projection was cached, add it as a card
        if (res.session.cost_projection) {
          replayed.push({
            id: 'replay_cost',
            role: 'assistant',
            type: 'cost_breakdown',
            payload: res.session.cost_projection,
          })
        }
        dispatch({ type: 'session_loaded', session: res.session, messages: replayed })
        return res.session
      } catch (err) {
        dispatch({ type: 'error', error: err instanceof Error ? err.message : 'Could not load session' })
        return null
      }
    },
    [token]
  )

  /** Stream a chat message. Handles SSE events and dispatches reducer actions. */
  const sendStreamed = useCallback(
    async (content: string) => {
      if (!state.session) {
        dispatch({ type: 'error', error: 'No active session' })
        return
      }

      const userId = genId()
      dispatch({ type: 'user_send', id: userId, content })

      const assistantId = genId()
      dispatch({ type: 'stream_start', id: assistantId })

      const controller = new AbortController()
      abortRef.current = controller

      try {
        let rejected = false
        await apiStream(
          `/api/ai/sessions/${state.session.id}/stream`,
          { content },
          token,
          (event) => {
            if (event.type === 'delta' && typeof event.content === 'string') {
              dispatch({ type: 'delta', id: assistantId, content: event.content })
            } else if (event.type === 'rejected' && typeof event.message === 'string') {
              rejected = true
              dispatch({
                type: 'replace_last',
                message: {
                  id: assistantId,
                  role: 'assistant',
                  type: 'rejected',
                  content: event.message,
                },
              })
            } else if (event.type === 'done') {
              if (!rejected) dispatch({ type: 'stream_done', id: assistantId })
            } else if (event.type === 'error' && typeof event.message === 'string') {
              dispatch({ type: 'error', error: event.message })
            }
          },
          controller.signal
        )
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          dispatch({
            type: 'error',
            error: err instanceof Error ? err.message : 'Stream failed',
          })
        }
      } finally {
        abortRef.current = null
      }
    },
    [state.session, token]
  )

  /** Non-streaming turn (used when we want the structured response all at once). */
  const sendTurn = useCallback(
    async (content: string) => {
      if (!state.session) return null
      try {
        return (await apiPost(
          `/api/ai/sessions/${state.session.id}/turn`,
          { content },
          token
        )) as { type: string; content?: string; message?: string }
      } catch (err) {
        dispatch({ type: 'error', error: err instanceof Error ? err.message : 'Turn failed' })
        return null
      }
    },
    [state.session, token]
  )

  const validateBudget = useCallback(
    async (payload: {
      category: string
      subcategory?: string | null
      parish?: string | null
      scope_hint?: string
      budget_min?: number | null
      budget_max?: number | null
      size_hint?: Record<string, number> | null
    }): Promise<BudgetVerdict | null> => {
      if (!state.session) return null
      try {
        return (await apiPost(
          `/api/ai/sessions/${state.session.id}/validate-budget`,
          payload,
          token
        )) as BudgetVerdict
      } catch (err) {
        dispatch({ type: 'error', error: err instanceof Error ? err.message : 'Budget check failed' })
        return null
      }
    },
    [state.session, token]
  )

  const analyzeJob = useCallback(
    async (payload: {
      category: string
      subcategory?: string | null
      parish?: string | null
      scope_description: string
      size_hint?: Record<string, number> | null
    }): Promise<CostProjection | null> => {
      if (!state.session) return null
      try {
        return (await apiPost(
          `/api/ai/sessions/${state.session.id}/analyze`,
          payload,
          token
        )) as CostProjection
      } catch (err) {
        dispatch({ type: 'error', error: err instanceof Error ? err.message : 'Analysis failed' })
        return null
      }
    },
    [state.session, token]
  )

  const finalizeSession = useCallback(async () => {
    if (!state.session) return null
    try {
      return (await apiPost(
        `/api/ai/sessions/${state.session.id}/finalize`,
        {},
        token
      )) as { job_post: { id: string } }
    } catch (err) {
      dispatch({ type: 'error', error: err instanceof Error ? err.message : 'Finalize failed' })
      return null
    }
  }, [state.session, token])

  const abortStream = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const appendMessage = useCallback((message: ChatMessage) => {
    dispatch({ type: 'append', message })
  }, [])

  const reset = useCallback(() => {
    abortStream()
    dispatch({ type: 'reset' })
  }, [abortStream])

  return {
    session: state.session,
    messages: state.messages,
    streaming: state.streaming,
    error: state.error,
    createSession,
    loadSession,
    sendStreamed,
    sendTurn,
    validateBudget,
    analyzeJob,
    finalizeSession,
    abortStream,
    appendMessage,
    reset,
    genId,
  }
}
