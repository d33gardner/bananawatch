-- Store email on profiles and sync from auth.users (for staff note author display).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text;

-- Sync email from auth.users when user updates their email.
CREATE OR REPLACE FUNCTION public.sync_profile_email_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email, updated_at = now()
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_email_from_auth();

-- Backfill existing profiles from auth.users.
UPDATE public.profiles p
SET email = u.email, updated_at = now()
FROM auth.users u
WHERE p.user_id = u.id AND (p.email IS DISTINCT FROM u.email);
