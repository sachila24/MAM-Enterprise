import type { MamDemoDb } from '../local-db/types';

export interface SignedInProfileDisplay {
  name: string;
  role: 'OWNER' | 'STAFF' | string;
}

/** Read active owner/staff label for header — does not mutate data. */
export function getSignedInProfileDisplay(
  db: MamDemoDb
): SignedInProfileDisplay {
  const owner =
    db.profiles.find((p) => p.active && p.role === 'OWNER') ??
    db.profiles.find((p) => p.active) ??
    db.profiles[0];

  const name = owner?.full_name?.trim() || 'Rahuman';
  const role = owner?.role ?? 'OWNER';

  return { name, role };
}
