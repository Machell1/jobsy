/**
 * Analytics module for Jobsy — GA4 + PostHog dual tracking.
 *
 * Environment variables (set in .env):
 *   VITE_GA4_MEASUREMENT_ID  — Google Analytics 4 measurement ID
 *   VITE_POSTHOG_API_KEY     — PostHog project API key
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
    posthog: any
  }
}

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

const GA4_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID || 'G-BRG0V4Y3G1'
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_API_KEY || ''
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

let posthogInitialized = false
let ga4Initialized = false

/* ------------------------------------------------------------------ */
/*  Initialization                                                     */
/* ------------------------------------------------------------------ */

/** Load the GA4 gtag.js script dynamically. */
function initGA4(): void {
  if (ga4Initialized || !GA4_ID) return

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', GA4_ID, { send_page_view: false })

  ga4Initialized = true
}

/** Load PostHog via the lightweight JS snippet. */
function initPostHog(): void {
  if (posthogInitialized || !POSTHOG_KEY) return

  try {
    // PostHog lightweight loader
    const phScript = document.createElement('script')
    phScript.async = true
    phScript.src = POSTHOG_HOST + '/static/array.js'
    const firstScript = document.getElementsByTagName('script')[0]
    if (firstScript?.parentNode) {
      firstScript.parentNode.insertBefore(phScript, firstScript)
    } else {
      document.head.appendChild(phScript)
    }
    ;(window as any).posthog =
      (window as any).posthog ||
      function (...args: any[]) {
        ;((window as any).posthog.q = (window as any).posthog.q || []).push(args)
      }

    window.posthog?.init?.(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false,
      capture_pageleave: true,
    })

    posthogInitialized = true
  } catch {
    // Silently fail — analytics should never break the app
  }
}

/** Initialize all analytics providers. Call once at app startup. */
export function initAnalytics(): void {
  initGA4()
  initPostHog()
}

/* ------------------------------------------------------------------ */
/*  Tracking helpers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Track a custom event in both GA4 and PostHog.
 *
 * Key events to track:
 *   sign_up, job_post, bid_submit, contract_signed,
 *   payment_completed, event_posted, ad_created, role_switch
 */
export function trackEvent(name: string, properties?: Record<string, any>): void {
  // GA4
  if (ga4Initialized && window.gtag) {
    window.gtag('event', name, properties)
  }

  // PostHog
  if (posthogInitialized && window.posthog) {
    window.posthog.capture(name, properties)
  }
}

/** Identify a user in PostHog (GA4 uses `user_id` config). */
export function identifyUser(userId: string, traits?: Record<string, any>): void {
  // GA4 — set user ID
  if (ga4Initialized && window.gtag) {
    window.gtag('config', GA4_ID, { user_id: userId })
    if (traits) {
      window.gtag('set', 'user_properties', traits)
    }
  }

  // PostHog
  if (posthogInitialized && window.posthog) {
    window.posthog.identify(userId, traits)
  }
}

/** Track a page view in both GA4 and PostHog. */
export function trackPageView(path: string): void {
  // GA4
  if (ga4Initialized && window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_location: window.location.href,
    })
  }

  // PostHog
  if (posthogInitialized && window.posthog) {
    window.posthog.capture('$pageview', { $current_url: window.location.origin + path })
  }
}

/** Reset analytics identity (call on logout). */
export function resetAnalytics(): void {
  if (posthogInitialized && window.posthog) {
    window.posthog.reset()
  }
}
