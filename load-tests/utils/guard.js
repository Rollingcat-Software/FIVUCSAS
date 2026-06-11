/**
 * Shared safety guard for MUTATING / biometric scenarios.
 *
 * The enrollment, verification, multi-tenant, stress and spike scenarios write
 * real data (registrations, biometric enrollments, audit rows) and/or call the
 * biometric processor — which has NO public route, so they cannot even run from
 * an external client against production. They are OFF by default; opt in with
 * ALLOW_MUTATIONS=true for a deliberate, scoped run (e.g. over the operator's
 * WireGuard, or against a throwaway stack).
 */
import config from '../config.js';

export function requireMutationsOptIn(scenarioName) {
  if (!config.allowMutations) {
    throw new Error(
      '\n========================================================\n' +
      `REFUSING TO RUN "${scenarioName}".\n` +
      'This scenario MUTATES production data and/or targets the biometric\n' +
      'processor, which is NOT publicly reachable (Docker-network-only).\n\n' +
      'For the safe external run use:\n' +
      '    k6 run scenarios/public-read-load-test.js\n\n' +
      'To override (you understand it writes data and needs internal reach):\n' +
      '    k6 run -e ALLOW_MUTATIONS=true ...\n' +
      '========================================================');
  }
  if (!config.testUserEmail || !config.testUserPassword) {
    throw new Error(`"${scenarioName}" needs TEST_USER_EMAIL / TEST_USER_PASSWORD ` +
      '(no credentials are baked into the repo).');
  }
}
