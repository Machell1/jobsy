"""Jobsy AI Assistant package.

Powers /api/ai/* endpoints: OpenRouter-backed DeepSeek V3 with Tavily web
research, scope-locked to job posting and contracts, with pre-flight budget
validation to minimize unnecessary token usage.

Public entry points:
  - client.get_client()   -> singleton OpenRouter client
  - scope_guard.check()   -> two-layer scope filter
  - budget_validator.validate() -> zero-LLM pre-flight check
  - cost_projector.project() -> full analysis + web research
  - session_store.get/create/update/finalize
  - job_builder.finalize_session -> hands off to /api/bidding

All AI calls go through client.py so token accounting is centralized.
"""

__version__ = "0.1.0"
