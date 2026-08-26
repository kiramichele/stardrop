-- Portfolio customization: background/accent theme, code snippet color
-- theme, an optional banner image, and up to a few social/portfolio links.
-- All owner-controlled, same spirit as portfolio_public.

alter table public.users
  add column if not exists portfolio_theme text not null default 'meadow',
  add column if not exists portfolio_code_theme text not null default 'github-light',
  add column if not exists portfolio_banner_url text,
  add column if not exists portfolio_links jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
