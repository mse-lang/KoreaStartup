-- Add moderation support
alter table public.comments add column is_blinded boolean default false;
alter table public.comments add column blind_reason text; -- e.g. '욕설 감지', '관리자 블라인드'
