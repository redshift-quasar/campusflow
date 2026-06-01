# CampusFlow

CampusFlow is a modern academic dashboard for PESU students. It brings profile details, attendance tracking, course data, timetable views, result summaries, exam seating, and smart academic insights into one polished web app.

The project focuses on a safe PESU sync flow, premium UI, local-first caching, and a smooth student experience.

---

## Features

### PESU Academy Sync

* Safe PESU Academy sync flow
* Student profile sync
* Real attendance sync
* Course list sync
* Profile photo support
* Password is used only during sync and is not stored in localStorage

### Dashboard

* Premium glassmorphism dashboard UI
* Attendance health overview
* Low attendance alerts
* Safe subject count
* Critical subject focus
* Quick academic shortcuts
* PESU sync status

### Attendance

* Subject-wise attendance tracking
* Real PESU attendance support
* Target attendance percentage
* Low, warning, and safe subject grouping
* Recovery class estimation
* Remaining skip estimation
* Semester-end attendance projection

### Timetable

* Weekly timetable layout
* Class time, room, faculty, and subject view
* Demo timetable support while real timetable endpoint is being explored

### Results

* Subject result overview
* Average score
* Highest and lowest subject performance
* Grade distribution
* SGPA / CGPA summary

### Exam Seating

* Exam seat card view
* Room, block, seat, date, and time details
* Search by subject, code, room, block, or seat

### Command Palette

* Ctrl + K global search
* Search pages, subjects, rooms, results, timetable, and seating
* Keyboard navigation support

### UI / UX

* Next.js App Router
* Tailwind CSS styling
* Framer Motion animations
* Glassmorphism cards
* Mobile bottom navigation
* Responsive dashboard shell
* Premium landing and login page

---

## Tech Stack

* Next.js
* TypeScript
* Tailwind CSS
* Framer Motion
* Lucide React
* Python
* PESU Academy Python wrapper
* Local-first browser caching
* Server API routes

---

## Project Structure

```txt
campusflow/
├── scripts/
│   └── campusflow_pesu.py
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── pesu/
│   │   │       └── sync/
│   │   │           └── route.ts
│   │   ├── attendance/
│   │   ├── dashboard/
│   │   ├── results/
│   │   ├── seating/
│   │   ├── settings/
│   │   ├── timetable/
│   │   ├── today/
│   │   └── page.tsx
│   ├── components/
│   │   ├── dashboard/
│   │   ├── layout/
│   │   ├── settings/
│   │   ├── studio/
│   │   └── ui/
│   └── lib/
│       ├── academic-utils.ts
│       ├── auth/
│       ├── hooks/
│       ├── pesu/
│       └── store/
├── .env.local
├── package.json
└── README.md
```

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/campusflow.git
cd campusflow
```

### 2. Install Node dependencies

```bash
npm install
```

### 3. Create Python virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
```

### 4. Install Python dependencies

```bash
python -m pip install pesuacademy lxml beautifulsoup4 html5lib
```

### 5. Create environment file

Create:

```txt
.env.local
```

Add:

```env
CAMPUSFLOW_PYTHON_PATH=/absolute/path/to/campusflow/.venv/bin/python
```

Example:

```env
CAMPUSFLOW_PYTHON_PATH=/home/your-name/Desktop/dashboard/campusflow/.venv/bin/python
```

### 6. Run the development server

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

---

## Build

```bash
npm run lint
npm run build
```

---

## PESU Sync Flow

CampusFlow uses a safe sync layer for PESU Academy data.

The Python script fetches raw PESU data, then normalizes it before sending it to the Next.js API route.

Only safe fields are returned to the frontend:

```ts
profile: {
  name,
  srn,
  pesuId,
  program,
  branch,
  semester,
  semesterNumber,
  section,
  photoDataUrl
}
```

```ts
attendance: [
  {
    code,
    name,
    attended,
    total,
    percentage
  }
]
```

```ts
courses: [
  {
    code,
    name,
    type,
    status,
    id
  }
]
```

Sensitive fields like password, contact number, Aadhaar number, address, and raw personal details are not exposed to the UI.

---

## Security Notes

* Do not commit `.env.local`
* Do not commit `.venv`
* Do not commit credentials
* PESU password is used only during sync
* Password should not be stored in localStorage
* Only safe normalized PESU data should be cached locally
* If credentials were ever pasted in logs or terminal output, change the PESU Academy password

Recommended `.gitignore` entries:

```gitignore
node_modules
.next
out
dist
.env
.env.local
.env.*.local
.venv
__pycache__
*.pyc
.DS_Store
```

---

## Current Status

Working:

* Landing/login UI
* Dashboard shell
* Safe PESU sync route
* Real PESU profile sync
* Real PESU attendance sync
* Real course sync
* Profile photo support
* Attendance page
* Dashboard page
* Results page
* Seating page
* Command palette
* Mobile navigation

In progress:

* Server-session based auth flow
* Real timetable endpoint exploration
* More stable production sync flow
* UI polishing and cleanup

---

## Future Improvements

* Server-side session based PESU sync
* Real timetable fetch support
* Better profile photo rendering
* Attendance history
* Subject-wise trend graphs
* Better result analytics
* Calendar integration
* Push notification reminders
* More secure production deployment flow

---

## Disclaimer

CampusFlow is an independent student project and is not officially affiliated with PES University.

PESU Academy data access depends on the available PESU Academy portal behavior and third-party wrapper compatibility.

---

## License

MIT License
