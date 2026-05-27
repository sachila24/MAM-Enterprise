-- Loan origination fees and customer upfront payment breakdown
-- service_fee / registration_fee = business income (not principal)
-- advance_payment reduces loan balance only

ALTER TABLE loans
  ADD COLUMN IF NOT EXISTS service_fee numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS registration_fee numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_paid_amount numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advance_payment numeric(12, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN loans.service_fee IS 'Business income at loan creation; does not reduce principal';
COMMENT ON COLUMN loans.registration_fee IS 'Business income at loan creation; does not reduce principal';
COMMENT ON COLUMN loans.customer_paid_amount IS 'Total cash received from customer at loan creation';
COMMENT ON COLUMN loans.advance_payment IS 'customer_paid_amount - service_fee - registration_fee; reduces balance';

-- Cash movements at loan creation (separate from loan_payments / repayments)
CREATE TABLE IF NOT EXISTS cash_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_code text UNIQUE NOT NULL,
  loan_id uuid NOT NULL REFERENCES loans (id),
  customer_id uuid NOT NULL REFERENCES customers (id),
  transaction_type text NOT NULL CHECK (
    transaction_type IN (
      'LOAN_ADVANCE_PAYMENT',
      'SERVICE_FEE_INCOME',
      'REGISTRATION_FEE_INCOME'
    )
  ),
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  transaction_date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_transactions_loan ON cash_transactions (loan_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_date ON cash_transactions (transaction_date);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_type ON cash_transactions (transaction_type);
