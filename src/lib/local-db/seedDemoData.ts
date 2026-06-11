import type { MamDemoDb } from './types';
import { createDefaultBusinessSettings } from './businessSettings';
import { createDefaultAppAuth } from './appAuth';
import { getSystemTimestamp } from '../time/systemTime';

/**
 * Empty local DB seed — business defaults only, no sample entities.
 * Demo entities were removed for production cleanup; use Create flows to populate data.
 */
export function buildSeedDatabase(): MamDemoDb {
  const ts = getSystemTimestamp();

  return {
    version: 1,
    profiles: [
      {
        id: 'profile-owner-1',
        full_name: 'Sachila',
        email: 'sachila@mamtrading.lk',
        role: 'OWNER',
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
