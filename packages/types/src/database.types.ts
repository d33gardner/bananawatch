/**
 * Supabase database types for BananaWatch.
 * Matches schema: patients, scans.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface PatientRow {
  id: string;
  status: string;
  decay_score: number;
  last_scan_date: string;
}

export interface PatientInsert {
  id: string;
  status?: string;
  decay_score?: number;
  last_scan_date?: string;
}

export interface PatientUpdate {
  id?: string;
  status?: string;
  decay_score?: number;
  last_scan_date?: string;
}

export interface ScanRow {
  id: string;
  patient_id: string;
  image_url: string;
  analysis_result: Json | null;
  created_at: string;
}

export interface ScanInsert {
  id?: string;
  patient_id: string;
  image_url: string;
  analysis_result?: Json | null;
  created_at?: string;
}

export interface ScanUpdate {
  id?: string;
  patient_id?: string;
  image_url?: string;
  analysis_result?: Json | null;
  created_at?: string;
}

export interface Database {
  public: {
    Tables: {
      patients: {
        Row: PatientRow;
        Insert: PatientInsert;
        Update: PatientUpdate;
      };
      scans: {
        Row: ScanRow;
        Insert: ScanInsert;
        Update: ScanUpdate;
      };
    };
  };
}
