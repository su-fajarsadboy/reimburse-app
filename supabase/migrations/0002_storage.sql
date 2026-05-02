-- supabase/migrations/0002_storage.sql

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  true,
  5242880,  -- 5MB
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do nothing;
