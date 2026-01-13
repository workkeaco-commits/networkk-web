-- Ensure wallet rows are cleaned up when freelancers are deleted.

ALTER TABLE public.freelancer_wallets
  DROP CONSTRAINT IF EXISTS freelancer_wallets_freelancer_id_fkey;

ALTER TABLE public.freelancer_wallets
  ADD CONSTRAINT freelancer_wallets_freelancer_id_fkey
  FOREIGN KEY (freelancer_id)
  REFERENCES public.freelancers(freelancer_id)
  ON DELETE CASCADE;
