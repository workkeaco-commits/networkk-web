-- Live contracts: confirmation timing, milestone offsets, and wallet scaffolding.

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS confirmed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS client_confirm_grace_days integer NOT NULL DEFAULT 3;

ALTER TABLE public.milestones
  ADD COLUMN IF NOT EXISTS start_offset_days integer,
  ADD COLUMN IF NOT EXISTS end_offset_days integer,
  ADD COLUMN IF NOT EXISTS due_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS client_confirm_deadline_at timestamp with time zone;

CREATE TABLE IF NOT EXISTS public.client_wallets (
  wallet_id bigserial PRIMARY KEY,
  client_id bigint NOT NULL UNIQUE REFERENCES public.clients(client_id),
  balance numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.freelancer_wallets (
  wallet_id bigserial PRIMARY KEY,
  freelancer_id bigint NOT NULL UNIQUE REFERENCES public.freelancers(freelancer_id),
  balance numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
