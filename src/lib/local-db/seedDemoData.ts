import type { MamDemoDb } from './types';
import { createDefaultBusinessSettings } from './businessSettings';
import { createDefaultAppAuth } from './appAuth';
import { getSystemTimestamp } from '../time/systemTime';
import { DEFAULT_OWNER_PROFILE } from './defaultOwner';

/**
 * Empty local DB seed — business defaults only, no sample entities.
 * Used for fresh installs and explicit database reset only.
 */
export function buildSeedDatabase(): MamDemoDb {
  const ts = getSystemTimestamp();

  return {
    version: 1,
    profiles: [
      {
        id: DEFAULT_OWNER_PROFILE.id,
        full_name: DEFAULT_OWNER_PROFILE.full_name,
        email: DEFAULT_OWNER_PROFILE.email,
        role: DEFAULT_OWNER_PROFILE.role,
        active: true,
        created_at: ts,
      },
    ],
    customers: [],
    bikes: [],
    loans: [],
    loan_installments: [],
    loan_interest_cycles: [],
    loan_payments: [],
    payment_allocations: [],
    early_settlements: [],
    guarantees: [],
    documents: [],
    receipts: [],
    cash_transactions: [],
    expenses: [],
    audit_logs: [],
    business_settings: createDefaultBusinessSettings(),
    app_auth: createDefaultAppAuth(),
    counters: {},
  };
}
