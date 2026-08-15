-- Profile photos (TASK-113).
--
-- A photo is expected on Gulf CVs far more than Western ones, and the resume
-- template + lib/resumeDocument.ts have supported `photo_url` since TASK-031 —
-- there has simply never been anywhere to put the file. This adds that.
--
-- PRIVATE BUCKET, DELIBERATELY. A face photo is personal data, and this project
-- already encrypts passport/visa fields and logs every internal PII access
-- (migration 013). A public bucket would make every user's photo retrievable by
-- anyone holding the URL, forever, with no audit trail — inconsistent with how
-- the rest of this schema treats personal data. Reads therefore go through
-- short-lived signed URLs minted server-side for the owner.
--
-- career_profiles.photo_url stores the OBJECT PATH (`<user_id>/<uuid>.jpg`),
-- not a URL. Storing a signed URL would bake in an expiry and break the moment
-- it lapsed; storing a public URL would presume a public bucket.

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', false)
on conflict (id) do nothing;

-- Ownership is the FIRST PATH SEGMENT: `<user_id>/<file>`. Every policy below
-- compares that segment to auth.uid(), so a user can never read or write into
-- another user's folder even by crafting a path directly against the storage
-- API. storage.foldername() returns the path segments as an array.
do $$
begin
  drop policy if exists profile_photos_owner_read on storage.objects;
  create policy profile_photos_owner_read
    on storage.objects for select
    to authenticated
    using (
      bucket_id = 'profile-photos'
      and (storage.foldername(name))[1] = auth.uid()::text
    );

  drop policy if exists profile_photos_owner_insert on storage.objects;
  create policy profile_photos_owner_insert
    on storage.objects for insert
    to authenticated
    with check (
      bucket_id = 'profile-photos'
      and (storage.foldername(name))[1] = auth.uid()::text
    );

  drop policy if exists profile_photos_owner_update on storage.objects;
  create policy profile_photos_owner_update
    on storage.objects for update
    to authenticated
    using (
      bucket_id = 'profile-photos'
      and (storage.foldername(name))[1] = auth.uid()::text
    );

  -- Needed for "replace my photo": the old object is removed after the new one
  -- is stored, so a user's folder never accumulates orphans.
  drop policy if exists profile_photos_owner_delete on storage.objects;
  create policy profile_photos_owner_delete
    on storage.objects for delete
    to authenticated
    using (
      bucket_id = 'profile-photos'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
end $$;
