import React from 'react'
import { ListChecks, Sparkles, Calculator, FileText } from 'lucide-react'
import ActionTile from './ActionTile'
import { useAuth } from '../../context/AuthContext'
import type { useAiChat } from './useAiChat'

type ChatApi = ReturnType<typeof useAiChat>

interface Props {
  chat: ChatApi
  onThreadsChanged: () => void
}

/**
 * Claude-style welcome screen. Centered prompt + 4 action tiles.
 * Tapping a tile creates a session in the matching mode and seeds
 * an initial assistant message into the chat.
 */
export default function WelcomeState({ chat, onThreadsChanged }: Props) {
  const { user } = useAuth()
  const firstName = (user?.display_name ?? 'there').split(' ')[0]

  const startGuided = async () => {
    const session = await chat.createSession('guided')
    if (!session) return
    onThreadsChanged()
    chat.appendMessage({
      id: chat.genId(),
      role: 'assistant',
      type: 'text',
      content:
        "Let's build your job post step by step. I'll ask a few quick questions and research Jamaica market prices so you end up with a solid, realistically-priced post. First: what kind of work do you need done? (e.g. plumbing, painting, catering)",
    })
  }

  const startAuto = async () => {
    const session = await chat.createSession('auto')
    if (!session) return
    onThreadsChanged()
    chat.appendMessage({
      id: chat.genId(),
      role: 'assistant',
      type: 'text',
      content:
        "Describe your job in one sentence and I'll do the rest — category, scope, pricing, the whole post. Example: \"Repaint the interior of my 3-bedroom house in Kingston by end of month.\"",
    })
  }

  const startEstimate = async () => {
    const session = await chat.createSession('estimate')
    if (!session) return
    onThreadsChanged()
    chat.appendMessage({
      id: chat.genId(),
      role: 'assistant',
      type: 'text',
      content:
        "Tell me what you need done and I'll research what similar work costs across Jamaica right now. I'll break it down into low, mid, and high quality tiers — materials and labour — and recommend the right budget for you.",
    })
  }

  const startContract = async () => {
    const session = await chat.createSession('contract_qa')
    if (!session) return
    onThreadsChanged()
    chat.appendMessage({
      id: chat.genId(),
      role: 'assistant',
      type: 'text',
      content:
        "I can explain Jobsy contracts — scope, milestones, deposits, cancellation, signatures — and answer questions about a specific contract if you share its details. What would you like to know?",
    })
  }

  return (
    <div className="py-8 md:py-16">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg mb-5">
          <Sparkles className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight leading-tight">
          How can I help with your job today, {firstName}?
        </h1>
        <p className="mt-3 text-[15px] md:text-base text-gray-600 max-w-xl mx-auto leading-relaxed">
          I research Jamaica market prices in real time and can handle your whole job post for you.
          Just pick how you want to start.
        </p>
      </div>

      {/* 2x2 tile grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 max-w-2xl mx-auto">
        <ActionTile
          icon={ListChecks}
          title="Post a job step-by-step"
          subtitle="I'll ask a few quick questions"
          accent="emerald"
          onClick={startGuided}
        />
        <ActionTile
          icon={Sparkles}
          title="Describe your job in one sentence"
          subtitle="AI does it all"
          accent="gold"
          onClick={startAuto}
        />
        <ActionTile
          icon={Calculator}
          title="What should this cost in Jamaica?"
          subtitle="Low / mid / high tiers with sources"
          accent="emerald"
          onClick={startEstimate}
        />
        <ActionTile
          icon={FileText}
          title="Questions about a contract"
          subtitle="I can explain terms and next steps"
          accent="emerald"
          onClick={startContract}
        />
      </div>

      {/* Escape hatch to classic form */}
      <div className="mt-10 text-center">
        <a
          href="#/job-board"
          className="text-sm text-gray-500 hover:text-emerald-700 underline decoration-dotted"
        >
          Prefer the classic form? Open the Job Board →
        </a>
      </div>
    </div>
  )
}
