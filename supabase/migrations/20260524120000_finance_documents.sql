-- Phase 2A: locked finance documents (loan invoice, payment receipt, cash sale)

create type document_type as enum (
  'LOAN_CREATION',
  'PAYMENT_RECEIPT',
  'CASH_SALE'
);

create type document_status as enum ('ISSUED', 'VOID');

create table documents (
  id uuid primary key default gen_random_uuid(),
  document_number text not null unique,
  document_type document_type not null,
  loan_id uuid references loans (id) on delete set null,
  payment_id uuid references loan_payments (id) on delete set null,
  customer_id uuid references customers (id) on delete set null,
  bike_id uuid references bikes (id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid references profiles (id) on delete set null,
  total_amount numeric(14, 2) not null default 0,
  status document_status not null default 'ISSUED',
  locked boolean not null default true,
  print_count integer not null default 0,
  last_printed_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb
);

create index documents_loan_id_idx on documents (loan_id);
create index documents_payment_id_idx on documents (payment_id);
create index documents_bike_id_idx on documents (bike_id);
create index documents_type_created_idx on documents (document_type, created_at desc);

comment on table documents is 'Locked printable finance documents with point-in-time snapshots in metadata_json';
