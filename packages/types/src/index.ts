export type { Database, Json, Tables, TablesInsert, TablesUpdate } from "./database.types";
import type { Tables, TablesInsert, TablesUpdate } from "./database.types";

export type OrganizationRow = Tables<"organizations">;
export type OrganizationInsert = TablesInsert<"organizations">;
export type OrganizationUpdate = TablesUpdate<"organizations">;

export type PatientTemplateRow = Tables<"patient_templates">;
export type PatientTemplateInsert = TablesInsert<"patient_templates">;
export type PatientTemplateUpdate = TablesUpdate<"patient_templates">;

export type ProfileRow = Tables<"profiles">;
export type ProfileInsert = TablesInsert<"profiles">;
export type ProfileUpdate = TablesUpdate<"profiles">;

export type PatientRow = Tables<"patients">;
export type PatientInsert = TablesInsert<"patients">;
export type PatientUpdate = TablesUpdate<"patients">;

export type PatientLinkRow = Tables<"patient_links">;
export type PatientLinkInsert = TablesInsert<"patient_links">;
export type PatientLinkUpdate = TablesUpdate<"patient_links">;

export type ScanRow = Tables<"scans">;
export type ScanInsert = TablesInsert<"scans">;
export type ScanUpdate = TablesUpdate<"scans">;

export type ScanStaffNoteRow = Tables<"scan_staff_notes">;
export type ScanStaffNoteInsert = TablesInsert<"scan_staff_notes">;
export type ScanStaffNoteUpdate = TablesUpdate<"scan_staff_notes">;

export type StaffJoinLinkRow = Tables<"staff_join_links">;
export type StaffJoinLinkInsert = TablesInsert<"staff_join_links">;
export type StaffJoinLinkUpdate = TablesUpdate<"staff_join_links">;
