// Single source of truth for the Found intro-rate cutoff. Every file that
// gates founding pricing or renders "expires ___" copy imports this instead
// of declaring its own date, so moving the cutoff is a one-line change.
// Interpreted as Arizona midnight (UTC-7, no DST).
export const INTRO_RATE_CUTOFF = new Date('2026-08-15T07:00:00.000Z')
export const INTRO_RATE_CUTOFF_LABEL = 'August 15'
