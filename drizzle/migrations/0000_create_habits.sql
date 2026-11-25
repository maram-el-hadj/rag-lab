CREATE TABLE public.habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  color text NOT NULL DEFAULT 'tomato',
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habits TO authenticated;
GRANT ALL ON public.habits TO service_role;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own habits" ON public.habits FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own habits" ON public.habits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own habits" ON public.habits FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own habits" ON public.habits FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX habits_user_idx ON public.habits(user_id);

CREATE TABLE public.habit_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  day date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (habit_id, day)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habit_checks TO authenticated;
GRANT ALL ON public.habit_checks TO service_role;
ALTER TABLE public.habit_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own checks" ON public.habit_checks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own checks" ON public.habit_checks FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.habits h WHERE h.id = habit_id AND h.user_id = auth.uid())
);
CREATE POLICY "Users delete own checks" ON public.habit_checks FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX habit_checks_user_day_idx ON public.habit_checks(user_id, day);