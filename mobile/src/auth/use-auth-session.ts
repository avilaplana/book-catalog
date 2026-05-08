import { useSyncExternalStore } from 'react';

import type { AuthSession, SessionStatus } from './session';

export function useAuthSessionStatus(session: AuthSession): SessionStatus {
  return useSyncExternalStore(
    (cb) => session.subscribe(cb),
    () => session.getStatus(),
  );
}
