// Re-export browser client so client components get session from cookies.
// Survey works as anon when not logged in; dashboard/add-patient require login.
export { createClient } from "./supabase/client";
