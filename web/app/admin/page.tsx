"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { OrganizationRow } from "@bananawatch/types";

export default function AdminPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([]);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgCode, setNewOrgCode] = useState("");
  const [orgError, setOrgError] = useState("");
  const [staffLinkOrgId, setStaffLinkOrgId] = useState("");
  const [staffLinkRole, setStaffLinkRole] = useState<"org_admin" | "org_member">("org_member");
  const [staffLinkUrl, setStaffLinkUrl] = useState<string | null>(null);
  const [staffLinkError, setStaffLinkError] = useState("");
  const [orgSearch, setOrgSearch] = useState("");
  const [profiles, setProfiles] = useState<Array<{ user_id: string; org_id: string | null; role: string; organizations?: { name: string; code: string } | null }>>([]);
  const [profileOrgId, setProfileOrgId] = useState<string | null>(null);
  const [staffLinkGeneratedForOrg, setStaffLinkGeneratedForOrg] = useState<{ name: string; code: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      supabase.from("profiles").select("role, org_id").eq("user_id", user.id).maybeSingle().then(({ data }) => {
        const d = data as { role?: string; org_id?: string | null } | null;
        const r = d?.role ?? null;
        setRole(r);
        setProfileOrgId(d?.org_id ?? null);
        if (r !== "super_admin" && r !== "org_admin") {
          router.replace("/");
          return;
        }
        setLoading(false);
      });
    });
  }, [router]);

  useEffect(() => {
    if (role !== "super_admin" && role !== "org_admin") return;
    const supabase = createClient();
    if (role === "super_admin") {
      supabase.from("organizations").select("*").order("name").then(({ data }) => {
        setOrganizations((data ?? []) as OrganizationRow[]);
        if ((data?.length ?? 0) > 0 && !staffLinkOrgId) {
          setStaffLinkOrgId((data as OrganizationRow[])[0].id);
        }
      });
      supabase
        .from("profiles")
        .select("user_id, org_id, role, organizations(name, code)")
        .order("role")
        .then(({ data }) => {
          setProfiles((data ?? []) as Array<{ user_id: string; org_id: string | null; role: string; organizations?: { name: string; code: string } | null }>);
        });
    } else if (role === "org_admin" && profileOrgId) {
      supabase.from("organizations").select("*").eq("id", profileOrgId).maybeSingle().then(({ data }) => {
        if (data) setOrganizations([data] as OrganizationRow[]);
      });
    }
  }, [role, profileOrgId]);

  const createOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgError("");
    const code = newOrgCode.trim().toUpperCase().replace(/\s/g, "");
    if (!newOrgName.trim() || !code) {
      setOrgError("Name and code are required. Code: 1–8 alphanumeric.");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from("organizations").insert({
      name: newOrgName.trim(),
      code,
    });
    if (error) {
      setOrgError(error.message);
      return;
    }
    const { data } = await supabase.from("organizations").select("*").order("name");
    const newList = (data ?? []) as OrganizationRow[];
    setOrganizations(newList);
    const newOrg = newList.find((o) => o.code === code);
    if (newOrg) setStaffLinkOrgId(newOrg.id);
    setNewOrgName("");
    setNewOrgCode("");
  };

  const createStaffLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffLinkError("");
    setStaffLinkUrl(null);
    setStaffLinkGeneratedForOrg(null);
    const orgId = role === "org_admin" ? profileOrgId : staffLinkOrgId;
    if (!orgId) {
      setStaffLinkError(role === "org_admin" ? "Your account has no organization." : "Select an organization.");
      return;
    }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3);
    const { data: link, error } = await supabase
      .from("staff_join_links")
      .insert({
        org_id: orgId,
        role: staffLinkRole,
        expires_at: expiresAt.toISOString(),
        created_by: user?.id ?? null,
      })
      .select("token")
      .single();
    if (error) {
      setStaffLinkError(error.message);
      return;
    }
    const org = organizations.find((o) => o.id === orgId);
    if (org) setStaffLinkGeneratedForOrg({ name: org.name, code: org.code });
    const base = typeof window !== "undefined" ? window.location.origin : "";
    setStaffLinkUrl(`${base}/join?token=${(link as { token: string }).token}`);
  };

  const copyStaffLink = () => {
    if (staffLinkUrl) {
      void navigator.clipboard.writeText(staffLinkUrl);
    }
  };

  if (loading || (role !== "super_admin" && role !== "org_admin")) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-stone-500">
        Loading…
      </div>
    );
  }

  const isSuperAdmin = role === "super_admin";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-page-title">Admin</h1>
      <p className="mt-1 text-muted">
        {isSuperAdmin
          ? "Create organizations and staff join links. Copy links and send them yourself (email or text)."
          : "Create staff join links for your organization. Copy links and send them yourself (email or text)."}
      </p>

      {isSuperAdmin && (
      <section className="mt-10">
        <h2 className="text-section-title">Organizations</h2>
        <ul className="mt-2 list-inside list-disc text-sm text-stone-600">
          {organizations.map((org) => (
            <li key={org.id}>
              {org.name} <span className="font-mono text-stone-500">({org.code})</span>
            </li>
          ))}
        </ul>
        <form onSubmit={createOrg} className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="org-name" className="block text-xs font-medium text-stone-500">
              Name
            </label>
            <input
              id="org-name"
              type="text"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              className="mt-1 rounded border border-stone-300 px-2 py-1.5 text-sm"
              placeholder="Acme Clinic"
            />
          </div>
          <div>
            <label htmlFor="org-code" className="block text-xs font-medium text-stone-500">
              Code (1–8 chars)
            </label>
            <input
              id="org-code"
              type="text"
              value={newOrgCode}
              onChange={(e) => setNewOrgCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
              className="mt-1 w-24 rounded border border-stone-300 px-2 py-1.5 text-sm font-mono"
              placeholder="ACME"
            />
          </div>
          <button
            type="submit"
            className="rounded-button bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-700"
          >
            Add organization
          </button>
        </form>
        {orgError && <p className="mt-2 text-sm text-red-600">{orgError}</p>}
      </section>
      )}

      {isSuperAdmin && (
      <section className="mt-10">
        <h2 className="text-section-title">Profiles (who has access)</h2>
        <p className="mt-1 text-sm text-stone-500">
          All users with a profile. Emails are in Supabase Dashboard → Authentication → Users.
        </p>
        {profiles.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">No profiles yet. Create a staff join link and have someone complete sign-up.</p>
        ) : (
          <ul className="mt-2 rounded border border-stone-200 bg-surface text-sm">
            {profiles.map((p) => (
              <li key={p.user_id} className="flex items-center justify-between border-b border-stone-100 px-3 py-2 last:border-b-0">
                <span className="font-mono text-stone-500">{p.user_id.slice(0, 8)}…</span>
                <span className="text-stone-700">{p.role}</span>
                <span className="text-stone-600">{p.organizations ? `${p.organizations.name} (${p.organizations.code})` : "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      )}

      <section className="mt-10">
        <h2 className="text-section-title">Create staff join link</h2>
        <p className="mt-1 text-sm text-stone-500">
          Recipient will open the link and enter their email and password. Link expires in 3 days.
        </p>
        {!isSuperAdmin && organizations.length > 0 && (
          <p className="mt-2 text-sm text-stone-600">
            Organization: <strong>{organizations[0].name}</strong> ({organizations[0].code})
          </p>
        )}
        <form onSubmit={createStaffLink} className="mt-4 space-y-3">
          {isSuperAdmin && (
          <div>
            <label htmlFor="staff-org-search" className="block text-xs font-medium text-stone-500">
              Organization (search then select)
            </label>
            <input
              id="staff-org-search"
              type="text"
              value={orgSearch}
              onChange={(e) => setOrgSearch(e.target.value)}
              placeholder="Search by name or code…"
              className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
            />
            <select
              id="staff-org"
              value={staffLinkOrgId}
              onChange={(e) => setStaffLinkOrgId(e.target.value)}
              className="mt-1 rounded border border-stone-300 px-2 py-1.5 text-sm"
              aria-label="Organization for staff link"
            >
              {organizations
                .filter(
                  (o) =>
                    !orgSearch.trim() ||
                    o.name.toLowerCase().includes(orgSearch.trim().toLowerCase()) ||
                    o.code.toLowerCase().includes(orgSearch.trim().toLowerCase())
                )
                .map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.code})
                  </option>
                ))}
            </select>
          </div>
          )}
          <div>
            <label htmlFor="staff-role" className="block text-xs font-medium text-stone-500">
              Role
            </label>
            <select
              id="staff-role"
              value={staffLinkRole}
              onChange={(e) => setStaffLinkRole(e.target.value as "org_admin" | "org_member")}
              className="mt-1 rounded border border-stone-300 px-2 py-1.5 text-sm"
            >
              <option value="org_member">Org member</option>
              <option value="org_admin">Org admin</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded-button bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            Generate link
          </button>
        </form>
        {staffLinkError && <p className="mt-2 text-sm text-red-600">{staffLinkError}</p>}
        {staffLinkUrl && (
          <div className="mt-4 rounded border border-stone-200 bg-stone-50 p-3">
            {staffLinkGeneratedForOrg && (
              <p className="text-sm font-medium text-stone-700">
                This link adds the user to <strong>{staffLinkGeneratedForOrg.name}</strong> ({staffLinkGeneratedForOrg.code}).
              </p>
            )}
            <p className="mt-2 text-xs font-medium text-stone-500">Copy this link and send it (email or text):</p>
            <p className="mt-1 break-all font-mono text-sm text-stone-800">{staffLinkUrl}</p>
            <button
              type="button"
              onClick={copyStaffLink}
              className="mt-2 text-sm text-primary-600 hover:underline"
            >
              Copy to clipboard
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
