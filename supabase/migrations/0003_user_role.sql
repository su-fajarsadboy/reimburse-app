-- Add role column to users for RBAC.
--   manager  : view + create + edit data; cannot approve / adjust amount / close trip
--   approver : everything manager can do, plus approval flows + closing trip
--
-- Existing users default to 'approver' to preserve current admin behaviour.

alter table users
  add column role text not null default 'approver'
    check (role in ('manager', 'approver'));

create index users_role_idx on users(role);
