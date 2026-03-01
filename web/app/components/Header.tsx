"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

type NavState = "loading" | "staff" | "patient" | "none";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [navState, setNavState] = useState<NavState>("loading");
  const [role, setRole] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    function setStateFromUser(u: { id: string } | null) {
      if (!u) {
        setNavState("none");
        setRole(null);
        setOrgName(null);
        return;
      }
      Promise.all([
        supabase.from("profiles").select("role, org_id").eq("user_id", u.id).maybeSingle(),
        supabase.from("patients").select("id, org_id").eq("linked_user_id", u.id).maybeSingle(),
      ]).then(([profileRes, patientRes]) => {
        const profile = profileRes.data as { role?: string; org_id?: string } | null;
        const patientRow = patientRes.data as { id?: string; org_id?: string } | null;
        const orgId = patientRow?.id ? patientRow.org_id : profile?.org_id;
        if (orgId) {
          supabase.from("organizations").select("name").eq("id", orgId).maybeSingle().then(({ data: org }) => {
            setOrgName((org as { name?: string } | null)?.name ?? null);
          });
        } else {
          setOrgName(null);
        }
        if (patientRow?.id) {
          setNavState("patient");
          setRole(null);
        } else if (profile?.role) {
          setNavState("staff");
          setRole(profile.role);
        } else {
          setNavState("none");
          setRole(null);
        }
      });
    }
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u ?? null);
      setStateFromUser(u ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setStateFromUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const isLoginPage = pathname === "/login";
  const isJoinPage = pathname === "/join";
  const isAdmin = pathname.startsWith("/admin");
  const isLinks = pathname === "/links";
  const isDashboard = pathname === "/" || pathname.startsWith("/patients");

  const showStaffNav = !isLoginPage && !isJoinPage && user && navState === "staff";

  const linkClass = (active: boolean) =>
    `text-sm font-medium ${active ? "text-primary-700 border-b-2 border-primary-600" : "text-stone-500 hover:text-stone-800"}`;

  return (
    <header className="border-b border-stone-200 bg-surface shadow-sm">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-6">
          {showStaffNav && (
            <>
              <Link href="/" className={linkClass(isDashboard)}>
                Dashboard
              </Link>
              <Link href="/links" className={linkClass(isLinks)}>
                Links
              </Link>
              {(role === "super_admin" || role === "org_admin") && (
                <Link href="/admin" className={linkClass(isAdmin)}>
                  Admin
                </Link>
              )}
            </>
          )}
        </div>
        {!isLoginPage && !isJoinPage && user && (
          <div className="flex flex-1 items-center justify-center">
            {orgName && (
              <span className="text-sm font-medium text-stone-600" title="Organization">
                {orgName}
              </span>
            )}
          </div>
        )}
        {!isLoginPage && !isJoinPage && user && (
          <div className="flex min-w-0 flex-1 justify-end gap-3">
            <span className="truncate text-sm text-stone-600">{user.email}</span>
            <button
              type="button"
              onClick={signOut}
              className="shrink-0 text-sm text-stone-500 hover:text-stone-700 underline"
            >
              Sign out
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}
