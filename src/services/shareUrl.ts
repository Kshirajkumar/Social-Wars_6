/**
 * URL utilities for sharing rooms across devices.
 * - In Google AI Studio:
 *   - `ais-dev-...` is the active development container (accessible only with developer's Google login).
 *   - `ais-pre-...` is the public container activated when the developer clicks "Publish" in Google AI Studio.
 */

export function getPublicShareUrl(roomCode?: string): string {
  let origin = typeof window !== 'undefined' ? window.location.origin : '';
  if (origin.includes('ais-dev-')) {
    origin = origin.replace('ais-dev-', 'ais-pre-');
  }
  return roomCode ? `${origin}?room=${roomCode}` : origin;
}

export function getDevShareUrl(roomCode?: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return roomCode ? `${origin}?room=${roomCode}` : origin;
}

export function isPrivateDevEnvironment(): boolean {
  return typeof window !== 'undefined' && window.location.origin.includes('ais-dev-');
}
