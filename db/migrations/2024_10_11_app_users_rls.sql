-- Restrict app_users so only service role (Supabase) can write.

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_users'
      AND policyname = 'app users: read own'
  ) THEN
    CREATE POLICY "app users: read own"
    ON public.app_users
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;
