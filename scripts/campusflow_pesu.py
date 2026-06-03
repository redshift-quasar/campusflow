import asyncio
import inspect
import json
import os
import re
import sys
import time
import traceback
from typing import Any

from bs4 import BeautifulSoup
from pesuacademy import PESUAcademy


TIMETABLE_URL = "https://www.pesuacademy.com/Academy/s/studentProfilePESUAdmin"
RESULTS_URL = "https://www.pesuacademy.com/Academy/a/studentProfilePESU/getEsaAndIsaResultSemBySRN"

SEATING_URL = "https://www.pesuacademy.com/Academy/s/studentProfilePESUAdmin"

TIMETABLE_PARAMS = {
    "menuId": "669",
    "url": "studentProfilePESUAdmin",
    "controllerMode": "6415",
    "actionType": "5",
    "id": "0",
    "selectedData": "0",
}

SEATING_PARAMS = {
    "menuId": "655",
    "url": "studentProfilePESUAdmin",
    "controllerMode": "6404",
    "actionType": "5",
    "id": "0",
    "selectedData": "0",
}

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


def clean_text(value: Any):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def to_number_or_none(value: Any):
    if value is None or value == "":
        return None

    if isinstance(value, (int, float)):
        return value

    cleaned = re.sub(r"[^0-9.\-]", "", str(value))

    if not cleaned:
        return None

    try:
        parsed = float(cleaned)
        return int(parsed) if parsed.is_integer() else parsed
    except Exception:
        return None


def parse_first_number(value: Any):
    match = re.search(r"-?\d+(?:\.\d+)?", str(value or ""))

    if not match:
        return None

    return to_number_or_none(match.group(0))


def parse_credit_pair(value: str):
    numbers = re.findall(r"\d+(?:\.\d+)?", str(value or ""))

    if not numbers:
        return None, None

    first = to_number_or_none(numbers[0])
    second = to_number_or_none(numbers[1]) if len(numbers) > 1 else first

    return first, second


def get_clean_text(node: Any):
    if node is None:
        return ""

    try:
        return clean_text(node.get_text(" ", strip=True))
    except Exception:
        return clean_text(node)


def default_results():
    return {
        "semester": None,
        "description": "",
        "resultType": "unknown",
        "earnedCredits": None,
        "totalCredits": None,
        "sgpa": None,
        "cgpa": None,
        "courses": [],
    }


def unwrap_results_html(raw: Any):
    if raw is None:
        return ""

    if isinstance(raw, (dict, list)):
        raw = json.dumps(raw)

    text = str(raw or "").strip()

    if not text:
        return ""

    try:
        parsed = json.loads(text)

        if isinstance(parsed, str):
            return parsed

        if isinstance(parsed, dict):
            for key in ["html", "data", "result", "response", "content", "view"]:
                value = parsed.get(key)

                if isinstance(value, str) and ("isaEsaResult" in value or "<div" in value):
                    return value

            return json.dumps(parsed)

        if isinstance(parsed, list):
            for item in parsed:
                if isinstance(item, str) and ("isaEsaResult" in item or "<div" in item):
                    return item

                if isinstance(item, dict):
                    for value in item.values():
                        if isinstance(value, str) and ("isaEsaResult" in value or "<div" in value):
                            return value

            return json.dumps(parsed)
    except Exception:
        pass

    return text


def parse_labeled_number(text: str, label: str):
    match = re.search(rf"{re.escape(label)}\s*:?\s*(-?\d+(?:\.\d+)?)", text, re.I)

    if not match:
        return None

    return to_number_or_none(match.group(1))


def parse_results_description(text: str):
    match = re.search(
        r"ESA\s+Description\s*:?\s*(.*?)(?:\s+Earned\s+Credits|\s+SGPA|\s+CGPA|$)",
        text,
        re.I,
    )

    if not match:
        return ""

    return clean_text(match.group(1))


def parse_assessment_block(block: Any):
    title = get_clean_text(block.find("h6"))

    if not title:
        return None, None

    grade_node = block.select_one("span.f-size-2x-big")
    grade = get_clean_text(grade_node) or None

    if grade_node is not None:
        return None, grade

    mark_node = (
        block.select_one("span.dark-text.f-size-semi-big")
        or block.select_one("span.dark-text")
    )

    marks = parse_first_number(get_clean_text(mark_node))

    if marks is None:
        for span in block.find_all("span"):
            marks = parse_first_number(get_clean_text(span))

            if marks is not None:
                break

    max_marks = None
    max_match = re.search(r"/\s*(\d+(?:\.\d+)?)", get_clean_text(block))

    if max_match:
        max_marks = to_number_or_none(max_match.group(1))

    if marks is None:
        if title.upper() == "ESA":
            return {
                "name": title,
                "marks": None,
                "maxMarks": max_marks,
            }, grade

        return None, grade

    return {
        "name": title,
        "marks": marks,
        "maxMarks": max_marks,
    }, grade


def parse_course_results_from_header(header_info: Any):
    course_block = header_info.find_parent("div", class_="clearfix")

    if course_block is None:
        return None

    header = header_info.select_one("h6")

    if header is None:
        return None

    code_node = header.select_one("span.lbl-title-light")
    code_text = get_clean_text(code_node)
    code = re.sub(r"\s*-\s*$", "", code_text).strip()

    header_text = get_clean_text(header)
    name = header_text.replace(code_text, "", 1).strip()
    name = re.sub(r"^\s*-\s*", "", name).strip()

    credits_node = header_info.select_one(".text-right")
    credits, max_credits = parse_credit_pair(get_clean_text(credits_node))

    dashboard = course_block.select_one(".dashboard-info-bar")

    assessments = []
    grade = None

    if dashboard is not None:
        children = [
            child
            for child in dashboard.find_all("div", recursive=False)
            if getattr(child, "name", None) and child.find("h6")
        ]

        for child in children:
            assessment, assessment_grade = parse_assessment_block(child)

            if assessment is not None:
                assessments.append(assessment)

            if assessment_grade:
                grade = assessment_grade

    if not code and not name:
        return None

    return {
        "code": code,
        "name": name,
        "credits": credits,
        "maxCredits": max_credits,
        "grade": grade,
        "assessments": assessments,
    }


def parse_pesu_results_html(html: str):
    result = default_results()
    raw_html = unwrap_results_html(html)

    if not raw_html.strip():
        return result

    soup = BeautifulSoup(raw_html, "html.parser")
    wrapper = soup.select_one('div[id^="isaEsaResult_"]') or soup
    page_text = get_clean_text(wrapper)

    semester = parse_labeled_number(page_text, "Semester")

    if semester is not None:
        result["semester"] = int(semester)

    result["description"] = parse_results_description(page_text)

    credits_match = re.search(
        r"Earned\s+Credits\s*:?\s*(\d+(?:\.\d+)?)\s*/\s*(\d+(?:\.\d+)?)",
        page_text,
        re.I,
    )

    if credits_match:
        result["earnedCredits"] = to_number_or_none(credits_match.group(1))
        result["totalCredits"] = to_number_or_none(credits_match.group(2))

    result["sgpa"] = parse_labeled_number(page_text, "SGPA")
    result["cgpa"] = parse_labeled_number(page_text, "CGPA")

    courses = []

    for header_info in wrapper.select(".multiple-info-wrapper .header-info"):
        course = parse_course_results_from_header(header_info)

        if course is not None:
            courses.append(course)

    result["courses"] = courses

    return result

def default_seating():
    return {
        "items": [],
    }


def parse_pesu_seating_html(html: str):
    soup = BeautifulSoup(html or "", "html.parser")
    table = soup.select_one("table#seatinginfo")

    if table is None:
        return default_seating()

    items = []

    for row in table.select("tbody tr"):
        cells = [clean_text(cell.get_text(" ", strip=True)) for cell in row.find_all("td")]

        if len(cells) < 6:
            continue

        assessment, code, date, time_value, terminal, block = cells[:6]

        if not any([assessment, code, date, time_value, terminal, block]):
            continue

        items.append(
            {
                "assessment": assessment,
                "code": code,
                "date": date,
                "time": time_value,
                "terminal": terminal,
                "block": block,
                "subject": None,
            }
        )

    return {
        "items": items,
    }

def normalize_wrapper_assessment(raw: Any):
    data = serialize(raw)

    if not isinstance(data, dict):
        return None

    name = (
        data.get("name")
        or data.get("assessment")
        or data.get("title")
        or data.get("component")
        or data.get("type")
        or ""
    )

    raw_marks = (
        data.get("marks")
        or data.get("score")
        or data.get("obtained")
        or data.get("obtained_marks")
        or data.get("secured")
        or data.get("grade")
        or data.get("result")
        or data.get("value")
    )

    max_marks = (
        data.get("maxMarks")
        or data.get("max_marks")
        or data.get("maximum")
        or data.get("total")
        or data.get("out_of")
    )

    grade = None
    marks = to_number_or_none(raw_marks)

    if marks is None and isinstance(raw_marks, str):
        cleaned = clean_text(raw_marks)

        if cleaned and re.fullmatch(r"[A-Z][+-]?", cleaned):
            grade = cleaned

    if not name and marks is None and grade is None:
        return None

    return {
        "name": clean_text(name or "Assessment"),
        "marks": marks,
        "maxMarks": to_number_or_none(max_marks),
        "grade": grade,
    }


def fix_credit_value(value: Any):
    number = to_number_or_none(value)

    if number is None:
        return None

    # PESU wrapper sometimes serializes "5 / 5" into "55".
    # Course credits are normally small, so 22/44/55 are likely collapsed pairs.
    if isinstance(number, int) and number in {11, 22, 33, 44, 55, 66}:
        return number // 11

    return number


def normalize_credit_pair(raw_credits: Any, raw_max_credits: Any = None):
    credits, max_credits = parse_credit_pair(str(raw_credits))

    if credits is None:
        credits = fix_credit_value(raw_credits)
    else:
        credits = fix_credit_value(credits)

    if max_credits is None:
        second_credits, second_max_credits = parse_credit_pair(str(raw_max_credits))

        if second_credits is not None and second_max_credits is not None:
            max_credits = second_max_credits
        elif second_credits is not None:
            max_credits = second_credits
        else:
            max_credits = fix_credit_value(raw_max_credits)
    else:
        max_credits = fix_credit_value(max_credits)

    if max_credits is None:
        max_credits = credits

    return credits, max_credits


def normalize_wrapper_course(raw: Any):
    data = serialize(raw)

    if not isinstance(data, dict):
        return None

    code = (
        data.get("code")
        or data.get("course_code")
        or data.get("courseCode")
        or data.get("subject_code")
        or ""
    )

    name = (
        data.get("name")
        or data.get("title")
        or data.get("course")
        or data.get("course_name")
        or data.get("subject")
        or data.get("subject_name")
        or ""
    )

    grade = (
        data.get("grade")
        or data.get("esa_grade")
        or data.get("esaGrade")
        or data.get("result")
        or None
    )

    raw_credits = (
        data.get("credits")
        or data.get("credit")
        or data.get("earned_credits")
        or data.get("earnedCredits")
        or None
    )

    raw_max_credits = (
        data.get("maxCredits")
        or data.get("max_credits")
        or data.get("totalCredits")
        or data.get("total_credits")
        or raw_credits
    )

    credits, max_credits = normalize_credit_pair(raw_credits, raw_max_credits)

    raw_assessments = (
        data.get("assessments")
        or data.get("assessment")
        or data.get("isa")
        or data.get("marks")
        or []
    )

    assessments = []

    if isinstance(raw_assessments, dict):
        raw_assessments = list(raw_assessments.values())

    if isinstance(raw_assessments, list):
        for item in raw_assessments:
            assessment = normalize_wrapper_assessment(item)

            if assessment is None:
                continue

            assessment_name = assessment.get("name", "")

            if assessment.get("grade"):
                grade = assessment.get("grade")
                continue

            if assessment_name.upper() == "ESA":
                if assessment.get("marks") is None:
                    assessments.append(
                        {
                            "name": assessment.get("name"),
                            "marks": None,
                            "maxMarks": assessment.get("maxMarks"),
                        }
                    )
                    continue

            assessments.append(
                {
                    "name": assessment.get("name"),
                    "marks": assessment.get("marks"),
                    "maxMarks": assessment.get("maxMarks"),
                }
            )

    if not assessments:
        for key, label in [
            ("isa1", "ISA 1"),
            ("isa_1", "ISA 1"),
            ("isa2", "ISA 2"),
            ("isa_2", "ISA 2"),
            ("assignment", "Assignment"),
            ("final_isa", "FINAL ISA"),
            ("finalIsa", "FINAL ISA"),
        ]:
            if key in data:
                assessments.append(
                    {
                        "name": label,
                        "marks": to_number_or_none(data.get(key)),
                        "maxMarks": None,
                    }
                )

    if not code and not name:
        return None

    return {
        "code": clean_text(code),
        "name": clean_text(name),
        "credits": credits,
        "maxCredits": max_credits,
        "grade": clean_text(grade) if grade is not None else None,
        "assessments": assessments,
    }


def normalize_wrapper_results(raw: Any, semester: int | None):
    data = serialize(raw)
    result = default_results()
    result["semester"] = semester

    if not isinstance(data, dict):
        return result

    result["description"] = clean_text(
        data.get("description")
        or data.get("esa_description")
        or data.get("esaDescription")
        or data.get("exam")
        or ""
    )

    result["sgpa"] = to_number_or_none(data.get("sgpa") or data.get("SGPA"))
    result["cgpa"] = to_number_or_none(data.get("cgpa") or data.get("CGPA"))

    earned = (
        data.get("earnedCredits")
        or data.get("earned_credits")
        or data.get("earned")
        or None
    )

    total = (
        data.get("totalCredits")
        or data.get("total_credits")
        or data.get("credits")
        or None
    )

    result["earnedCredits"] = to_number_or_none(earned)
    result["totalCredits"] = to_number_or_none(total)

    raw_courses = (
        data.get("courses")
        or data.get("course_results")
        or data.get("courseResults")
        or data.get("results")
        or data.get("subjects")
        or []
    )

    courses = []

    if isinstance(raw_courses, dict):
        raw_courses = list(raw_courses.values())

    if isinstance(raw_courses, list):
        for item in raw_courses:
            course = normalize_wrapper_course(item)

            if course is not None:
                courses.append(course)

    result["courses"] = courses

    return result

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
        return {"ok": True, "data": serialize(data)}
    except Exception as error:
        return {"ok": False, "error": str(error)}


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

    return {
        "name": personal.get("name"),
        "srn": personal.get("srn"),
        "pesuId": personal.get("pesu_id"),
        "program": personal.get("program"),
        "branch": personal.get("branch"),
        "semester": personal.get("semester"),
        "semesterNumber": get_semester_number(personal.get("semester")),
        "section": personal.get("section"),
        "photoDataUrl": build_photo_data_url(personal.get("image")),
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


def normalize_attendance(raw_attendance: dict[str, Any], semester_number: int | None = None):
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


def normalize_courses(raw_courses: dict[str, Any], semester_number: int | None = None):
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

    return [course for course in normalized if course["code"] and course["name"]]


def extract_assigned_block(source: str, variable_name: str):
    start_match = re.search(rf"var\s+{re.escape(variable_name)}\s*=\s*", source)

    if not start_match:
        return None

    block_start = start_match.end()

    if block_start >= len(source):
        return None

    open_char = source[block_start]
    close_char = "]" if open_char == "[" else "}" if open_char == "{" else None

    if not close_char:
        return None

    depth = 0
    in_string = False
    escaped = False

    for index in range(block_start, len(source)):
        char = source[index]

        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False

            continue

        if char == '"':
            in_string = True
            continue

        if char == open_char:
            depth += 1

        if char == close_char:
            depth -= 1

            if depth == 0:
                return source[block_start:index + 1]

    return None


def parse_json_assignment(source: str, variable_name: str):
    block = extract_assigned_block(source, variable_name)

    if not block:
        return None

    try:
        return json.loads(block)
    except Exception:
        return None


def parse_days(source: str):
    days = parse_json_assignment(source, "days")

    if isinstance(days, list) and days:
        return days

    return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]


def format_pesu_time(value: str):
    clean = str(value or "").strip()
    match = re.match(r"^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$", clean, re.I)

    if not match:
        return clean

    return f"{match.group(1).zfill(2)}:{match.group(2)} {match.group(3).upper()}"


def extract_payload(value: str):
    parts = str(value or "").split("&&")

    return parts[-1].strip() if parts else ""


def parse_subject(value: str):
    payload = extract_payload(value)
    match = re.match(r"^([A-Z0-9]+(?:\([^)]+\))?)-(.+)$", payload)

    if not match:
        return {"code": "", "subject": payload.strip()}

    return {
        "code": match.group(1).strip(),
        "subject": match.group(2).strip(),
    }


def parse_faculty(value: str):
    return extract_payload(value)


def get_room_id(source: str):
    match = re.search(r'\$\("#rooms"\)\.val\((\d+)\)', source)

    return match.group(1) if match else None


def get_last_finalized_at(source: str):
    match = re.search(r"displayTTLastFinalizedDate\('([^']+)'\)", source)

    return match.group(1) if match else ""


def parse_pesu_timetable_script(source: str):
    template_details = parse_json_assignment(source, "timeTableTemplateDetailsJson")
    timetable_json = parse_json_assignment(source, "timeTableJson")
    days = parse_days(source)
    room_id = get_room_id(source)
    last_finalized_at = get_last_finalized_at(source)

    if not isinstance(template_details, list) or not isinstance(timetable_json, dict):
        return {
            "ok": False,
            "error": "Could not find PESU timetable objects in response.",
            "days": days,
            "roomId": room_id,
            "lastFinalizedAt": last_finalized_at,
            "slots": [],
        }

    active_slots = [
        slot
        for slot in template_details
        if isinstance(slot, dict) and slot.get("timeTableTemplateDetailsStatus") == 0
    ]

    active_slots.sort(key=lambda slot: slot.get("orderedBy") or 0)

    slot_map = {
        int(slot.get("orderedBy")): slot
        for slot in active_slots
        if slot.get("orderedBy") is not None
    }

    slots = []

    for key, values in timetable_json.items():
        key_match = re.match(r"^ttDivText_(\d+)_(\d+)_", key)

        if not key_match:
            continue

        day_index = int(key_match.group(1))
        slot_order = int(key_match.group(2))
        slot = slot_map.get(slot_order)

        if not slot or not isinstance(values, list):
            continue

        subject_entry = next(
            (value for value in values if str(value).startswith("ttSubject_")),
            None,
        )

        if not subject_entry:
            continue

        faculty_entries = [
            value for value in values if str(value).startswith("ttFaculty_")
        ]

        parsed_subject = parse_subject(subject_entry)
        faculties = [
            parse_faculty(value)
            for value in faculty_entries
            if parse_faculty(value)
        ]

        start_time = format_pesu_time(slot.get("startTime") or "")
        end_time = format_pesu_time(slot.get("endTime") or "")

        code = parsed_subject["code"]
        subject = parsed_subject["subject"]

        class_type = (
            "Lab"
            if "(LAB)" in code.upper() or "LAB" in subject.upper()
            else "Lecture"
        )

        slots.append(
            {
                "id": f"{day_index}-{slot_order}-{code}",
                "day": days[day_index - 1] if day_index - 1 < len(days) else f"Day {day_index}",
                "dayIndex": day_index,
                "slotOrder": slot_order,
                "time": f"{start_time} - {end_time}",
                "startTime": start_time,
                "endTime": end_time,
                "code": code,
                "subject": subject,
                "faculty": ", ".join(faculties),
                "faculties": faculties,
                "type": class_type,
                "room": "-",
                "roomId": room_id,
                "templateDetailsId": slot.get("timeTableTemplateDetailsId"),
            }
        )

    slots.sort(key=lambda item: (item["dayIndex"], item["slotOrder"]))

    return {
        "ok": True,
        "days": days,
        "roomId": room_id,
        "lastFinalizedAt": last_finalized_at,
        "slots": slots,
    }


def find_attr_by_name(obj: Any, names: list[str]):
    for name in names:
        if hasattr(obj, name):
            try:
                return getattr(obj, name)
            except Exception:
                pass

    return None


def find_internal_http_client(pesu: Any):
    roots = [
        pesu,
        find_attr_by_name(pesu, ["client", "_client", "scraper", "_scraper"]),
    ]

    for root in roots:
        if root is None:
            continue

        if hasattr(root, "get") and callable(getattr(root, "get")):
            return root

        for name in [
            "client",
            "_client",
            "session",
            "_session",
            "http",
            "_http",
            "http_client",
            "_http_client",
        ]:
            nested = find_attr_by_name(root, [name])

            if nested is not None and hasattr(nested, "get") and callable(getattr(nested, "get")):
                return nested

    return None


def find_csrf_token(pesu: Any):
    roots = [
        pesu,
        find_attr_by_name(pesu, ["client", "_client", "scraper", "_scraper"]),
    ]

    for root in roots:
        if root is None:
            continue

        for name in ["csrf_token", "_csrf_token", "csrf", "_csrf", "token", "_token"]:
            value = find_attr_by_name(root, [name])

            if isinstance(value, str) and value.strip():
                return value.strip()

    return None


def make_xhr_headers(pesu: Any):
    headers = {
        "x-requested-with": "XMLHttpRequest",
        "content-type": "application/x-www-form-urlencoded",
        "referer": "https://www.pesuacademy.com/Academy/s/studentProfilePESU",
    }

    csrf_token = find_csrf_token(pesu)

    if csrf_token:
        headers["x-csrf-token"] = csrf_token

    return headers


async def response_to_text(response: Any):
    if isinstance(response, str):
        return response

    if hasattr(response, "text"):
        text = response.text

        if inspect.isawaitable(text):
            return await text

        return text

    if hasattr(response, "content"):
        content = response.content

        if inspect.isawaitable(content):
            content = await content

        if isinstance(content, bytes):
            return content.decode("ISO-8859-1", errors="replace")

        return str(content)

    return str(response)


async def fetch_timetable_html(pesu: Any):
    http_client = find_internal_http_client(pesu)

    if http_client is None:
        raise RuntimeError("Could not find authenticated PESU HTTP client for timetable.")

    response = await maybe_await(
        http_client.get(
            TIMETABLE_URL,
            params={**TIMETABLE_PARAMS, "_": str(int(time.time() * 1000))},
            headers=make_xhr_headers(pesu),
        )
    )

    return await response_to_text(response)


async def fetch_results_html(pesu: Any):
    http_client = find_internal_http_client(pesu)

    if http_client is None:
        raise RuntimeError("Could not find authenticated PESU HTTP client for results.")

    response = await maybe_await(
        http_client.get(
            RESULTS_URL,
            params={"_": str(int(time.time() * 1000))},
            headers=make_xhr_headers(pesu),
        )
    )

    return await response_to_text(response)

async def fetch_seating_html(pesu: Any):
    http_client = find_internal_http_client(pesu)

    if http_client is None:
        raise RuntimeError("Could not find authenticated PESU HTTP client for seating.")

    response = await maybe_await(
        http_client.get(
            SEATING_URL,
            params={**SEATING_PARAMS, "_": str(int(time.time() * 1000))},
            headers=make_xhr_headers(pesu),
        )
    )

    return await response_to_text(response)

async def fetch_timetable(pesu: Any):
    html = await fetch_timetable_html(pesu)
    parsed = parse_pesu_timetable_script(html)

    if not parsed["ok"]:
        raise RuntimeError(parsed.get("error") or "Could not parse timetable.")

    return parsed


def determine_result_type(parsed, requested_semester):
    if not parsed.get("courses"):
        return "unknown"

    has_grades = any(c.get("grade") for c in parsed.get("courses", []))
    has_gpa = parsed.get("sgpa") is not None or parsed.get("cgpa") is not None
    has_assessment_marks = any(
        assessment.get("marks") is not None
        for course in parsed.get("courses", [])
        for assessment in course.get("assessments") or []
    )

    parsed_sem = parsed.get("semester")
    if parsed_sem and requested_semester and parsed_sem < requested_semester:
        return "previous"

    if has_grades or has_gpa:
        return "released"

    if has_assessment_marks:
        return "current"

    return "unknown"


async def fetch_results(pesu: Any, semester_number: int | None = None):
    html = await fetch_results_html(pesu)
    parsed = parse_pesu_results_html(html)

    html_course_count = len(parsed.get("courses") or [])

    if html_course_count > 0:
        parsed["resultType"] = determine_result_type(parsed, semester_number)
        if os.environ.get("CAMPUSFLOW_DEBUG_PESU") == "1":
            print(
                json.dumps(
                    {
                        "debugResultsSource": "html-endpoint",
                        "debugResultsHtmlLength": len(str(html or "")),
                        "debugHasIsaEsaResult": "isaEsaResult" in str(html or ""),
                        "debugHasMultipleInfoWrapper": "multiple-info-wrapper" in str(html or ""),
                        "debugHeaderInfoCount": str(html or "").count("header-info"),
                        "debugResultsCourseCount": html_course_count,
                        "debugSemester": parsed.get("semester"),
                    }
                ),
                file=sys.stderr,
            )

        return parsed

    # Fallback: the direct endpoint sometimes returns a tiny response in Python,
    # even though the browser receives the HTML fragment. Use the official wrapper.
    wrapper_errors = []
    max_semester = semester_number if semester_number and semester_number > 0 else 8

    for semester in range(max_semester, 0, -1):
        try:
            raw_result = await maybe_await(pesu.get_results(semester))
            normalized = normalize_wrapper_results(raw_result, semester)

            if normalized.get("courses"):
                normalized["resultType"] = determine_result_type(normalized, semester_number)
                if os.environ.get("CAMPUSFLOW_DEBUG_PESU") == "1":
                    print(
                        json.dumps(
                            {
                                "debugResultsSource": "wrapper-get-results",
                                "debugRequestedSemester": semester,
                                "debugResultsHtmlLength": len(str(html or "")),
                                "debugHasIsaEsaResult": "isaEsaResult" in str(html or ""),
                                "debugHasMultipleInfoWrapper": "multiple-info-wrapper" in str(html or ""),
                                "debugHeaderInfoCount": str(html or "").count("header-info"),
                                "debugResultsCourseCount": len(normalized.get("courses") or []),
                                "debugSemester": normalized.get("semester"),
                            }
                        ),
                        file=sys.stderr,
                    )

                return normalized
        except Exception as error:
            wrapper_errors.append(f"Sem {semester}: {error}")

    if os.environ.get("CAMPUSFLOW_DEBUG_PESU") == "1":
        print(
            json.dumps(
                {
                    "debugResultsSource": "empty",
                    "debugResultsHtmlLength": len(str(html or "")),
                    "debugHasIsaEsaResult": "isaEsaResult" in str(html or ""),
                    "debugHasMultipleInfoWrapper": "multiple-info-wrapper" in str(html or ""),
                    "debugHeaderInfoCount": str(html or "").count("header-info"),
                    "debugResultsCourseCount": 0,
                    "debugSemester": parsed.get("semester"),
                    "debugWrapperErrors": wrapper_errors[:3],
                }
            ),
            file=sys.stderr,
        )

    parsed["resultType"] = "unknown"
    return parsed

async def fetch_seating(pesu: Any):
    html = await fetch_seating_html(pesu)
    parsed = parse_pesu_seating_html(html)

    if os.environ.get("CAMPUSFLOW_DEBUG_PESU") == "1":
        print(
            json.dumps(
                {
                    "debugSeatingHtmlLength": len(str(html or "")),
                    "debugHasSeatingTable": "seatinginfo" in str(html or ""),
                    "debugSeatingItemCount": len(parsed.get("items") or []),
                }
            ),
            file=sys.stderr,
        )

    return parsed
async def main():
    pesu = None

    try:
        payload = json.loads(sys.stdin.read() or "{}")

        username = payload.get("username") or payload.get("srn")
        password = payload.get("password")
        requested_semester = payload.get("semester")

        if not username or not password:
            raise ValueError("Username and password are required.")

        pesu = await maybe_await(PESUAcademy.login(username=username, password=password))

        profile_result = await safe_call(lambda: pesu.get_profile())
        attendance_result = await safe_call(lambda: pesu.get_attendance())
        courses_result = await safe_call(lambda: pesu.get_courses())
        timetable_result = await safe_call(lambda: fetch_timetable(pesu))
        seating_result = await safe_call(lambda: fetch_seating(pesu))

        if not profile_result["ok"]:
            raise RuntimeError(profile_result.get("error") or "Could not fetch profile.")

        profile = normalize_profile(profile_result["data"])

        semester_number = (
            int(requested_semester)
            if requested_semester
            else profile.get("semesterNumber")
        )
        results_result = await safe_call(lambda: fetch_results(pesu, semester_number))
        attendance = []
        courses = []
        results = default_results()
        seating = default_seating()
        timetable = {
            "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            "roomId": None,
            "lastFinalizedAt": "",
            "slots": [],
        }

        if attendance_result["ok"]:
            attendance = normalize_attendance(attendance_result["data"], semester_number)

        if courses_result["ok"]:
            courses = normalize_courses(courses_result["data"], semester_number)

        if timetable_result["ok"]:
            timetable = timetable_result["data"]

        if results_result["ok"]:
            results = results_result["data"]
            
        if seating_result["ok"]:
            seating = seating_result["data"]

        print(
            json.dumps(
                {
                    "ok": True,
                    "source": "pesu",
                    "syncedAt": payload.get("syncedAt"),
                    "profile": profile,
                    "attendance": attendance,
                    "courses": courses,
                    "timetable": timetable,
                    "results": results,
                    "seating": seating,
                    "errors": {
                        "attendance": None if attendance_result["ok"] else attendance_result.get("error"),
                        "courses": None if courses_result["ok"] else courses_result.get("error"),
                        "timetable": None if timetable_result["ok"] else timetable_result.get("error"),
                        "results": None if results_result["ok"] else results_result.get("error"),
                        "seating": None if seating_result["ok"] else seating_result.get("error"),
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
