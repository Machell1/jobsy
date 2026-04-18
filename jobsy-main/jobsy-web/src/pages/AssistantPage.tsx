import React from 'react'
import DashboardShell from '../components/ai/DashboardShell'
import SEO from '../components/SEO'

/**
 * Jobsy AI Assistant - the centerpiece of the hirer experience.
 *
 * Claude-chat-style dashboard: left sidebar with conversation threads,
 * right pane with streaming chat, welcome tiles when idle.
 *
 * Scope-locked to job posting and contracts (enforced server-side by
 * /api/ai/* scope guard). Powered by DeepSeek V3 via OpenRouter with
 * Tavily web research for real-time Jamaica market pricing.
 */
export default function AssistantPage() {
  return (
    <>
      <SEO
        title="Jobsy Assistant"
        description="Your AI-powered job-posting assistant. Get real-time Jamaica market pricing, post jobs with guided questions, and understand contracts — all in one place."
      />
      <DashboardShell />
    </>
  )
}
