-- RLS policies for milestone submissions, milestone updates, and wallets.

ALTER TABLE public.milestone_submissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'milestone_submissions'
      AND policyname = 'submissions: read parties'
  ) THEN
    CREATE POLICY "submissions: read parties"
    ON public.milestone_submissions
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM milestones m
        JOIN contracts c ON c.contract_id = m.contract_id
        JOIN clients cl ON cl.client_id = c.client_id
        JOIN freelancers f ON f.freelancer_id = c.freelancer_id
        WHERE m.milestone_id = milestone_submissions.milestone_id
          AND (
            auth.uid() = cl.auth_user_id
            OR auth.uid() = f.auth_user_id
            OR EXISTS (
              SELECT 1 FROM app_users
              WHERE app_users.user_id = auth.uid()
                AND app_users.role = 'admin'
            )
          )
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'milestones'
      AND policyname = 'milestones: update parties'
  ) THEN
    CREATE POLICY "milestones: update parties"
    ON public.milestones
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1
        FROM contracts c
        WHERE c.contract_id = milestones.contract_id
          AND (
            auth.uid() = (SELECT clients.auth_user_id FROM clients WHERE clients.client_id = c.client_id)
            OR auth.uid() = (SELECT freelancers.auth_user_id FROM freelancers WHERE freelancers.freelancer_id = c.freelancer_id)
            OR EXISTS (
              SELECT 1 FROM app_users
              WHERE app_users.user_id = auth.uid()
                AND app_users.role = 'admin'
            )
          )
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM contracts c
        WHERE c.contract_id = milestones.contract_id
          AND (
            auth.uid() = (SELECT clients.auth_user_id FROM clients WHERE clients.client_id = c.client_id)
            OR auth.uid() = (SELECT freelancers.auth_user_id FROM freelancers WHERE freelancers.freelancer_id = c.freelancer_id)
            OR EXISTS (
              SELECT 1 FROM app_users
              WHERE app_users.user_id = auth.uid()
                AND app_users.role = 'admin'
            )
          )
      )
    );
  END IF;
END $$;

ALTER TABLE public.client_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_wallets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_wallets'
      AND policyname = 'client wallets: read own'
  ) THEN
    CREATE POLICY "client wallets: read own"
    ON public.client_wallets
    FOR SELECT
    USING (
      auth.uid() = (SELECT clients.auth_user_id FROM clients WHERE clients.client_id = client_wallets.client_id)
      OR EXISTS (
        SELECT 1 FROM app_users
        WHERE app_users.user_id = auth.uid()
          AND app_users.role = 'admin'
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'freelancer_wallets'
      AND policyname = 'freelancer wallets: read own'
  ) THEN
    CREATE POLICY "freelancer wallets: read own"
    ON public.freelancer_wallets
    FOR SELECT
    USING (
      auth.uid() = (SELECT freelancers.auth_user_id FROM freelancers WHERE freelancers.freelancer_id = freelancer_wallets.freelancer_id)
      OR EXISTS (
        SELECT 1 FROM app_users
        WHERE app_users.user_id = auth.uid()
          AND app_users.role = 'admin'
      )
    );
  END IF;
END $$;
