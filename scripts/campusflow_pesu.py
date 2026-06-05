import asyncio
import inspect
import json
import os
import re
import sys
import time
import traceback
from html import unescape
from datetime import datetime, timedelta
from typing import Any
from urllib.parse import unquote

from bs4 import BeautifulSoup
from pesuacademy import PESUAcademy


PORTAL_HOME_URL = "https://www.pesuacademy.com/Academy/s/studentProfilePESU"
PORTAL_ADMIN_URL = "https://www.pesuacademy.com/Academy/s/studentProfilePESUAdmin"
TIMETABLE_URL = "https://www.pesuacademy.com/Academy/s/studentProfilePESUAdmin"
RESULTS_URL = "https://www.pesuacademy.com/Academy/a/studentProfilePESU/getEsaAndIsaResultSemBySRN"
CURRENT_RESULTS_URL = "https://www.pesuacademy.com/Academy/s/studentProfilePESUAdmin"

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


CALENDAR_PROBE_KEYWORDS = [
    "calendar",
    "academic calendar",
    "holiday",
    "holidays",
    "event",
    "events",
    "semester",
    "isa",
    "esa",
    "assessment",
    "exam",
    "examination",
    "last working day",
]


CALENDAR_PARAMS = {
    "menuId": "668",
    "url": "studentProfilePESUAdmin",
    "controllerMode": "6413",
    "actionType": "5",
    "id": "0",
    "selectedData": "0",
}

CURRENT_RESULTS_PARAMS = {
    "controllerMode": "6402",
    "actionType": "8",
    "menuId": "652",
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


def is_missing_text(value: Any):
    return clean_text(value).upper() in {
        "",
        "NA",
        "N/A",
        "NULL",
        "NONE",
        "TAL",
        "UNDEFINED",
    }


def to_number_or_none(value: Any):
    if value is None or value == "":
        return None

    if isinstance(value, str) and is_missing_text(value):
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


def parse_credit_pair(value: Any):
    if value is None:
        return None, None

    text = get_clean_text(value)
    earned = None

    if hasattr(value, "select_one"):
        earned_span = value.select_one(".f-size-semi-big")

        if earned_span is not None:
            earned = to_number_or_none(get_clean_text(earned_span))

    pair_match = re.search(
        r"(?:Credits\s*:?\s*)?(\d+(?:\.\d+)?)\s*/\s*(\d+(?:\.\d+)?)",
        text,
        re.I,
    )

    if pair_match:
        return (
            to_number_or_none(pair_match.group(1)),
            to_number_or_none(pair_match.group(2)),
        )

    slash_match = re.search(r"/\s*(\d+(?:\.\d+)?)", text)

    if earned is not None and slash_match:
        return earned, to_number_or_none(slash_match.group(1))

    numbers = re.findall(r"\d+(?:\.\d+)?", text)

    if not numbers:
        return earned, None

    first = earned if earned is not None else to_number_or_none(numbers[0])
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
    grade = None if is_missing_text(grade) else grade

    if grade_node is not None:
        return None, grade

    mark_node = (
        block.select_one("span.dark-text.f-size-semi-big")
        or block.select_one("span.dark-text")
        or block.select_one("span.f-size-semi-big")
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

    header = header_info.select_one("h6") or header_info

    code_node = header.select_one("span.lbl-title-light")
    code_text = get_clean_text(code_node)
    code = re.sub(r"\s*-\s*$", "", code_text).strip()

    header_text = get_clean_text(header)
    name = header_text.replace(code_text, "", 1).strip()
    name = re.sub(r"^\s*-\s*", "", name).strip()

    credits_node = header_info.select_one(".text-right")
    credits, max_credits = parse_credit_pair(credits_node)

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

        if not is_missing_text(cleaned) and re.fullmatch(r"[A-Z][+-]?", cleaned):
            grade = cleaned

    if not name and marks is None and grade is None:
        return None

    return {
        "name": clean_text(name or "Assessment"),
        "marks": marks,
        "maxMarks": to_number_or_none(max_marks),
        "grade": None if is_missing_text(grade) else grade,
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
        "grade": clean_text(grade) if not is_missing_text(grade) else None,
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


def normalize_attendance_count(value: Any):
    number = to_number_or_none(value)

    if number is None:
        return 0

    return max(0, number)


def calculate_attendance_percentage(attended: Any, total: Any):
    attended_count = normalize_attendance_count(attended)
    total_count = normalize_attendance_count(total)

    if total_count <= 0:
        return 0

    percentage = (attended_count / total_count) * 100
    clamped_percentage = min(100, max(0, percentage))

    return round(clamped_percentage, 2)


def numeric_text(value: Any):
    text = clean_text(value)

    if not re.fullmatch(r"\d+", text):
        return None

    return int(text)


def is_plausible_semid(value: int | None):
    return value is not None and 100 <= value <= 9999


def append_semid_candidate(candidates: list[int], value: Any):
    number = numeric_text(value)

    if is_plausible_semid(number):
        candidates.append(number)


def normalize_semid_html(html: str):
    text = str(html or "")

    for _ in range(3):
        decoded = unquote(unescape(text))

        if decoded == text:
            break

        text = decoded

    text = re.sub(r"\\u003[dD]", "=", text)
    text = re.sub(r"\\u003[aA]", ":", text)
    text = re.sub(r"\\u0026", "&", text, flags=re.I)

    return text.replace('\\"', '"').replace("\\'", "'")


def collect_semid_candidates(value: Any, candidates: list[int], key_path: str = ""):
    if value is None:
        return

    if isinstance(value, dict):
        for key, item in value.items():
            raw_key = str(key)
            key_text = raw_key.lower()
            next_key_path = f"{key_path}.{key_text}" if key_path else key_text

            if re.search(r"(?:semid|semesterid|semester[_-]?id)$", key_text):
                append_semid_candidate(candidates, raw_key)

            if re.search(
                r"(?:semid|sem[_-]?id|semesterid|semester[_-]?id|batchclassid|batch_class_id|batch[_-]?class[_-]?id)$",
                key_text,
            ):
                if isinstance(item, list):
                    for nested_item in item:
                        append_semid_candidate(candidates, nested_item)
                else:
                    append_semid_candidate(candidates, item)

            collect_semid_candidates(item, candidates, next_key_path)

        return

    if isinstance(value, list):
        for item in value:
            collect_semid_candidates(item, candidates, key_path)

        return

    if isinstance(value, str):
        for match in re.finditer(
            r"\b(?:semid|sem[_-]?id|semesterid|semester[_-]?id|batchclassid|batch_class_id|batch[_-]?class[_-]?id)\b\s*[:=]\s*['\"]?(\d{3,6})",
            value,
            re.I,
        ):
            number = int(match.group(1))

            if is_plausible_semid(number):
                candidates.append(number)


def extract_semids_from_html(html: str):
    candidates = []

    if not html:
        return candidates

    source = normalize_semid_html(html)

    for pattern in [
        r"\b['\"]?semid['\"]?\s*[=:]\s*['\"]?(\d{3,6})\b",
        r"\b['\"]?sem[_-]?id['\"]?\s*[=:]\s*['\"]?(\d{3,6})\b",
        r"\b['\"]?semester[_-]?id['\"]?\s*[=:]\s*['\"]?(\d{3,6})\b",
        r"\b['\"]?batch(?:[_-]?class)?[_-]?id['\"]?\s*[=:]\s*['\"]?(\d{3,6})\b",
        r"\bname\s*=\s*['\"]semid['\"][^>]{0,220}\bvalue\s*=\s*['\"]?(\d{3,6})\b",
        r"\bid\s*=\s*['\"]semid['\"][^>]{0,220}\bvalue\s*=\s*['\"]?(\d{3,6})\b",
        r"\bdata-sem(?:ester)?-?id\s*=\s*['\"]?(\d{3,6})\b",
        r"\bvalue\s*=\s*['\"]?(\d{3,6})['\"]?[^>]{0,220}\b(?:name|id|data-[\w-]*)\s*=\s*['\"][^'\"]*(?:semid|sem[-_]?id|semester[-_]?id)",
        r"\b(?:semid|sem[-_]?id|semester[-_]?id)[^>]{0,220}\bvalue\s*=\s*['\"]?(\d{3,6})\b",
        r"\b(?:getResultSem|getEsaIsaResult|getEsaAndIsaResult|showResultSem)\s*\(\s*['\"]?(\d{3,6})\b",
        r"\b(?:get|show|handle)[A-Za-z0-9_]*(?:Result|Isa|ISA|Esa|ESA|Sem|Semester)[A-Za-z0-9_]*\s*\(\s*['\"]?(\d{3,6})\b",
        r"\bhandle[A-Za-z0-9_]*\s*\(\s*['\"]?(\d{3,6})['\"]?[\s\S]{0,300}?controllerMode\s*[=:,]\s*['\"]?6402\b",
        r"controllerMode\s*[=:]\s*['\"]?6402[\s\S]{0,300}?actionType\s*[=:]\s*['\"]?8[\s\S]{0,300}?semid\s*[=:]\s*['\"]?(\d{3,6})\b",
        r"semid\s*[=:]\s*['\"]?(\d{3,6})[\s\S]{0,300}?controllerMode\s*[=:]\s*['\"]?6402[\s\S]{0,300}?actionType\s*[=:]\s*['\"]?8\b",
    ]:
        for match in re.finditer(pattern, source, re.I):
            append_semid_candidate(candidates, match.group(1))

    try:
        soup = BeautifulSoup(source, "html.parser")

        for node in soup.find_all(True):
            attrs = node.attrs or {}
            context_parts = [get_clean_text(node)]

            for attr_name, attr_value in attrs.items():
                context_parts.append(str(attr_name))
                if isinstance(attr_value, list):
                    context_parts.extend(str(item) for item in attr_value)
                else:
                    context_parts.append(str(attr_value))

            context = " ".join(context_parts).lower()

            for attr_name, attr_value in attrs.items():
                attr_key = str(attr_name).lower()
                attr_values = attr_value if isinstance(attr_value, list) else [attr_value]

                for item in attr_values:
                    if re.fullmatch(
                        r"(?:semid|sem[-_]?id|semester[-_]?id|data-semid|data-sem[-_]?id|data-semester[-_]?id|batch(?:[-_]?class)?[-_]?id)",
                        attr_key,
                        re.I,
                    ):
                        append_semid_candidate(candidates, item)

            value = (
                attrs.get("value")
                or attrs.get("data-value")
                or attrs.get("data-id")
                or attrs.get("data-sem-id")
                or attrs.get("data-semid")
                or attrs.get("data-semester-id")
            )
            value_number = numeric_text(value)

            if is_plausible_semid(value_number) and re.search(
                r"(?:semid|sem[-_\s]?id|semester|batch|class)",
                context,
                re.I,
            ):
                candidates.append(value_number)
    except Exception:
        pass

    return candidates


def parse_semid_candidates_from_html(html: str):
    return [str(candidate) for candidate in unique_semid_candidates(extract_semids_from_html(html))]


def unique_semid_candidates(candidates: list[int]):
    return sorted(
        {
            candidate
            for candidate in candidates
            if is_plausible_semid(candidate)
        },
        reverse=True,
    )


def get_safe_debug_keys(value: Any):
    if not isinstance(value, dict):
        return []

    return [str(key) for key in list(value.keys())[:20]]


def debug_log(payload: dict[str, Any]):
    if os.environ.get("CAMPUSFLOW_DEBUG_PESU") != "1":
        return

    print(json.dumps(payload), file=sys.stderr)


def debug_semid_context(html: str, source: str | None = None):
    if os.environ.get("CAMPUSFLOW_DEBUG_PESU") != "1":
        return

    normalized = normalize_semid_html(html)
    contexts = []
    lower = normalized.lower()
    start = 0

    while True:
        index = lower.find("semid", start)

        if index == -1:
            break

        left = max(0, index - 90)
        right = min(len(normalized), index + 140)
        snippet = normalized[left:right]
        snippet = re.sub(r"[A-Za-z0-9+/=_\-.]{32,}", "[redacted-token]", snippet)
        snippet = re.sub(
            r"(?i)\b(password|token|csrf|cookie|session)\b\s*[:=]\s*['\"]?[^'\"\s>]+",
            r"\1=[redacted]",
            snippet,
        )
        contexts.append(clean_text(snippet)[:220])
        start = index + 5

        if len(contexts) >= 5:
            break

    payload = {"debugSemidContextSnippets": contexts}

    if source:
        payload["debugSemidShellSource"] = source

    debug_log(payload)


def get_current_semid_candidates(*sources):
    named_candidates = []

    for source in sources:
        if isinstance(source, dict):
            collect_semid_candidates(source, named_candidates)
        elif isinstance(source, str):
            named_candidates.extend(extract_semids_from_html(source))

    return unique_semid_candidates(named_candidates)


def get_rejected_course_id_candidates(*sources):
    rejected = []

    for source in sources:
        collect_course_id_candidates(source, rejected)

    return sorted(set(rejected), reverse=True)


def collect_course_id_candidates(value: Any, candidates: list[int]):
    if value is None:
        return

    if isinstance(value, dict):
        for key, item in value.items():
            key_text = str(key).lower()

            if key_text in {"id", "courseid", "course_id", "subjectid", "subject_id"}:
                number = numeric_text(item)

                if number is not None and number >= 10000:
                    candidates.append(number)

            collect_course_id_candidates(item, candidates)

        return

    if isinstance(value, list):
        for item in value:
            collect_course_id_candidates(item, candidates)


def choose_current_semid(*sources):
    candidates = get_current_semid_candidates(*sources)

    return str(candidates[0]) if candidates else None


def normalize_semid_candidates(value: Any):
    if value is None:
        return []

    raw_values = value if isinstance(value, list) else [value]
    candidates = []
    seen = set()

    for item in raw_values:
        number = numeric_text(item)

        if is_plausible_semid(number) and number not in seen:
            candidates.append(number)
            seen.add(number)

    return candidates


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

        attended = normalize_attendance_count(attendance.get("attended"))
        total = normalize_attendance_count(attendance.get("total"))

        normalized.append(
            {
                "code": subject.get("code") or "",
                "name": subject.get("title") or subject.get("name") or "",
                "attended": attended,
                "total": total,
                "percentage": calculate_attendance_percentage(attended, total),
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
    semester_ids = sorted(set(str(value) for value in extract_semids_from_html(source)))
    current_semid = choose_current_semid(source)

    if not isinstance(template_details, list) or not isinstance(timetable_json, dict):
        return {
            "ok": False,
            "error": "Could not find PESU timetable objects in response.",
            "days": days,
            "roomId": room_id,
            "currentSemid": current_semid,
            "semesterIds": semester_ids,
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
        "currentSemid": current_semid,
        "semesterIds": semester_ids,
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




def redact_probe_text(value: Any):
    text = clean_text(value)

    if not text:
        return ""

    text = re.sub(
        r"(?i)\b(password|token|csrf|cookie|session)\b\s*[:=]\s*['\"]?[^'\"\s>]+",
        r"\1=[redacted]",
        text,
    )
    text = re.sub(r"[A-Za-z0-9+/=_\-.]{48,}", "[redacted-token]", text)
    text = re.sub(r"\b[A-Z]{3}\d{2}[A-Z]{2}\d{3}\b", "[redacted-srn]", text)
    text = re.sub(r"\b\d{10}\b", "[redacted-phone]", text)
    text = re.sub(
        r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}",
        "[redacted-email]",
        text,
    )

    return text[:500]


def collect_keyword_snippets(source: str, limit: int = 15):
    normalized = clean_text(source)
    lower = normalized.lower()
    snippets = []

    for keyword in CALENDAR_PROBE_KEYWORDS:
        start = 0

        while True:
            index = lower.find(keyword.lower(), start)

            if index == -1:
                break

            left = max(0, index - 180)
            right = min(len(normalized), index + 300)
            snippets.append(redact_probe_text(normalized[left:right]))

            start = index + len(keyword)

            if len(snippets) >= limit:
                return snippets

    return snippets


def collect_calendar_like_nodes(html: str, limit: int = 30):
    hits = []

    try:
        soup = BeautifulSoup(html or "", "html.parser")

        for node in soup.find_all(True):
            text = get_clean_text(node)

            attrs = []
            for key, value in (node.attrs or {}).items():
                attrs.append(f"{key}={value}")

            context = clean_text(f"{node.name} {text} {' '.join(attrs)}")

            if not context:
                continue

            if re.search(
                r"calendar|academic|holiday|event|semester|isa|esa|exam|assessment",
                context,
                re.I,
            ):
                hits.append(redact_probe_text(context))

            if len(hits) >= limit:
                break
    except Exception as error:
        hits.append(f"Could not parse nodes: {error}")

    return hits


def collect_possible_calendar_params(html: str, limit: int = 30):
    normalized = normalize_semid_html(html or "")
    hits = []

    patterns = [
        r"menuId\s*[:=]\s*['\"]?(\d{2,6})['\"]?[\s\S]{0,240}?(?:calendar|holiday|event|semester|isa|esa|exam|assessment)",
        r"(?:calendar|holiday|event|semester|isa|esa|exam|assessment)[\s\S]{0,240}?menuId\s*[:=]\s*['\"]?(\d{2,6})['\"]?",
        r"controllerMode\s*[:=]\s*['\"]?(\d{2,6})['\"]?[\s\S]{0,240}?(?:calendar|holiday|event|semester|isa|esa|exam|assessment)",
        r"(?:calendar|holiday|event|semester|isa|esa|exam|assessment)[\s\S]{0,240}?controllerMode\s*[:=]\s*['\"]?(\d{2,6})['\"]?",
        r"actionType\s*[:=]\s*['\"]?(\d{1,3})['\"]?[\s\S]{0,240}?(?:calendar|holiday|event|semester|isa|esa|exam|assessment)",
    ]

    for pattern in patterns:
        for match in re.finditer(pattern, normalized, re.I):
            left = max(0, match.start() - 180)
            right = min(len(normalized), match.end() + 260)
            hits.append(redact_probe_text(normalized[left:right]))

            if len(hits) >= limit:
                return hits

    return hits


async def fetch_portal_calendar_probe(pesu: Any):
    http_client = find_internal_http_client(pesu)

    if http_client is None:
        raise RuntimeError("Could not find authenticated PESU HTTP client for calendar probe.")

    headers = make_xhr_headers(pesu)

    candidate_requests = [
        {
            "name": "student-profile",
            "method": "get",
            "url": PORTAL_HOME_URL,
            "params": {"_": str(int(time.time() * 1000))},
        },
        {
            "name": "student-profile-admin",
            "method": "get",
            "url": PORTAL_ADMIN_URL,
            "params": {"_": str(int(time.time() * 1000))},
        },
        {
            "name": "timetable-menu-neighbourhood",
            "method": "get",
            "url": PORTAL_ADMIN_URL,
            "params": {
                "menuId": "669",
                "url": "studentProfilePESUAdmin",
                "controllerMode": "6415",
                "actionType": "5",
                "id": "0",
                "selectedData": "0",
                "_": str(int(time.time() * 1000)),
            },
        },
        {
            "name": "portal-calendar-menu-668",
            "method": "get",
            "url": PORTAL_ADMIN_URL,
            "params": {
                **CALENDAR_PARAMS,
                "_": str(int(time.time() * 1000)),
            },
        },
    ]

    results = []

    for candidate in candidate_requests:
        try:
            if candidate["method"] == "post" and hasattr(http_client, "post"):
                response = await maybe_await(
                    http_client.post(
                        candidate["url"],
                        data=candidate.get("data"),
                        headers=headers,
                    )
                )
            else:
                response = await maybe_await(
                    http_client.get(
                        candidate["url"],
                        params=candidate.get("params"),
                        headers=headers,
                    )
                )

            html = await response_to_text(response)
            normalized = normalize_semid_html(html)
            lower = normalized.lower()

            results.append(
                {
                    "source": candidate["name"],
                    "url": candidate["url"],
                    "params": candidate.get("params"),
                    "htmlLength": len(str(html or "")),
                    "hasCalendarText": any(
                        keyword.lower() in lower for keyword in CALENDAR_PROBE_KEYWORDS
                    ),
                    "calendarHits": collect_keyword_snippets(normalized),
                    "linkLikeHits": collect_calendar_like_nodes(html),
                    "possibleParams": collect_possible_calendar_params(normalized),
                }
            )
        except Exception as error:
            results.append(
                {
                    "source": candidate["name"],
                    "url": candidate["url"],
                    "params": candidate.get("params"),
                    "error": str(error),
                }
            )

    return results

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


async def fetch_current_results_html(pesu: Any, semid: str):
    http_client = find_internal_http_client(pesu)

    if http_client is None or not hasattr(http_client, "post"):
        raise RuntimeError("Could not find authenticated PESU HTTP client for current results.")

    response = await maybe_await(
        http_client.post(
            CURRENT_RESULTS_URL,
            data={**CURRENT_RESULTS_PARAMS, "semid": str(semid)},
            headers=make_xhr_headers(pesu),
        )
    )

    return await response_to_text(response)


async def fetch_current_results_shell_html(pesu: Any):
    http_client = find_internal_http_client(pesu)

    if http_client is None:
        return []

    attempts = []
    headers = make_xhr_headers(pesu)

    if hasattr(http_client, "post"):
        attempts.append(
            (
                "post-results-shell",
                lambda: http_client.post(
                    CURRENT_RESULTS_URL,
                    data={
                        **CURRENT_RESULTS_PARAMS,
                        "actionType": "5",
                    },
                    headers=headers,
                ),
            )
        )

    attempts.extend(
        [
            (
                "get-results-shell-admin",
                lambda: http_client.get(
                    CURRENT_RESULTS_URL,
                    params={
                        **CURRENT_RESULTS_PARAMS,
                        "actionType": "5",
                        "_": str(int(time.time() * 1000)),
                    },
                    headers=headers,
                ),
            ),
            (
                "get-student-profile-shell",
                lambda: http_client.get(
                    "https://www.pesuacademy.com/Academy/s/studentProfilePESU",
                    params={"_": str(int(time.time() * 1000))},
                    headers=headers,
                ),
            ),
        ]
    )

    responses = []

    for source, call in attempts:
        try:
            response = await maybe_await(call())
            html = await response_to_text(response)
            responses.append((source, html))
        except Exception as error:
            debug_log(
                {
                    "debugSemidShellSource": source,
                    "debugSemidShellError": str(error),
                }
            )

    return responses


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



def default_calendar():
    return {
        "source": "pesu-academy",
        "semesterId": None,
        "name": "",
        "startDate": "",
        "endDate": "",
        "calendarStatus": "unknown",
        "usableForPrediction": False,
        "blockedDateKeys": [],
        "events": [],
    }


def parse_portal_calendar_datetime(value: Any):
    text = clean_text(value)

    if not text:
        return None

    # PESU portal usually sends dates like: Aug 15, 2025, 12:00:00 AM
    for fmt in [
        "%b %d, %Y, %I:%M:%S %p",
        "%b %d, %Y",
        "%B %d, %Y, %I:%M:%S %p",
        "%B %d, %Y",
    ]:
        try:
            return datetime.strptime(text, fmt)
        except Exception:
            pass

    return None


def to_date_key_from_datetime(value: datetime | None):
    if value is None:
        return ""

    return value.strftime("%Y-%m-%d")


def normalize_portal_calendar_end_date(start_dt: datetime | None, end_dt: datetime | None):
    if start_dt is None or end_dt is None:
        return ""

    # FullCalendar style: endDate is exclusive. Aug 15 -> Aug 16 means one-day event.
    inclusive_end = end_dt - timedelta(days=1)

    if inclusive_end <= start_dt:
        return ""

    return to_date_key_from_datetime(inclusive_end)


def get_today_date_key():
    return datetime.now().strftime("%Y-%m-%d")


def get_calendar_status(start_date: str, end_date: str):
    today = get_today_date_key()

    if not start_date or not end_date:
        return "unknown"

    if end_date < today:
        return "past"

    if start_date > today:
        return "upcoming"

    return "active"


def expand_date_range(start_date: str, end_date: str | None = None):
    if not start_date:
        return []

    if not end_date or end_date == start_date:
        return [start_date]

    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
    except Exception:
        return [start_date]

    if end < start:
        return [start_date]

    dates = []
    cursor = start

    while cursor <= end:
        dates.append(cursor.strftime("%Y-%m-%d"))
        cursor += timedelta(days=1)

    return dates


def is_truthy_portal_flag(value: Any):
    return str(value).strip().lower() in {"1", "true", "yes", "y"}


def classify_portal_calendar_event(raw_event: dict[str, Any]):
    name = clean_text(raw_event.get("name"))
    description = clean_text(raw_event.get("description"))
    event_type = clean_text(raw_event.get("eventType"))
    text = f"{name} {description} {event_type}".lower()

    if (
        "last working day" in text
        or "lwd" in text
        or "semester end" in text
        or "end of classes" in text
    ):
        return "semester-end"

    if (
        "class commencement" in text
        or "commencement of classes" in text
        or "semester start" in text
        or "start of classes" in text
    ):
        return "semester-start"

    if "isa" in text or "internal assessment" in text:
        return "isa"

    if "esa" in text or "end semester assessment" in text or "end sem" in text:
        return "esa"

    if "exam" in text or "examination" in text:
        return "exam"

    if is_truthy_portal_flag(raw_event.get("isHoliday")):
        return "holiday"

    if (
        "festival" in text
        or "holiday" in text
        or "vacation" in text
        or "break" in text
    ):
        return "holiday"

    if is_truthy_portal_flag(raw_event.get("isClass")):
        return "event"

    return "event"


def extract_json_array_from_portal_calendar_html(html: str):
    source = str(html or "")
    marker = "JSON.parse(JSON.stringify("
    marker_index = source.find(marker)

    if marker_index == -1:
        return None

    array_start = source.find("[", marker_index + len(marker))

    if array_start == -1:
        return None

    depth = 0
    in_string = False
    escaped = False

    for index in range(array_start, len(source)):
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

        if char == "[":
            depth += 1

        if char == "]":
            depth -= 1

            if depth == 0:
                return source[array_start:index + 1]

    return None


def parse_portal_calendar_html(html: str):
    json_array = extract_json_array_from_portal_calendar_html(html)

    if not json_array:
        return default_calendar()

    try:
        raw_events = json.loads(json_array)
    except Exception:
        return default_calendar()

    if not isinstance(raw_events, list):
        return default_calendar()

    events = []
    calendar_names = []
    calendar_ids = []

    for item in raw_events:
        if not isinstance(item, dict):
            continue

        start_dt = parse_portal_calendar_datetime(item.get("startDate"))
        end_dt = parse_portal_calendar_datetime(item.get("endDate"))
        start_date = to_date_key_from_datetime(start_dt)

        if not start_date:
            continue

        end_date = normalize_portal_calendar_end_date(start_dt, end_dt)

        title = clean_text(item.get("name") or item.get("description") or "Calendar Event")
        description = clean_text(item.get("description"))
        event_type = classify_portal_calendar_event(item)

        calendar_name = clean_text(item.get("calendarOfEventName"))
        calendar_id = item.get("calendarOfEventId")

        if calendar_name:
            calendar_names.append(calendar_name)

        if calendar_id is not None:
            calendar_ids.append(str(calendar_id))

        event_id = clean_text(
            item.get("calendarEventDetailId")
            or item.get("calendarEventId")
            or f"{start_date}-{title}"
        )

        event = {
            "id": f"pesu-academy-{event_id}",
            "title": title,
            "date": start_date,
            "type": event_type,
            "source": "pesu-academy",
            "rawType": clean_text(item.get("eventType")),
            "description": description,
            "color": clean_text(item.get("color")) or None,
            "isHoliday": is_truthy_portal_flag(item.get("isHoliday")),
            "isClass": is_truthy_portal_flag(item.get("isClass")),
            "calendarOfEventName": calendar_name or None,
        }

        if end_date:
            event["endDate"] = end_date

        events.append(event)

    seen = {}
    for event in events:
        key = f"{event.get('date')}|{event.get('endDate', '')}|{event.get('title', '').lower()}"
        if key not in seen:
            seen[key] = event

    events = sorted(seen.values(), key=lambda event: event.get("date", ""))

    explicit_start = next(
        (event.get("date") for event in events if event.get("type") == "semester-start"),
        "",
    )

    explicit_end_candidates = [
        event.get("date")
        for event in events
        if event.get("type") == "semester-end" and event.get("date")
    ]

    start_date = explicit_start

    if not start_date:
        first_non_holiday = next(
            (
                event.get("date")
                for event in events
                if event.get("type") not in {"holiday", "isa", "esa", "exam"}
            ),
            "",
        )
        start_date = first_non_holiday or (events[0].get("date") if events else "")

    end_date = ""

    if explicit_end_candidates:
        end_date = sorted(explicit_end_candidates)[-1]
    else:
        non_footer_events = [
            event
            for event in events
            if event.get("type") not in {"holiday", "isa", "esa", "exam"}
        ]
        if non_footer_events:
            end_date = sorted(non_footer_events, key=lambda event: event.get("date", ""))[-1].get("date", "")
        elif events:
            end_date = events[-1].get("date", "")

    status = get_calendar_status(start_date, end_date)
    blocked_date_keys = sorted(
        {
            date
            for event in events
            if event.get("type") in {"holiday", "isa", "esa", "exam", "blocked", "non-instructional"}
            for date in expand_date_range(event.get("date", ""), event.get("endDate"))
        }
    )

    return {
        "source": "pesu-academy",
        "semesterId": sorted(set(calendar_ids))[0] if calendar_ids else None,
        "name": sorted(set(calendar_names))[0] if calendar_names else "",
        "startDate": start_date,
        "endDate": end_date,
        "calendarStatus": status,
        "usableForPrediction": status in {"active", "upcoming"},
        "blockedDateKeys": blocked_date_keys,
        "events": events,
    }


async def fetch_portal_calendar_html(pesu: Any):
    http_client = find_internal_http_client(pesu)

    if http_client is None:
        raise RuntimeError("Could not find authenticated PESU HTTP client for calendar.")

    response = await maybe_await(
        http_client.get(
            PORTAL_ADMIN_URL,
            params={**CALENDAR_PARAMS, "_": str(int(time.time() * 1000))},
            headers=make_xhr_headers(pesu),
        )
    )

    return await response_to_text(response)


async def fetch_portal_calendar(pesu: Any):
    html = await fetch_portal_calendar_html(pesu)
    parsed = parse_portal_calendar_html(html)

    if os.environ.get("CAMPUSFLOW_DEBUG_PESU") == "1":
        print(
            json.dumps(
                {
                    "debugCalendarHtmlLength": len(str(html or "")),
                    "debugCalendarEventCount": len(parsed.get("events") or []),
                    "debugCalendarName": parsed.get("name"),
                    "debugCalendarStatus": parsed.get("calendarStatus"),
                }
            ),
            file=sys.stderr,
        )

    return parsed

async def fetch_timetable(pesu: Any):
    html = await fetch_timetable_html(pesu)
    parsed = parse_pesu_timetable_script(html)

    if not parsed["ok"]:
        raise RuntimeError(parsed.get("error") or "Could not parse timetable.")

    return parsed


async def fetch_current_results(pesu: Any, semid: str):
    html = await fetch_current_results_html(pesu, semid)
    parsed = parse_pesu_results_html(html)

    if parsed.get("courses"):
        parsed["semester"] = None
        parsed["description"] = "Current Semester Internal Assessment"
        parsed["resultType"] = "current"
        parsed["earnedCredits"] = None
        parsed["totalCredits"] = None
        parsed["sgpa"] = None
        parsed["cgpa"] = None

    return parsed, html


def determine_result_type(parsed, requested_semester):
    if not parsed.get("courses"):
        return "unknown"

    has_grades = any(
        not is_missing_text(c.get("grade"))
        for c in parsed.get("courses", [])
    )
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


async def fetch_results(
    pesu: Any,
    semester_number: int | None = None,
    current_semid: Any = None,
):
    current_error = None
    current_candidates = normalize_semid_candidates(current_semid)
    tried_semids = []

    debug_log(
        {
            "debugResultsSource": "current-isa-candidates",
            "debugSemidCandidates": [str(candidate) for candidate in current_candidates],
        }
    )

    for candidate in current_candidates:
        candidate_text = str(candidate)
        tried_semids.append(candidate_text)
        try:
            current_parsed, current_html = await fetch_current_results(pesu, candidate_text)
            current_course_count = len(current_parsed.get("courses") or [])

            debug_log(
                {
                    "debugResultsSource": "current-isa-post",
                    "debugCurrentSemid": candidate_text,
                    "debugCurrentResultsHtmlLength": len(str(current_html or "")),
                    "debugHasIsaEsaResult": "isaEsaResult" in str(current_html or ""),
                    "debugHasMultipleInfoWrapper": "multiple-info-wrapper" in str(current_html or ""),
                    "debugHeaderInfoCount": str(current_html or "").count("header-info"),
                    "debugCurrentResultsCourseCount": current_course_count,
                }
            )

            if current_course_count > 0:
                debug_log(
                    {
                        "debugResultsSource": "current-isa-selected",
                        "debugChosenSemid": candidate_text,
                        "debugTriedCurrentSemids": tried_semids,
                        "debugCurrentResultsCourseCount": current_course_count,
                    }
                )
                return current_parsed
        except Exception as error:
            current_error = str(error)
            debug_log(
                {
                    "debugResultsSource": "current-isa-post-failed",
                    "debugCurrentSemid": candidate_text,
                    "debugCurrentResultsError": current_error,
                }
            )

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
                        "debugSemidCandidates": [str(candidate) for candidate in current_candidates],
                        "debugChosenSemid": None,
                        "debugTriedCurrentSemids": tried_semids,
                        "debugCurrentResultsError": current_error,
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
                                "debugSemidCandidates": [str(candidate) for candidate in current_candidates],
                                "debugChosenSemid": None,
                                "debugTriedCurrentSemids": tried_semids,
                                "debugCurrentResultsError": current_error,
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
                    "debugSemidCandidates": [str(candidate) for candidate in current_candidates],
                    "debugChosenSemid": None,
                    "debugTriedCurrentSemids": tried_semids,
                    "debugCurrentResultsError": current_error,
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
        requested_semid = payload.get("semid") or payload.get("semesterId")

        if not username or not password:
            raise ValueError("Username and password are required.")

        pesu = await maybe_await(PESUAcademy.login(username=username, password=password))

        if os.environ.get("CAMPUSFLOW_PROBE_PORTAL_CALENDAR") == "1":
            profile_result = await safe_call(lambda: pesu.get_profile())

            if profile_result["ok"]:
                profile = normalize_profile(profile_result["data"])
            else:
                profile = {
                    "name": None,
                    "srn": username,
                    "pesuId": None,
                    "program": None,
                    "branch": None,
                    "semester": None,
                    "semesterNumber": None,
                    "section": None,
                    "photoDataUrl": None,
                }

            probe = await fetch_portal_calendar_probe(pesu)

            print(
                json.dumps(
                    {
                        "ok": True,
                        "source": "pesu",
                        "syncedAt": payload.get("syncedAt"),
                        "profile": profile,
                        "attendance": [],
                        "courses": [],
                        "timetable": {
                            "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                            "roomId": None,
                            "lastFinalizedAt": "",
                            "slots": [],
                        },
                        "results": default_results(),
                        "seating": default_seating(),
                        "calendarProbe": probe,
                        "errors": {
                            "attendance": None,
                            "courses": None,
                            "timetable": None,
                            "results": None,
                            "seating": None,
                            "profile": None if profile_result["ok"] else profile_result.get("error"),
                        },
                    }
                )
            )
            return


        profile_result = await safe_call(lambda: pesu.get_profile())
        attendance_result = await safe_call(lambda: pesu.get_attendance())
        courses_result = await safe_call(lambda: pesu.get_courses())
        timetable_result = await safe_call(lambda: fetch_timetable(pesu))
        seating_result = await safe_call(lambda: fetch_seating(pesu))
        calendar_result = await safe_call(lambda: fetch_portal_calendar(pesu))

        if not profile_result["ok"]:
            raise RuntimeError(profile_result.get("error") or "Could not fetch profile.")

        profile = normalize_profile(profile_result["data"])

        semester_number = (
            int(requested_semester)
            if requested_semester
            else profile.get("semesterNumber")
        )
        current_semid_candidates = normalize_semid_candidates(requested_semid)

        raw_courses = courses_result.get("data") if courses_result.get("ok") else None
        raw_attendance = attendance_result.get("data") if attendance_result.get("ok") else None
        raw_timetable = timetable_result.get("data") if timetable_result.get("ok") else None
        shell_responses = await fetch_current_results_shell_html(pesu)
        shell_candidates = []

        for shell_source, shell_html in shell_responses:
            source_candidates = parse_semid_candidates_from_html(shell_html)
            normalized_shell_html = normalize_semid_html(shell_html)
            shell_has_semid_text = "semid" in normalized_shell_html.lower()
            shell_candidates.extend(source_candidates)

            if not source_candidates and shell_has_semid_text:
                debug_semid_context(shell_html, shell_source)

            debug_log(
                {
                    "debugSemidShellSource": shell_source,
                    "debugSemidShellHtmlLength": len(str(shell_html or "")),
                    "debugSemidShellHasSemidText": shell_has_semid_text,
                    "debugSemidCandidatesFromShell": source_candidates,
                }
            )

        shell_candidates = [str(candidate) for candidate in normalize_semid_candidates(shell_candidates)]

        if shell_candidates:
            current_semid_candidates.extend(shell_candidates)
            current_semid_candidates = normalize_semid_candidates(current_semid_candidates)
        elif not current_semid_candidates:
            current_semid_candidates = get_current_semid_candidates(
                raw_timetable,
                raw_courses,
                raw_attendance,
            )

        rejected_course_ids = get_rejected_course_id_candidates(
            raw_timetable,
            raw_courses,
            raw_attendance,
        )

        debug_log(
            {
                "debugRawAttendanceDataType": type(raw_attendance).__name__,
                "debugRawCoursesDataType": type(raw_courses).__name__,
                "debugRawAttendanceTopLevelKeys": get_safe_debug_keys(raw_attendance),
                "debugRawCoursesTopLevelKeys": get_safe_debug_keys(raw_courses),
                "debugSemidCandidatesFromShell": shell_candidates,
                "debugSemidCandidatesRejectedAsCourseIds": [
                    str(candidate)
                    for candidate in rejected_course_ids[:50]
                ],
                "debugSemidCandidates": [
                    str(candidate)
                    for candidate in current_semid_candidates
                ],
                "debugChosenSemid": None,
                "debugCurrentSemidFromPayload": bool(requested_semid),
            }
        )

        results_result = await safe_call(
            lambda: fetch_results(
                pesu,
                semester_number,
                current_semid_candidates,
            )
        )
        attendance = []
        courses = []
        results = default_results()
        seating = default_seating()
        calendar = default_calendar()
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

        if calendar_result["ok"]:
            calendar = calendar_result["data"]

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
                    "calendar": calendar,
                    "errors": {
                        "attendance": None if attendance_result["ok"] else attendance_result.get("error"),
                        "courses": None if courses_result["ok"] else courses_result.get("error"),
                        "timetable": None if timetable_result["ok"] else timetable_result.get("error"),
                        "results": None if results_result["ok"] else results_result.get("error"),
                        "seating": None if seating_result["ok"] else seating_result.get("error"),
                        "calendar": None if calendar_result["ok"] else calendar_result.get("error"),
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
