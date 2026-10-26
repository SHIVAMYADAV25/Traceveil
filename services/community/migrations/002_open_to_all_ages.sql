-- The community is open to people under 18, so no age is recorded at sign-up.
-- Existing rows keep whatever they have; new accounts leave this empty.
ALTER TABLE accounts ALTER COLUMN age_confirmed_at DROP NOT NULL;
