-- 046 — founder-editable site content: the footer, and the legal pages.
--
-- WHY A TABLE AND NOT A FILE. docs/03_ARCHITECTURE.md §6 already draws the line:
-- "everything the founder should be able to change without a developer" lives in
-- database rows, edited from the admin panel — prices, plan entitlements, prompt
-- templates. Footer wording and legal text are business decisions, not code, and
-- waiting on a deploy to correct a privacy policy is the wrong shape entirely.
--
-- WHY IT MATTERS MORE THAN MOST CONTENT. There are no privacy, terms or refund
-- pages in this product at all, while it collects passport type and expiry, visa status
-- and full work histories (14_OPEN_ITEMS.md §A4). That is a trust problem in a
-- market 01_PRODUCT.md §3 describes as actively targeted by scams, and a DPDP /
-- GDPR question besides. This table is what lets the founder close it in an
-- afternoon rather than a sprint.
--
-- PUBLISHED IS THE POINT. A page is invisible until `published` is true, and the
-- footer links only to published pages. Half-written legal text must never be
-- reachable, and a link to a page that does not exist is worse than no link —
-- so absence is expressible, not simulated with an empty string.

create table if not exists public.site_content (
  slug        text primary key,
  title       text not null,
  body        text not null default '',
  published   boolean not null default false,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);

comment on table public.site_content is
  'Founder-editable page content: the legal pages and the footer blurb. Edited at /admin/content, never in code. `published` gates visibility — the footer links only to published rows.';

-- The three pages the footer wants to link to, plus the footer's own line.
-- Seeded UNPUBLISHED and EMPTY on purpose: seeding real legal text would mean
-- inventing terms on the founder's behalf, which is exactly the kind of claim
-- this product exists not to make.
insert into public.site_content (slug, title, body, published) values
  ('privacy', 'Privacy Policy', '', false),
  ('terms',   'Terms of Service', '', false),
  ('refund',  'Refund Policy', '', false),
  ('footer_about', 'Footer — about line',
   'A Gulf career platform built by a 15-year Gulf E&I Superintendent — someone who has actually hired and worked on these sites.',
   true)
on conflict (slug) do nothing;

alter table public.site_content enable row level security;

-- Anyone may read a PUBLISHED row: these are public pages by definition.
-- Unpublished drafts stay invisible to the client entirely.
drop policy if exists site_content_public_read on public.site_content;
create policy site_content_public_read on public.site_content
  for select using (published = true);

-- Writes are service-role only, through the admin panel. Same posture as
-- promo_codes: no client, authenticated or not, may edit site copy.
revoke insert, update, delete on public.site_content from anon, authenticated;
grant select on public.site_content to anon, authenticated;
