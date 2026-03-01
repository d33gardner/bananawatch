"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";

const BUCKET = "survey-photos";

export default function SurveyPage() {
  const params = useParams();
  const patientId = typeof params.id === "string" ? params.id : "";
  const [patientName, setPatientName] = useState<string>("");
  const [patientExists, setPatientExists] = useState<boolean | null>(null);
  const [notes, setNotes] = useState("");
  const [condition, setCondition] = useState<"good" | "moderate" | "poor">("good");
  const [painLevel, setPainLevel] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!patientId) return;
    const supabase = createClient();
    supabase
      .from("patients")
      .select("id, first_name, last_name")
      .eq("id", patientId)
      .single()
      .then(({ data }) => {
        setPatientExists(!!data);
        if (data) {
          const name = [data.first_name, data.last_name].filter(Boolean).join(" ").trim();
          setPatientName(name || `Patient ${data.id}`);
        }
      });
  }, [patientId]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files;
    if (!chosen?.length) return;
    setFiles((prev) => [...prev, ...Array.from(chosen)]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (files.length === 0) {
      setError("Please attach at least one photo before submitting.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const pain = painLevel === "" ? null : parseInt(painLevel, 10);
    if (pain !== null && (Number.isNaN(pain) || pain < 1 || pain > 10)) {
      setError("Pain level must be 1–10.");
      setLoading(false);
      return;
    }

    const submittedAt = new Date().toISOString();
    const answers = {
      notes: notes.trim() || null,
      condition,
      pain_level: pain,
      submitted_at: submittedAt,
    };

    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${patientId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
        uploadedUrls.push(urlData.publicUrl);
      }

      for (const imageUrl of uploadedUrls) {
        const { error: scanError } = await supabase.from("scans").insert({
          patient_id: patientId,
          image_url: imageUrl,
          analysis_result: { source: "survey" },
          questionnaire_response: answers,
          submitted_at: submittedAt,
        });
        if (scanError) throw scanError;
      }

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (!patientId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <p className="text-stone-600">Invalid survey link.</p>
      </div>
    );
  }

  if (patientExists === null) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <p className="text-stone-600">Loading…</p>
      </div>
    );
  }

  if (!patientExists) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <p className="text-stone-600">Patient not found.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <Link
          href="/portal"
          className="inline-block rounded-button bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Return to Portal
        </Link>
        <h1 className="mt-6 text-page-title">Thank you</h1>
        <p className="mt-2 text-stone-600">
          Your responses and photos have been submitted for patient {patientId}.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-page-title">Survey — Patient {patientId}</h1>
      <p className="mt-1 text-stone-600">Please complete the form and add at least one photo.</p>

      {patientName && (
        <p className="mt-2 text-sm font-medium text-stone-700">
          Patient: <span className="text-stone-900">{patientName}</span>
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && (
          <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        )}

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-stone-700">
            Notes
          </label>
          <textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="Optional notes…"
          />
        </div>

        <div>
          <label htmlFor="condition" className="block text-sm font-medium text-stone-700">
            Condition
          </label>
          <select
            id="condition"
            value={condition}
            onChange={(e) => setCondition(e.target.value as "good" | "moderate" | "poor")}
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="good">Good</option>
            <option value="moderate">Moderate</option>
            <option value="poor">Poor</option>
          </select>
        </div>

        <div>
          <label htmlFor="pain" className="block text-sm font-medium text-stone-700">
            Pain level (1–10, optional)
          </label>
          <input
            id="pain"
            type="number"
            min={1}
            max={10}
            value={painLevel}
            onChange={(e) => setPainLevel(e.target.value)}
            placeholder="1–10"
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div>
          <label htmlFor="survey-photos" className="block text-sm font-medium text-stone-700">
            Photos <span className="text-red-500">*</span>
          </label>
          <input
            id="survey-photos"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={onFileChange}
            aria-label="Upload photos"
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded file:border-0 file:rounded-button file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-primary-700 hover:file:bg-primary-100"
          />
          {files.length === 0 && (
            <p className="mt-1 text-xs text-stone-500">At least one photo is required.</p>
          )}
          {files.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-stone-600">
              {files.map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span>{f.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading || files.length === 0}
            className="rounded-button bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? "Submitting…" : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}
