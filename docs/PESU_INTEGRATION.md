# CampusFlow PESU Academy Integration

CampusFlow integrates with PESU Academy to fetch and display live academic data in a safer, normalized format. The app currently supports real PESU data for profile, attendance, courses, timetable, results, and seating arrangement.

## Overview

CampusFlow uses a server-side sync flow to avoid exposing sensitive PESU credentials or raw session data to the browser.

The flow is:

```txt
PESU Academy
    ↓
Python safe sync script
    ↓
Next.js API route
    ↓
Server session / safe normalized response
    ↓
CampusFlow UI pages
```

The frontend never stores the PESU password. Raw PESU HTML, cookies, CSRF tokens, and private session values are not exposed to the UI.

## Features Integrated

### Profile

CampusFlow fetches the student profile and safely normalizes:

* Name
* SRN
* PESU ID
* Program
* Branch
* Semester
* Section
* Profile photo data URL, if available

The profile is used across the dashboard shell and connected-state UI.

### Attendance

CampusFlow fetches live subject-wise attendance from PESU Academy and normalizes:

* Course code
* Course name
* Classes attended
* Total classes
* Attendance percentage

The attendance page uses this live data when available and falls back to demo data when PESU data is missing.

### Courses

CampusFlow fetches enrolled courses and normalizes:

* Course code
* Course name
* Course type
* Enrollment status
* Course ID

Courses are also used to support other academic views.

### Timetable

CampusFlow fetches the real PESU timetable from the PESU Academy timetable endpoint.

Normalized timetable slots include:

* Day
* Slot order
* Time range
* Start time
* End time
* Course code
* Subject
* Faculty list
* Class type
* Room ID
* Last finalized date

The Timetable and Today pages use this real data. The Today page can show live class information based on the current day.

### Results

CampusFlow fetches semester results using a safe fallback strategy.

The direct PESU results endpoint may return a small or empty response from the server-side script, so CampusFlow falls back to the PESUAcademy wrapper method when required.

Normalized result data includes:

* Semester
* ESA description
* SGPA
* CGPA, if available
* Earned credits
* Total credits
* Course-wise result records
* Course code
* Course name
* Credits
* Grade
* Assessment marks such as ISA 1, ISA 2, Assignment, and Final ISA

The Results page displays real PESU results when available.

### Seating Arrangement

CampusFlow fetches the real PESU seating arrangement from the PESU seating endpoint.

Normalized seating records include:

* Assessment name
* Course code
* Date
* Time
* Terminal number
* Block / room
* Subject, if available

The parser intentionally ignores the PESU notice section because it can contain sensitive personal information and password instructions. Only the seating table is parsed and returned.

The Seating page displays live PESU seating records and sorts them latest-first by exam date and time.

## Data Safety

CampusFlow is designed to handle PESU data carefully.

The app does not store:

* PESU password
* Raw PESU HTML
* Cookies
* CSRF tokens
* JSESSIONID
* AWS load balancer cookies
* Sensitive notice text from the seating page
* Raw profile fields such as address, parent details, contact number, or Aadhaar-related fields

Only normalized academic fields required by the UI are returned.

## Important Files

### Python Sync Script

```txt
scripts/campusflow_pesu.py
```

This script logs in to PESU Academy through the `pesuacademy` wrapper and fetches safe academic data.

It handles:

* Profile
* Attendance
* Courses
* Timetable
* Results
* Seating arrangement

It returns one safe JSON object to the Next.js backend.

### Safe Sync Wrapper

```txt
src/lib/server/pesu-safe-sync.ts
```

This file runs the Python sync script from the Next.js server using Node.js `spawn`.

It validates the script response and returns only safe normalized data.

### Server Session

```txt
src/lib/server/pesu-session.ts
```

This file manages the server-side PESU session response used by the app.

It exposes a safe session shape to:

```txt
/api/pesu/session
```

### API Routes

```txt
src/app/api/pesu/sync/route.ts
src/app/api/pesu/session/route.ts
```

`/api/pesu/sync` runs the PESU sync process.

`/api/pesu/session` returns the current safe PESU session data.

### Frontend Hooks

```txt
src/lib/hooks/use-pesu-session.ts
src/lib/hooks/use-pesu-attendance.ts
src/lib/hooks/use-pesu-timetable.ts
src/lib/hooks/use-pesu-results.ts
src/lib/hooks/use-pesu-seating.ts
```

These hooks allow pages to read live PESU data with demo fallback support.

### UI Pages

```txt
src/app/attendance/page.tsx
src/app/timetable/page.tsx
src/app/today/page.tsx
src/app/results/page.tsx
src/app/seating/page.tsx
```

These pages use the safe hooks to display real PESU data.

## PESU Endpoints Used

### Timetable

```txt
GET /Academy/s/studentProfilePESUAdmin
```

Query params:

```txt
menuId=669
url=studentProfilePESUAdmin
controllerMode=6415
actionType=5
id=0
selectedData=0
```

### Results

```txt
GET /Academy/a/studentProfilePESU/getEsaAndIsaResultSemBySRN
```

The direct endpoint may not always return complete HTML from the server-side script, so CampusFlow uses a wrapper fallback for reliable result fetching.

### Seating Arrangement

```txt
GET /Academy/s/studentProfilePESUAdmin
```

Query params:

```txt
menuId=655
url=studentProfilePESUAdmin
controllerMode=6404
actionType=5
id=0
selectedData=0
```

Only the `table#seatinginfo` table is parsed.

## Local Setup

Install dependencies:

```bash
npm install
```

Create and activate Python virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install Python dependencies:

```bash
.venv/bin/python -m pip install pesuacademy beautifulsoup4
```

Run the development server:

```bash
npm run dev
```

If your app should use the virtual environment Python, set:

```bash
export CAMPUSFLOW_PYTHON_PATH=".venv/bin/python"
```

Or add it to `.env.local`:

```env
CAMPUSFLOW_PYTHON_PATH=.venv/bin/python
```

## Testing PESU Sync Directly

Run this locally with real credentials:

```bash
printf '{"srn":"YOUR_REAL_SRN","password":"YOUR_REAL_PASSWORD","syncedAt":"manual-test"}' \
| CAMPUSFLOW_DEBUG_PESU=1 .venv/bin/python scripts/campusflow_pesu.py \
> /tmp/pesu-direct.json \
2> /tmp/pesu-debug.txt
```

Check safe counts:

```bash
.venv/bin/python - <<'PY'
import json

data = json.load(open("/tmp/pesu-direct.json"))

print("ok:", data.get("ok"))
print("errors:", data.get("errors"))
print("attendance:", len(data.get("attendance") or []))
print("courses:", len(data.get("courses") or []))
print("timetable slots:", len((data.get("timetable") or {}).get("slots") or []))
print("result courses:", len((data.get("results") or {}).get("courses") or []))
print("seating items:", len((data.get("seating") or {}).get("items") or []))
PY
```

Expected successful output should show non-zero values for available PESU data.

## Testing API Sync

Start the dev server:

```bash
npm run dev
```

Then run:

```bash
curl -s -X POST http://localhost:3000/api/pesu/sync \
  -H "Content-Type: application/json" \
  -d '{"srn":"YOUR_REAL_SRN","password":"YOUR_REAL_PASSWORD"}' \
  > /tmp/pesu-sync-api.json
```

Check safe counts:

```bash
.venv/bin/python - <<'PY'
import json

data = json.load(open("/tmp/pesu-sync-api.json"))

print("top keys:", list(data.keys()))
print("attendance:", len(data.get("attendance") or []))
print("courses:", len(data.get("courses") or []))
print("timetable:", len((data.get("timetable") or {}).get("slots") or []))
print("results:", len((data.get("results") or {}).get("courses") or []))
print("seating:", len((data.get("seating") or {}).get("items") or []))
print("errors:", data.get("errors"))
PY
```

## Testing Browser Session

In browser DevTools Console:

```js
fetch("/api/pesu/session")
  .then((res) => res.json())
  .then((data) => {
    console.log("connected:", data.connected);
    console.log("source:", data.source, data.connectorMode);
    console.log("attendance:", data?.attendance?.length);
    console.log("timetable:", data?.timetable?.slots?.length);
    console.log("results:", data?.results?.courses?.length);
    console.log("seating:", data?.seating?.items?.length);
    console.log("errors:", data.errors);
  });
```

Expected after successful PESU connection:

```txt
connected: true
source: pesu
connectorMode: pesu
attendance: > 0
timetable: > 0
results: > 0 if results are available
seating: > 0 if seating is released
```

## Demo Fallback

CampusFlow keeps demo fallback support. If live PESU data is missing, unavailable, or not released yet, pages can show demo data or a missing-data state instead of crashing.

Fallback behavior is useful for:

* Local UI development
* Unreleased seating or result data
* PESU endpoint downtime
* Invalid or expired session

## Known Limitations

* PESU Academy can change endpoint structure without notice.
* Results may not be available for all semesters.
* Seating data appears only when PESU releases seating information.
* Timetable depends on the current finalized PESU timetable response.
* The integration is intended for personal academic dashboard use and should not be used to overload PESU Academy servers.

## Security Notes

Never commit:

```txt
.env.local
PESU password
PESU cookies
JSESSIONID
AWSALB / AWSALBCORS values
CSRF tokens
Raw PESU HTML
Debug files containing credentials
```

Recommended `.gitignore` entries:

```gitignore
.env
.env.local
.venv/
__pycache__/
*.pyc
/tmp/
```

## Current Status

Implemented:

* Live profile sync
* Live attendance sync
* Live courses sync
* Live timetable sync
* Live results sync
* Live seating arrangement sync
* Safe server-session response
* Demo fallback
* Latest-first seating sort
* Duplicate room/block display fix

Next planned improvement:

* Improve Settings page UI
* Add interactive attendance target slider
* Add PESU data source status cards
* Add sync metadata and refresh controls
