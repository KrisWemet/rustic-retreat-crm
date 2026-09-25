-- Enum additions must commit before the next migration uses the new value.
alter type public.user_role add value if not exists 'staff';
