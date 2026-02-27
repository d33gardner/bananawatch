Project Spec: BananaWatch (Medical MVP Pilot)
1. Project Overview
Goal: Build a "Change Detection" app for medical monitoring, using bananas as a proxy for patients.
Core Loop:

Doctor (Web): Reviews list of 28 "Patients" (Bananas). Sends a "Scan Request" via email.

Patient (Mobile): Receives link. Clicks link. App opens Camera with a "Ghost Overlay" of the previous day's photo. User takes photo.

System: Uploads photo, calculates a "Decay Score" (Health %), updates Doctor Dashboard.

2. Technical Stack
Mobile App: React Native (Expo Router) - Must run on physical iOS/Android device.

Web Admin: Next.js (App Router) - Deployed on Vercel.

Backend/DB: Supabase (PostgreSQL, Auth, Storage, Edge Functions).

Language: TypeScript.

Image Analysis: Python (FastAPI) or Supabase Edge Functions (OpenCV/NumPy).

3. Database Schema (Supabase)
Table: patients
id (Text, PK): The Patient ID (e.g., 20260214-001). Note: Manual entry allowed.

status (Text): 'active', 'critical', 'discharged'.

last_scan_date (Timestamp).

decay_score (Float): 0.0 (Fresh) to 1.0 (Rotten).

Table: scans
id (UUID, PK).

patient_id (Text, FK): Links to patients.id.

image_url (Text): Public URL from Supabase Storage.

created_at (Timestamp).

analysis_result (JSON): Stores the calculated brown pixel % or decay metrics.

Table: requests
id (UUID).

patient_id (Text).

status: 'pending', 'completed'.

magic_link: The generated URL sent to the user.

4. Feature Requirements
A. The Doctor Dashboard (Web - Next.js)
Grid View: Display all 28 Patients as cards.

Card shows: Patient ID, Thumbnail of latest scan, and a "Traffic Light" badge (Green/Yellow/Red) based on decay_score.

Patient Detail View:

Time-Lapse: Show a strip of images from Day 1 to Day X for this specific ID.

Action: Button "Request New Scan".

Logic: Generates a deep link (bananawatch://scan?id=20260214-001) and emails it to the "Caregiver" (the developer's email for now).

B. The Scanner App (Mobile - Expo)
Auth: minimal. The app should generally be open, or use a "Pin Code" for the "Nurse/Dev" mode.

Deep Link Handler:

When the phone opens bananawatch://scan?id=X, immediately navigate to the Camera Screen.

Fetch the most recent image for ID X from Supabase.

Overlay that image at 30% opacity (The "Ghost").

Manual Mode (For the 28 Banana Test):

A simple dropdown or text input on the home screen to manually type 20260214-028 and hit "Scan" without needing an email link.

Upload:

Take photo -> Resize/Compress -> Upload to Supabase Storage bucket scans.

Insert row into scans table.

C. The Analysis Engine (The "Brain")
Trigger: On database insert (new scan).

Logic (Simple Version):

Use a Supabase Edge Function (or Python script).

Compare current_image histogram vs previous_image histogram.

Calculate % difference.

Update patients.decay_score.

5. Specific Workflows for the "2 Phone" Constraint
Since the developer is simulating 28 patients on 1 phone:

"Batch Mode" Feature:

In the Mobile App, add a "Next Patient" button after a successful scan.

Logic: If I just scanned ...-001, the button automatically sets the context to ...-002 and loads that ghost image.

Why: This allows scanning all 28 bananas in 5 minutes without clicking 28 email links.

6. Development Phases (Cursor Prompt Strategy)
Phase 1: Setup Supabase (Tables + Storage) and connect a basic Expo app that can upload a photo.

Phase 2: Build the "Ghost Overlay" camera logic (fetching the previous photo).

Phase 3: Build the Next.js Dashboard to view the uploaded photos.

Phase 4: Implement the Deep Link + Email Request system.