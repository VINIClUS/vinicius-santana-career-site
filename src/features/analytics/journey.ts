export type JourneyEvent = 'atlas_open' | 'project_select' | 'case_study_open';
export type JourneyParams = Record<string, string | undefined>;

type Gtag = (command: 'event', name: string, params: Record<string, string>) => void;

// Link clicks (email, resume, evidence) are tracked by the inline analytics snippet in BaseLayout.
export function trackJourney(event: JourneyEvent, params: JourneyParams = {}) {
  const gtag = (globalThis as { gtag?: Gtag }).gtag;
  if (typeof gtag !== 'function') return;
  const defined = Object.fromEntries(Object.entries(params).filter((entry): entry is [string, string] => entry[1] !== undefined && entry[1] !== ''));
  try { gtag('event', event, defined); } catch { /* analytics must never break navigation */ }
}
