-- Revoke all current admin roles
DELETE FROM public.user_roles WHERE role = 'admin'::app_role;

-- Restore the original trigger: first user becomes admin, others become members
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin'::app_role) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member'::app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- Grant admin to the permanent admin email
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'rajaoutlier19@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Ensure that user always has the member role removed (admin only) — optional cleanup
DELETE FROM public.user_roles
WHERE role = 'member'::app_role
  AND user_id IN (SELECT id FROM auth.users WHERE email = 'rajaoutlier19@gmail.com');