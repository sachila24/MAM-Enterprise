-- MAM Enterprise — production loan finance model
-- Dual repayment: INTEREST_ONLY_REDUCING_PRINCIPAL | FIXED_TERM_INSTALLMENT
-- Do not apply to production until reviewed. Requires customers, bikes, guarantees base tables.

-- ---------------------------------------------------------------------------
-- Reference tables (minimal; extend in earlier migrations if split)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text,
  address text,
  nic text UNIQUE,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bikes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_code text UNIQUE NOT NULL,
  model text NOT NULL,
  chassis_no text,
  engine_no text,
  selling_price numeric(14, 2) NOT NULL DEFAULT 0,
  cost_price numeric(14, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'IN_STOCK' CHECK (status IN ('IN_STOCK', 'SOLD', 'HELD')),
  sold_at timestamptz,
  sold_loan_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- BIKE_INSTALLMENT loan creation: set bikes.status = 'SOLD', sold_at = now(), sold_loan_id = new loan.id
-- Implement in application transaction or DB trigger when wiring Supabase.

CREATE TABLE IF NOT EXISTS guarantees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guarantee_code text UNIQUE NOT NULL,
  loan_id uuid NOT NULL,
  customer_id uuid NOT NULL REFERENCES customers (id),
  item_type text NOT NULL CHECK (
    item_type IN ('VEHICLE_BOOK', 'GOLD', 'ELECTRONICS', 'OTHER')
  ),
  description text,
  storage_location text,
  status text NOT NULL DEFAULT 'HELD' CHECK (status IN ('HELD', 'RELEASED')),
  received_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- loans
-- ---------------------------------------------------------------------------

CREATE TABLE loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_code text UNIQUE NOT NULL,
  loan_purpose text NOT NULL CHECK (loan_purpose IN ('CASH_LOAN', 'BIKE_INSTALLMENT')),
  repayment_method text NOT NULL CHECK (
    repayment_method IN (
      'INTEREST_ONLY_REDUCING_PRINCIPAL',
      'FIXED_TERM_INSTALLMENT'
    )
  ),
  customer_id uuid NOT NULL REFERENCES customers (id),
  bike_id uuid REFERENCES bikes (id),
  principal_amount numeric(14, 2) NOT NULL,
  original_principal_amount numeric(14, 2) NOT NULL,
  current_principal_balance numeric(14, 2) NOT NULL,
  interest_rate numeric(8, 2) NOT NULL,
  interest_rate_period text NOT NULL DEFAULT 'MONTHLY' CHECK (
    interest_rate_period IN ('MONTHLY', 'YEARLY')
  ),
  interest_calculation_type text NOT NULL CHECK (
    interest_calculation_type IN ('REDUCING_PRINCIPAL', 'FLAT_TERM')
  ),
  term_months int,
  total_interest_amount numeric(14, 2),
  total_before_discount numeric(14, 2),
  discount_amount numeric(14, 2) NOT NULL DEFAULT 0,
  total_payable numeric(14, 2),
  paid_amount numeric(14, 2) NOT NULL DEFAULT 0,
  balance_amount numeric(14, 2) NOT NULL,
  installment_amount numeric(14, 2),
  late_fee_rate numeric(8, 2) NOT NULL DEFAULT 5,
  pending_interest_amount numeric(14, 2) NOT NULL DEFAULT 0,
  start_date date NOT NULL,
  first_due_date date NOT NULL,
  due_day int,
  due_date date,
  minimum_months_before_settlement int NOT NULL DEFAULT 6,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (
    status IN ('ACTIVE', 'COMPLETED', 'OVERDUE', 'CANCELLED', 'SETTLED')
  ),
  notes text,
  cancelled_reason text,
  cancelled_by uuid,
  cancelled_at timestamptz,
  settled_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT loans_bike_installment_bike CHECK (
    (loan_purpose = 'BIKE_INSTALLMENT' AND bike_id IS NOT NULL)
    OR loan_purpose = 'CASH_LOAN'
  ),
  CONSTRAINT loans_method_calculation CHECK (
    (
      repayment_method = 'INTEREST_ONLY_REDUCING_PRINCIPAL'
      AND interest_calculation_type = 'REDUCING_PRINCIPAL'
      AND late_fee_rate = 0
    )
    OR (
      repayment_method = 'FIXED_TERM_INSTALLMENT'
      AND interest_calculation_type = 'FLAT_TERM'
      AND term_months IS NOT NULL
    )
  ),
  CONSTRAINT loans_due_day_range CHECK (
    due_day IS NULL OR (due_day >= 1 AND due_day <= 28)
  )
);

COMMENT ON COLUMN loans.pending_interest_amount IS
  'Cached sum of unpaid interest on loan_interest_cycles (interest-only loans).';
COMMENT ON COLUMN loans.late_fee_rate IS
  'Fixed-term default 5%. Must be 0 for INTEREST_ONLY_REDUCING_PRINCIPAL.';
COMMENT ON COLUMN loans.first_due_date IS
  'Same calendar day each month as start (e.g. start May 15 → first due June 15).';

CREATE INDEX idx_loans_customer_id ON loans (customer_id);
CREATE INDEX idx_loans_status ON loans (status);
CREATE INDEX idx_loans_loan_code ON loans (loan_code);

-- ---------------------------------------------------------------------------
-- loan_installments (fixed term installment loans)
-- ---------------------------------------------------------------------------

CREATE TABLE loan_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES loans (id) ON DELETE CASCADE,
  installment_number int NOT NULL,
  due_date date NOT NULL,
  principal_component numeric(14, 2) NOT NULL,
  interest_component numeric(14, 2) NOT NULL,
  installment_amount numeric(14, 2) NOT NULL,
  paid_amount numeric(14, 2) NOT NULL DEFAULT 0,
  late_fee_amount numeric(14, 2) NOT NULL DEFAULT 0,
  late_fee_paid numeric(14, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE')
  ),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (loan_id, installment_number)
);

CREATE INDEX idx_loan_installments_loan_id ON loan_installments (loan_id);
CREATE INDEX idx_loan_installments_due_date ON loan_installments (due_date);

-- ---------------------------------------------------------------------------
-- loan_interest_cycles (interest-only reducing principal loans)
-- ---------------------------------------------------------------------------

CREATE TABLE loan_interest_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES loans (id) ON DELETE CASCADE,
  cycle_number int NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  due_date date NOT NULL,
  opening_principal numeric(14, 2) NOT NULL,
  interest_rate numeric(8, 2) NOT NULL,
  interest_due numeric(14, 2) NOT NULL,
  interest_paid numeric(14, 2) NOT NULL DEFAULT 0,
  principal_paid numeric(14, 2) NOT NULL DEFAULT 0,
  closing_principal numeric(14, 2) NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'PARTIAL', 'PAID')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (loan_id, cycle_number)
);

COMMENT ON TABLE loan_interest_cycles IS
  'Interest-only: unpaid past interest stays PENDING/PARTIAL. No late fees on this method.';

CREATE INDEX idx_loan_interest_cycles_loan_id ON loan_interest_cycles (loan_id);

-- ---------------------------------------------------------------------------
-- loan_payments
-- ---------------------------------------------------------------------------

CREATE TABLE loan_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_code text UNIQUE NOT NULL,
  loan_id uuid NOT NULL REFERENCES loans (id),
  customer_id uuid NOT NULL REFERENCES customers (id),
  amount numeric(14, 2) NOT NULL,
  payment_method text NOT NULL CHECK (
    payment_method IN ('CASH', 'CHEQUE', 'BANK_TRANSFER', 'OTHER')
  ),
  cheque_number text,
  bank_reference text,
  payment_date timestamptz NOT NULL,
  receipt_number text UNIQUE NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'VOIDED')),
  void_reason text,
  voided_by uuid,
  voided_at timestamptz,
  received_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_loan_payments_loan_id ON loan_payments (loan_id);
CREATE INDEX idx_loan_payments_customer_id ON loan_payments (customer_id);

-- ---------------------------------------------------------------------------
-- payment_allocations
-- ---------------------------------------------------------------------------

CREATE TABLE payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES loan_payments (id) ON DELETE CASCADE,
  loan_id uuid NOT NULL REFERENCES loans (id),
  allocation_type text NOT NULL CHECK (
    allocation_type IN (
      'INTEREST',
      'PRINCIPAL',
      'INSTALLMENT',
      'LATE_FEE',
      'ADVANCE',
      'SETTLEMENT'
    )
  ),
  installment_id uuid REFERENCES loan_installments (id),
  interest_cycle_id uuid REFERENCES loan_interest_cycles (id),
  amount numeric(14, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_allocations_target CHECK (
    (
      allocation_type IN ('INSTALLMENT', 'LATE_FEE')
      AND installment_id IS NOT NULL
    )
    OR (
      allocation_type IN ('INTEREST', 'PRINCIPAL')
      AND interest_cycle_id IS NOT NULL
    )
    OR allocation_type IN ('ADVANCE', 'SETTLEMENT')
  )
);

CREATE INDEX idx_payment_allocations_payment_id ON payment_allocations (payment_id);

-- ---------------------------------------------------------------------------
-- early_settlements
-- ---------------------------------------------------------------------------

CREATE TABLE early_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_code text UNIQUE NOT NULL,
  loan_id uuid NOT NULL REFERENCES loans (id),
  customer_id uuid NOT NULL REFERENCES customers (id),
  settlement_date date NOT NULL,
  months_completed int NOT NULL,
  remaining_principal numeric(14, 2) NOT NULL,
  remaining_interest numeric(14, 2) NOT NULL,
  discount_percentage numeric(8, 2) NOT NULL DEFAULT 0,
  discount_amount numeric(14, 2) NOT NULL DEFAULT 0,
  current_month_due numeric(14, 2) NOT NULL DEFAULT 0,
  final_settlement_amount numeric(14, 2) NOT NULL,
  status text NOT NULL DEFAULT 'QUOTED' CHECK (
    status IN ('QUOTED', 'PAID', 'CANCELLED')
  ),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_early_settlements_loan_id ON early_settlements (loan_id);

-- guarantees FK to loans (after loans exists)
ALTER TABLE guarantees
  ADD CONSTRAINT guarantees_loan_id_fkey
  FOREIGN KEY (loan_id) REFERENCES loans (id) ON DELETE CASCADE;

ALTER TABLE guarantees
  ADD CONSTRAINT guarantees_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES customers (id);

CREATE INDEX idx_guarantees_loan_id ON guarantees (loan_id);

ALTER TABLE bikes
  ADD CONSTRAINT bikes_sold_loan_id_fkey
  FOREIGN KEY (sold_loan_id) REFERENCES loans (id);
