-- Backfill wallet rows for existing clients and freelancers.

INSERT INTO public.client_wallets (client_id, balance, currency, created_at, updated_at)
SELECT c.client_id, 0, 'EGP', now(), now()
FROM public.clients c
LEFT JOIN public.client_wallets w ON w.client_id = c.client_id
WHERE w.client_id IS NULL;

INSERT INTO public.freelancer_wallets (freelancer_id, balance, currency, created_at, updated_at)
SELECT f.freelancer_id, 0, 'EGP', now(), now()
FROM public.freelancers f
LEFT JOIN public.freelancer_wallets w ON w.freelancer_id = f.freelancer_id
WHERE w.freelancer_id IS NULL;
