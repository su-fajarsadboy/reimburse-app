-- Track who submitted each transaction (and keep the existing reviewed_by
-- columns for who approved/rejected). Both submitter columns are nullable
-- because a transaction can come from any of three origins:
--   - admin (manager/approver) creates via /api/admin/...        → created_by_user_id set
--   - peserta creates via share-token web endpoint               → created_by_participant_id set
--   - AI agent creates via /api/v1/transactions (Bearer key)     → both null, source='api',
--                                                                  link survives via audit_logs
-- The reviewed_by column already exists (0001_init.sql) and points at users(id).

alter table transactions
  add column created_by_user_id uuid references users(id) on delete set null,
  add column created_by_participant_id text references participants(id) on delete set null;

create index transactions_creator_user_idx on transactions(created_by_user_id) where created_by_user_id is not null;
create index transactions_creator_participant_idx on transactions(created_by_participant_id) where created_by_participant_id is not null;
