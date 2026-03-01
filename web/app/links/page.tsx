"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { StaffJoinLinkRow } from "@bananawatch/types";

type StaffLinkWithOrg = StaffJoinLinkRow & { organizations?: { name: string; code: string } | null };
type PatientLinkRow = {
  id: string;
  patient_id: string;
  token: string;
  expires_at: string;
  activated_at: string | null;
  deactivated_at: string | null;
  created_at: string;
  patients?: { id: string; org_id: string; organizations?: { name: string; code: string } | null } | null;
};

function staffStatus(link: StaffLinkWithOrg): string {
  if (link.used_at) return "Used";
  if (link.revoked_at) return "Revoked";
  if (new Date(link.expires_at) <= new Date()) return "Expired";
  return "Pending";
}

function patientLinkStatus(link: PatientLinkRow): string {
  if (link.deactivated_at) return "Deactivated";
  if (link.activated_at) return "Active";
  if (new Date(link.expires_at) <= new Date()) return "Expired";
  return "Pending activation";
}

export default function LinksPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [staffLinks, setStaffLinks] = useState<StaffLinkWithOrg[]>([]);
  const [patientLinks, setPatientLinks] = useState<PatientLinkRow[]>([]);
  const [orgFilter, setOrgFilter] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; code: string }>>([]);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle();
      const r = (profile as { role?: string } | null)?.role ?? null;
      setRole(r);
      if (r !== "super_admin" && r !== "org_admin" && r !== "org_member") {
        router.replace("/");
        setLoading(false);
        return;
      }
      if (r === "super_admin") {
        const { data: orgs } = await supabase.from("organizations").select("id, name, code").order("name");
        setOrganizations((orgs ?? []) as Array<{ id: string; name: string; code: string }>);
      }
      const { data: staffData } = await supabase
        .from("staff_join_links")
        .select("*, organizations(name, code)")
        .order("created_at", { ascending: false });
      setStaffLinks((staffData ?? []) as StaffLinkWithOrg[]);
      const { data: patientData } = await supabase
        .from("patient_links")
        .select("*, patients(id, org_id, organizations(name, code))")
        .order("created_at", { ascending: false });
      setPatientLinks((patientData ?? []) as PatientLinkRow[]);
      setLoading(false);
    })();
  }, [router]);

  const revokeStaffLink = async (id: string) => {
    const supabase = createClient();
    await supabase.from("staff_join_links").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    setStaffLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, revoked_at: new Date().toISOString() } : l))
    );
  };

  const deleteStaffLink = async (id: string) => {
    const supabase = createClient();
    await supabase.from("staff_join_links").delete().eq("id", id);
    setStaffLinks((prev) => prev.filter((l) => l.id !== id));
  };

  const deactivatePatientLink = async (id: string) => {
    const supabase = createClient();
    await supabase.from("patient_links").update({ deactivated_at: new Date().toISOString() }).eq("id", id);
    setPatientLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, deactivated_at: new Date().toISOString() } : l))
    );
  };

  const reactivatePatientLink = async (id: string) => {
    const supabase = createClient();
    await supabase.from("patient_links").update({ deactivated_at: null }).eq("id", id);
    setPatientLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, deactivated_at: null } : l))
    );
  };

  const deletePatientLink = async (id: string) => {
    const supabase = createClient();
    await supabase.from("patient_links").delete().eq("id", id);
    setPatientLinks((prev) => prev.filter((l) => l.id !== id));
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center text-stone-500">
        Loading…
      </div>
    );
  }

  if (role !== "super_admin" && role !== "org_admin" && role !== "org_member") {
    return null;
  }

  const isSuperAdmin = role === "super_admin";
  const showStaffSection = isSuperAdmin || role === "org_admin";

  const filteredStaffLinks = isSuperAdmin && orgFilter
    ? staffLinks.filter((l) => l.org_id === orgFilter)
    : staffLinks;
  const filteredPatientLinks = isSuperAdmin && orgFilter
    ? patientLinks.filter((l) => l.patients?.org_id === orgFilter)
    : patientLinks;

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-page-title">Links</h1>
      <p className="mt-1 text-muted">
        Manage staff join links and patient links. Revoke or delete to prevent use.
      </p>

      {isSuperAdmin && organizations.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          <label htmlFor="links-org-filter" className="text-sm font-medium text-stone-700">
            Filter by org:
          </label>
          <select
            id="links-org-filter"
            value={orgFilter ?? ""}
            onChange={(e) => setOrgFilter(e.target.value || null)}
            className="rounded border border-stone-300 px-2 py-1.5 text-sm"
            aria-label="Filter links by organization"
          >
            <option value="">All</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name} ({org.code})
              </option>
            ))}
          </select>
        </div>
      )}

      {showStaffSection && (
        <section className="mt-8">
          <h2 className="text-section-title">Staff join links</h2>
          {filteredStaffLinks.length === 0 ? (
            <p className="mt-2 text-sm text-stone-500">No staff join links.</p>
          ) : (
            <div className="mt-2 overflow-x-auto rounded border border-stone-200">
              <table className="min-w-full text-sm">
                <thead className="bg-stone-50">
                  <tr>
                    {isSuperAdmin && <th className="px-3 py-2 text-left font-medium text-stone-700">Org</th>}
                    <th className="px-3 py-2 text-left font-medium text-stone-700">Role</th>
                    <th className="px-3 py-2 text-left font-medium text-stone-700">Created</th>
                    <th className="px-3 py-2 text-left font-medium text-stone-700">Expires</th>
                    <th className="px-3 py-2 text-left font-medium text-stone-700">Status</th>
                    <th className="px-3 py-2 text-left font-medium text-stone-700">Link</th>
                    <th className="px-3 py-2 text-left font-medium text-stone-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredStaffLinks.map((link) => {
                    const status = staffStatus(link);
                    const canRevokeOrDelete = !link.used_at && !link.revoked_at;
                    return (
                      <tr key={link.id} className="bg-surface">
                        {isSuperAdmin && (
                          <td className="px-3 py-2 text-stone-600">
                            {link.organizations ? `${link.organizations.name} (${link.organizations.code})` : "—"}
                          </td>
                        )}
                        <td className="px-3 py-2">{link.role}</td>
                        <td className="px-3 py-2 text-stone-600">
                          {link.created_at ? new Date(link.created_at).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-3 py-2 text-stone-600">
                          {new Date(link.expires_at).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2">{status}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => void navigator.clipboard.writeText(`${baseUrl}/join?token=${link.token}`)}
                            className="text-primary-600 hover:underline"
                          >
                            Copy
                          </button>
                        </td>
                        <td className="px-3 py-2">
                          {canRevokeOrDelete && (
                            <>
                              {!link.revoked_at && (
                                <button
                                  type="button"
                                  onClick={() => revokeStaffLink(link.id)}
                                  className="mr-2 text-amber-600 hover:underline"
                                >
                                  Revoke
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => deleteStaffLink(link.id)}
                                className="text-red-600 hover:underline"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-section-title">Patient links</h2>
        {filteredPatientLinks.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">No patient links.</p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded border border-stone-200">
            <table className="min-w-full text-sm">
              <thead className="bg-stone-50">
                <tr>
                  {isSuperAdmin && <th className="px-3 py-2 text-left font-medium text-stone-700">Org</th>}
                  <th className="px-3 py-2 text-left font-medium text-stone-700">Patient</th>
                  <th className="px-3 py-2 text-left font-medium text-stone-700">Created</th>
                  <th className="px-3 py-2 text-left font-medium text-stone-700">Expires</th>
                  <th className="px-3 py-2 text-left font-medium text-stone-700">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-stone-700">Link</th>
                  <th className="px-3 py-2 text-left font-medium text-stone-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredPatientLinks.map((link) => {
                  const status = patientLinkStatus(link);
                  const org = link.patients?.organizations;
                  return (
                    <tr key={link.id} className="bg-surface">
                      {isSuperAdmin && (
                        <td className="px-3 py-2 text-stone-600">
                          {org ? `${org.name} (${org.code})` : "—"}
                        </td>
                      )}
                      <td className="px-3 py-2 font-mono">{link.patient_id}</td>
                      <td className="px-3 py-2 text-stone-600">
                        {link.created_at ? new Date(link.created_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-3 py-2 text-stone-600">
                        {new Date(link.expires_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2">{status}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() =>
                            void navigator.clipboard.writeText(`${baseUrl}/survey/link/${link.token}`)
                          }
                          className="text-primary-600 hover:underline"
                        >
                          Copy
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        {link.activated_at && !link.deactivated_at && (
                          <button
                            type="button"
                            onClick={() => deactivatePatientLink(link.id)}
                            className="mr-2 text-amber-600 hover:underline"
                          >
                            Deactivate
                          </button>
                        )}
                        {link.deactivated_at && (
                          <button
                            type="button"
                            onClick={() => reactivatePatientLink(link.id)}
                            className="mr-2 text-blue-600 hover:underline"
                          >
                            Reactivate
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deletePatientLink(link.id)}
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
