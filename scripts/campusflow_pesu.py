import asyncio
import inspect
import json
import re
import sys
import traceback
from typing import Any

from pesuacademy import PESUAcademy


SENSITIVE_KEYS = {
    "password",
    "token",
    "cookie",
    "session",
    "aadhar_no",
    "name_as_in_aadhar",
    "contact_no",
    "email_id",
    "parents",
    "address",
    "other_info",
    "qualifying_exam",
}


def serialize(value: Any):
    if value is None:
        return None

    if isinstance(value, (str, int, float, bool)):
        return value

    if isinstance(value, list):
        return [serialize(item) for item in value]

    if isinstance(value, tuple):
        return [serialize(item) for item in value]

    if isinstance(value, dict):
        return {
            str(key): serialize(item)
            for key, item in value.items()
            if str(key) not in SENSITIVE_KEYS
        }

    if hasattr(value, "model_dump"):
        return serialize(value.model_dump())

    if hasattr(value, "dict"):
        return serialize(value.dict())

    if hasattr(value, "__dict__"):
        return serialize(value.__dict__)

    return str(value)


async def maybe_await(value: Any):
    if inspect.isawaitable(value):
        return await value

    return value


async def safe_call(fn):
    try:
        data = await maybe_await(fn())

        return {
            "ok": True,
            "data": serialize(data),
        }
    except Exception as error:
        return {
            "ok": False,
            "error": str(error),
        }


def get_semester_number(value: str | None):
    if not value:
        return None

    match = re.search(r"\d+", str(value))

    if not match:
        return None

    return int(match.group(0))


def build_photo_data_url(raw_image: Any):
    if not isinstance(raw_image, str):
        return None

    clean_image = raw_image.strip()

    if not clean_image:
        return None

    if clean_image.startswith("data:image"):
        return clean_image

    return f"data:image/jpeg;base64,{clean_image}"


def normalize_profile(raw_profile: dict[str, Any]):
    personal = raw_profile.get("personal") or {}
    raw_image = personal.get("image")

    return {
        "name": personal.get("name"),
        "srn": personal.get("srn"),
        "pesuId": personal.get("pesu_id"),
        "program": personal.get("program"),
        "branch": personal.get("branch"),
        "semester": personal.get("semester"),
        "semesterNumber": get_semester_number(personal.get("semester")),
        "section": personal.get("section"),
        "photoDataUrl": build_photo_data_url(raw_image),
    }


def choose_latest_semester_key(raw_data: dict[str, Any]):
    numeric_keys = []

    for key in raw_data.keys():
        try:
            numeric_keys.append(int(key))
        except Exception:
            pass

    if not numeric_keys:
        return None

    return str(max(numeric_keys))


def normalize_attendance(
    raw_attendance: dict[str, Any],
    semester_number: int | None = None,
):
    if not isinstance(raw_attendance, dict):
        return []

    selected_semester = str(semester_number) if semester_number else None

    if selected_semester is None or selected_semester not in raw_attendance:
        selected_semester = choose_latest_semester_key(raw_attendance)

    if selected_semester is None:
        return []

    subjects = raw_attendance.get(selected_semester, [])

    normalized = []

    for subject in subjects:
        if not isinstance(subject, dict):
            continue

        attendance = subject.get("attendance") or {}

        if not isinstance(attendance, dict):
            attendance = {}

        normalized.append(
            {
                "code": subject.get("code") or "",
                "name": subject.get("title") or subject.get("name") or "",
                "attended": attendance.get("attended") or 0,
                "total": attendance.get("total") or 0,
                "percentage": attendance.get("percentage") or 0,
                "id": subject.get("id"),
            }
        )

    return [
        subject
        for subject in normalized
        if subject["code"] and subject["name"] and subject["total"] >= 0
    ]


def normalize_courses(
    raw_courses: dict[str, Any],
    semester_number: int | None = None,
):
    if not isinstance(raw_courses, dict):
        return []

    selected_semester = str(semester_number) if semester_number else None

    if selected_semester is None or selected_semester not in raw_courses:
        selected_semester = choose_latest_semester_key(raw_courses)

    if selected_semester is None:
        return []

    courses = raw_courses.get(selected_semester, [])

    normalized = []

    for course in courses:
        if not isinstance(course, dict):
            continue

        normalized.append(
            {
                "code": course.get("code") or "",
                "name": course.get("title") or course.get("name") or "",
                "type": course.get("type"),
                "status": course.get("status"),
                "id": course.get("id"),
            }
        )

    return [
        course
        for course in normalized
        if course["code"] and course["name"]
    ]


async def main():
    pesu = None

    try:
        payload = json.loads(sys.stdin.read() or "{}")

        username = payload.get("username") or payload.get("srn")
        password = payload.get("password")
        requested_semester = payload.get("semester")

        if not username or not password:
            raise ValueError("Username and password are required.")

        pesu = await maybe_await(
            PESUAcademy.login(username=username, password=password)
        )

        profile_result = await safe_call(lambda: pesu.get_profile())
        attendance_result = await safe_call(lambda: pesu.get_attendance())
        courses_result = await safe_call(lambda: pesu.get_courses())

        if not profile_result["ok"]:
            raise RuntimeError(profile_result.get("error") or "Could not fetch profile.")

        profile = normalize_profile(profile_result["data"])

        semester_number = (
            int(requested_semester)
            if requested_semester
            else profile.get("semesterNumber")
        )

        attendance = []
        courses = []

        if attendance_result["ok"]:
            attendance = normalize_attendance(
                attendance_result["data"],
                semester_number,
            )

        if courses_result["ok"]:
            courses = normalize_courses(
                courses_result["data"],
                semester_number,
            )

        print(
            json.dumps(
                {
                    "ok": True,
                    "source": "pesu",
                    "syncedAt": payload.get("syncedAt"),
                    "profile": profile,
                    "attendance": attendance,
                    "courses": courses,
                    "errors": {
                        "attendance": None
                        if attendance_result["ok"]
                        else attendance_result.get("error"),
                        "courses": None
                        if courses_result["ok"]
                        else courses_result.get("error"),
                    },
                }
            )
        )

    except Exception as error:
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": str(error),
                    "trace": traceback.format_exc(limit=3),
                }
            )
        )
        sys.exit(1)

    finally:
        if pesu is not None:
            close_method = getattr(pesu, "close", None)

            if callable(close_method):
                await maybe_await(close_method())


if __name__ == "__main__":
    asyncio.run(main())