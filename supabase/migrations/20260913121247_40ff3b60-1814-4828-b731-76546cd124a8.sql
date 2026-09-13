CREATE TABLE public.links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  short_code text NOT NULL UNIQUE,
  long_url text NOT NULL,
  title text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX links_user_id_idx ON public.links (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.links TO authenticated;
GRANT ALL ON public.links TO service_role;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own links" ON public.links
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.clicks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id uuid NOT NULL REFERENCES public.links ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  referrer text,
  device text,
  country text,
  visitor_hash text
);

CREATE INDEX clicks_link_id_idx ON public.clicks (link_id, created_at DESC);

GRANT SELECT ON public.clicks TO authenticated;
GRANT ALL ON public.clicks TO service_role;
ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read clicks for their links" ON public.clicks
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.links l WHERE l.id = clicks.link_id AND l.user_id = auth.uid()));