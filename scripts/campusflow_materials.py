import asyncio
import hashlib
import inspect
import json
import re
import sys
import time
from html import unescape
from typing import Any
from urllib.parse import parse_qs, parse_qsl, unquote, urlencode, urljoin, urlparse, urlunparse

try:
    from bs4 import BeautifulSoup
except ModuleNotFoundError:
    BeautifulSoup = None

try:
    import httpx
except Exception as httpx_import_error:
    httpx = None
    HTTPX_IMPORT_ERROR = httpx_import_error
else:
    HTTPX_IMPORT_ERROR = None

try:
    from pesuacademy import PESUAcademy
except Exception as import_error:
    PESUAcademy = None
    PESU_IMPORT_ERROR = import_error
else:
    PESU_IMPORT_ERROR = None

try:
    from pesuacademy.client import _PesuScraper
except Exception:
    _PesuScraper = None

try:
    from campusflow_pesu import (
        PORTAL_ADMIN_URL as shared_portal_admin_url,
        PORTAL_HOME_URL as shared_portal_home_url,
        clean_text as shared_clean_text,
        find_internal_http_client as shared_find_internal_http_client,
        make_xhr_headers as shared_make_xhr_headers,
        maybe_await as shared_maybe_await,
        response_to_text as shared_response_to_text,
        serialize as shared_serialize,
    )
except Exception:
    shared_portal_admin_url = None
    shared_portal_home_url = None
    shared_clean_text = None
    shared_find_internal_http_client = None
    shared_make_xhr_headers = None
    shared_maybe_await = None
    shared_response_to_text = None
    shared_serialize = None


PORTAL_HOME_URL = shared_portal_home_url or "https://www.pesuacademy.com/Academy/s/studentProfilePESU"
PORTAL_ADMIN_URL = shared_portal_admin_url or "https://www.pesuacademy.com/Academy/s/studentProfilePESUAdmin"
PESU_ORIGIN_URL = "https://www.pesuacademy.com"
ACADEMY_BASE_URL = f"{PESU_ORIGIN_URL}/Academy"
ACTION_BASE_URL = f"{ACADEMY_BASE_URL}/a/studentProfilePESU"
ELEARNING_JS_URL = f"{ACADEMY_BASE_URL}/js/elearning.js"
GROUP_BASED_CATEGORY_URL = f"{ACADEMY_BASE_URL}/a/i/groupBasedcategory"
LOGIN_PAGE_PATH = "/"
LOGIN_TIMEOUT_SECONDS = 30.0

FALLBACK_WARNING = "Real PESU material extraction failed, using fallback catalog."
ELEARNING_JS_PARSE_WARNING = "eLearning JS discovered but material API parsing is not implemented yet."
ELEARNING_ENDPOINT_PROBE_LIMIT = 28

SUBJECT_CODE_RE = re.compile(r"\b[A-Z]{2}\d{2}[A-Z]{2,4}\d{2,4}[A-Z]?\b")
DATE_RE = re.compile(r"\b(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b")
SIZE_RE = re.compile(r"\b\d+(?:\.\d+)?\s*(?:KB|MB|GB)\b", re.I)
URL_RE = re.compile(r"https?://[^\s'\"<>]+", re.I)
EXTENSION_RE = re.compile(r"\.(pdf|pptx?|docx?|xlsx?|zip)(?:\?|#|$)", re.I)

MATERIAL_KEYWORDS = [
    "study material",
    "study",
    "material",
    "materials",
    "learning resource",
    "resource",
    "resources",
    "course content",
    "content",
    "course",
    "courses",
    "notes",
    "lecture",
    "lesson",
    "slides",
    "worksheet",
    "tutorial",
    "assignment",
    "module",
    "topic",
    "topics",
    "unit",
    "subject",
    "syllabus",
    "download",
    "file",
    "files",
    "lms",
    "elearning",
    "mycourses",
    "document",
    "attachment",
    "econtent",
]

MATERIAL_METHOD_KEYWORDS = [
    "material",
    "resource",
    "content",
    "lms",
    "learning",
    "document",
    "notes",
]

SKIPPED_METHOD_KEYWORDS = [
    "download",
    "logout",
    "login",
    "delete",
    "remove",
    "submit",
]

MATERIAL_ENDPOINT_NAMES = [
    "getStudyMaterials",
    "getStudentStudyMaterials",
    "getCourseMaterials",
    "getCourseContent",
    "getStudentCourseContent",
    "getLearningResources",
    "getLmsMaterials",
    "getLMSMaterials",
    "getSubjectMaterials",
]

MATERIAL_MENU_GUESSES = [
    {"menuId": "661", "controllerMode": "6408", "actionType": "5"},
    {"menuId": "662", "controllerMode": "6409", "actionType": "5"},
    {"menuId": "663", "controllerMode": "6410", "actionType": "5"},
    {"menuId": "664", "controllerMode": "6411", "actionType": "5"},
    {"menuId": "665", "controllerMode": "6412", "actionType": "5"},
    {"menuId": "670", "controllerMode": "6416", "actionType": "5"},
    {"menuId": "671", "controllerMode": "6417", "actionType": "5"},
]

KNOWN_MATERIAL_CANDIDATE_URLS = [
    "www.pesuacademy.com/Academy/s/studentProfilePESUAdmin/elearning/9935/52",
    "studentProfilePESUAdmin/MyCourses/6403/5",
]

KNOWN_POST_LOGIN_REQUESTS = [
    {
        "name": "student-profile",
        "url": PORTAL_HOME_URL,
        "params": {},
    },
    {
        "name": "student-profile-admin",
        "url": PORTAL_ADMIN_URL,
        "params": {},
    },
    {
        "name": "attendance-menu",
        "url": PORTAL_ADMIN_URL,
        "params": {
            "menuId": "660",
            "url": "studentProfilePESUAdmin",
            "controllerMode": "6407",
            "actionType": "5",
            "id": "0",
            "selectedData": "0",
        },
    },
    {
        "name": "timetable-menu",
        "url": PORTAL_ADMIN_URL,
        "params": {
            "menuId": "669",
            "url": "studentProfilePESUAdmin",
            "controllerMode": "6415",
            "actionType": "5",
            "id": "0",
            "selectedData": "0",
        },
    },
    {
        "name": "calendar-menu",
        "url": PORTAL_ADMIN_URL,
        "params": {
            "menuId": "668",
            "url": "studentProfilePESUAdmin",
            "controllerMode": "6413",
            "actionType": "5",
            "id": "0",
            "selectedData": "0",
        },
    },
    {
        "name": "seating-menu",
        "url": PORTAL_ADMIN_URL,
        "params": {
            "menuId": "655",
            "url": "studentProfilePESUAdmin",
            "controllerMode": "6404",
            "actionType": "5",
            "id": "0",
            "selectedData": "0",
        },
    },
]

SENSITIVE_QUERY_KEYS = {
    "password",
    "passwd",
    "pwd",
    "token",
    "csrf",
    "auth",
    "authorization",
    "cookie",
    "session",
    "sessionid",
    "jsessionid",
    "sid",
    "key",
    "secret",
    "otp",
}

BINARY_FILE_EXTENSIONS = {
    ".pdf",
    ".ppt",
    ".pptx",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".zip",
    ".rar",
    ".7z",
}

MATERIAL_KEYWORD_RE = re.compile(
    "|".join(re.escape(keyword) for keyword in sorted(MATERIAL_KEYWORDS, key=len, reverse=True)),
    re.I,
)

ELEARNING_JS_KEYWORDS = [
    "material",
    "course",
    "content",
    "unit",
    "topic",
    "resource",
    "document",
    "file",
    "download",
    "subject",
    "module",
    "eLearning",
    "elearning",
]

ELEARNING_JS_KEYWORD_RE = re.compile(
    "|".join(re.escape(keyword) for keyword in sorted(ELEARNING_JS_KEYWORDS, key=len, reverse=True)),
    re.I,
)

ELEARNING_JS_STRING_RE = re.compile(
    r"""(?P<quote>['"`])(?P<value>(?:\\.|(?! (?P=quote) ).){0,1000})(?P=quote)""",
    re.S | re.X,
)

ELEARNING_URL_ACTION_RE = re.compile(
    r"""(?:url|action)\s*:\s*(?P<quote>['"`])(?P<value>(?:\\.|(?! (?P=quote) ).){1,1000})(?P=quote)""",
    re.I | re.S | re.X,
)

ELEARNING_AJAX_CALL_RE = re.compile(
    r"""(?P<kind>\$\s*\.\s*(?:ajax|post|get)|fetch|doAjaxCall)\s*\(""",
    re.I,
)

ELEARNING_DO_AJAX_CALL_RE = re.compile(
    r"""doAjaxCall\s*\(\s*(?P<quote>['"])(?P<endpoint>[^'"]{1,220})(?P=quote)\s*,\s*(?P<method_quote>['"])(?P<method>GET|POST)(?P=method_quote)\s*,\s*(?P<data_var>[A-Za-z_$][\w$]*)""",
    re.I,
)

ELEARNING_OBJECT_FIELD_RE = re.compile(
    r"""
    (?P<key>[A-Za-z_$][\w$]*|['"][^'"]{1,80}['"])\s*:\s*
    (?P<value>
        "(?:\\.|[^"]){0,220}" |
        '(?:\\.|[^']){0,220}' |
        \d+(?:\.\d+)? |
        true |
        false |
        null |
        elearningmenuId
    )
    """,
    re.I | re.X,
)

ELEARNING_ACTION_PRIORITY = {
    "1": 0,
    "7": 1,
    "14": 2,
    "15": 3,
    "23": 4,
    "27": 5,
    "42": 6,
    "43": 7,
    "48": 8,
}

GROUP_BASED_CATEGORY_MATCH_KEYS = [
    "course",
    "subject",
    "material",
    "content",
    "unit",
    "topic",
    "resource",
    "module",
    "file",
    "download",
    "section",
    "category",
]

GROUP_BASED_CATEGORY_ID_KEYS = {
    "id",
    "categoryid",
    "courseid",
    "subjectid",
}

GROUP_BASED_CATEGORY_NAME_KEYS = [
    "name",
    "courseName",
    "course_name",
    "subjectName",
    "subject_name",
    "categoryName",
    "category_name",
    "title",
]

MOCK_FALLBACK_CATALOG = {
    "subjects": [
        {
            "code": "UE24CS151A",
            "name": "Problem Solving with C",
            "units": ["Unit 1", "Unit 2", "Unit 3"],
        },
        {
            "code": "UE24MA141B",
            "name": "Mathematics II",
            "units": ["Unit 2", "Unit 3"],
        },
        {
            "code": "UE24PH141A",
            "name": "Physics",
            "units": ["Unit 3", "Unit 4"],
        },
    ],
    "materials": [
        {
            "id": "fallback-c-unit1-pdf-1",
            "subjectCode": "UE24CS151A",
            "subjectName": "Problem Solving with C",
            "unit": "Unit 1",
            "title": "Introduction to C Programming",
            "description": "Fallback catalog item used when PESU material extraction is unavailable.",
            "type": "pdf",
            "source": "mock",
            "sizeLabel": "2.4 MB",
            "uploadedAt": "2026-01-12",
        },
        {
            "id": "fallback-math-unit3-pdf-1",
            "subjectCode": "UE24MA141B",
            "subjectName": "Mathematics II",
            "unit": "Unit 3",
            "title": "Vector Calculus Material",
            "description": "Fallback catalog item used when PESU material extraction is unavailable.",
            "type": "pdf",
            "source": "mock",
            "sizeLabel": "3.9 MB",
            "uploadedAt": "2026-02-11",
        },
        {
            "id": "fallback-physics-unit4-pdf-1",
            "subjectCode": "UE24PH141A",
            "subjectName": "Physics",
            "unit": "Unit 4",
            "title": "Lasers and Optical Fibres",
            "description": "Fallback catalog item used when PESU material extraction is unavailable.",
            "type": "pdf",
            "source": "mock",
            "sizeLabel": "5.8 MB",
            "uploadedAt": "2026-02-20",
        },
    ],
}


def clean_text(value: Any):
    if shared_clean_text is not None:
        try:
            return shared_clean_text(value)
        except Exception:
            pass

    return re.sub(r"\s+", " ", str(value or "")).strip()


def sanitize_text(value: Any):
    text = clean_text(value)
    text = URL_RE.sub("[link]", text)
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
    return text


def has_material_keyword(value: Any):
    return bool(MATERIAL_KEYWORD_RE.search(clean_text(value)))


def is_sensitive_query_key(key: str):
    normalized = clean_text(key).lower()
    return any(sensitive in normalized for sensitive in SENSITIVE_QUERY_KEYS)


def strip_sensitive_query(url: str):
    parsed = urlparse(url)
    safe_pairs = []

    for key, value in parse_qsl(parsed.query, keep_blank_values=True):
        if is_sensitive_query_key(key):
            continue

        clean_value = clean_text(value)

        if len(clean_value) > 80:
            continue

        safe_pairs.append((key, clean_value))

    return urlunparse(
        (
            parsed.scheme,
            parsed.netloc,
            parsed.path,
            parsed.params,
            urlencode(safe_pairs),
            "",
        )
    )


def is_pesuacademy_host(host: str):
    normalized_host = clean_text(host).lower().split("@")[-1].split(":")[0]
    return normalized_host == "pesuacademy.com" or normalized_host.endswith(".pesuacademy.com")


def normalize_pesu_path(path: str):
    normalized_path = re.sub(r"/{2,}", "/", path or "/")

    embedded_host_match = re.search(
        r"/(?:www\.)?pesuacademy\.com/(Academy(?:/.*)?)$",
        normalized_path,
        re.I,
    )

    if embedded_host_match:
        normalized_path = f"/{embedded_host_match.group(1)}"

    while "/Academy/Academy" in normalized_path:
        normalized_path = normalized_path.replace("/Academy/Academy", "/Academy")

    normalized_path = normalized_path.replace("/Academy/s/Academy/s/", "/Academy/s/")
    normalized_path = normalized_path.replace("/Academy/s/Academy/", "/Academy/")

    return normalized_path or "/"


def normalize_pesu_url(raw_url: Any, base_url: str = PORTAL_HOME_URL):
    text = clean_text(raw_url)

    if not text:
        return ""

    text = unquote(unescape(text)).strip()

    if text.startswith(("javascript:", "mailto:", "tel:", "#")):
        return ""

    if text.startswith("//"):
        text = f"https:{text}"

    if re.match(r"(?i)^www\.pesuacademy\.com(?:/|$)", text):
        text = f"https://{text}"
    elif re.match(r"(?i)^pesuacademy\.com(?:/|$)", text):
        text = f"https://www.{text}"

    if re.match(r"(?i)^https?://", text):
        normalized = text
    elif text.startswith("/Academy"):
        normalized = urljoin(f"{PESU_ORIGIN_URL}/", text.lstrip("/"))
    else:
        normalized = urljoin(base_url or PORTAL_HOME_URL, text)

    normalized = strip_sensitive_query(normalized)
    parsed = urlparse(normalized)

    if parsed.scheme not in {"http", "https"}:
        return ""

    if not is_pesuacademy_host(parsed.netloc):
        return ""

    safe_path = normalize_pesu_path(parsed.path)

    normalized = urlunparse(
        (
            "https",
            "www.pesuacademy.com",
            safe_path,
            parsed.params,
            parsed.query,
            "",
        )
    )

    if any(
        duplicate in normalized
        for duplicate in [
            "/Academy/s/www.pesuacademy.com",
            "/Academy/Academy",
            "/Academy/s/Academy",
        ]
    ):
        return ""

    return normalized


def normalize_candidate_url(raw_url: Any, base_url: str):
    return normalize_pesu_url(raw_url, base_url)


def safe_url_for_debug(url: Any, *, include_scheme: bool = False):
    normalized = normalize_candidate_url(url, PORTAL_HOME_URL)

    if not normalized:
        return ""

    parsed = urlparse(normalized)
    path = parsed.path or "/"
    segments = path.split("/")

    if segments:
        last_segment = segments[-1].lower()

        if any(last_segment.endswith(extension) for extension in BINARY_FILE_EXTENSIONS):
            segments[-1] = "[file]"
            path = "/".join(segments)

    path_segments = [segment.lower() for segment in path.split("/") if segment]

    if any(
        segment in {
            "download",
            "downloadfile",
            "downloadcoursedoc",
            "downloadsectioncontentfile",
            "filedownload",
        }
        for segment in path_segments
    ):
        path = re.sub(
            r"/(?:download|downloadfile|downloadcoursedoc|downloadsectioncontentfile|filedownload)(?:/[^/?#]*)*",
            "/[download]",
            path,
            flags=re.I,
        )

    prefix = f"{parsed.scheme}://" if include_scheme else ""
    display = f"{prefix}{parsed.netloc}{path}"

    if parsed.query:
        display = f"{display}?{parsed.query}"

    return display[:260]


def safe_raw_url_for_debug(url: Any):
    text = clean_text(unquote(unescape(str(url or ""))))

    if not text:
        return ""

    text = strip_sensitive_query(text)
    text = re.sub(
        r"(?i)/(?:download|downloadfile|downloadcoursedoc|downloadsectioncontentfile|filedownload)(?:/[^?#\s]*)*",
        "/[download]",
        text,
    )
    text = re.sub(
        r"(?i)\b(password|token|csrf|cookie|session)\b\s*[:=]\s*['\"]?[^'\"\s>]+",
        r"\1=[redacted]",
        text,
    )
    text = re.sub(r"[A-Za-z0-9+/=_\-.]{48,}", "[redacted-token]", text)

    return text[:260]



def is_probably_download_url(url: str):
    parsed = urlparse(url)
    path = parsed.path.lower()

    if any(path.endswith(extension) for extension in BINARY_FILE_EXTENSIONS):
        return True

    path_segments = [segment for segment in path.split("/") if segment]

    return any(
        segment in {"download", "downloadfile", "downloadsectioncontentfile", "getfile", "filedownload"}
        for segment in path_segments
    )


def get_response_status(response: Any):
    for name in ["status_code", "status", "code"]:
        value = getattr(response, name, None)

        if value is not None:
            return value

    return None


def get_response_headers(response: Any):
    headers = getattr(response, "headers", None)

    if headers is None:
        return {}

    return headers


def get_response_header(response: Any, key: str):
    headers = get_response_headers(response)

    try:
        value = headers.get(key) or headers.get(key.lower()) or headers.get(key.title())
    except Exception:
        value = None

    return clean_text(value)


def get_response_content_type(response: Any):
    return get_response_header(response, "content-type")


def get_response_content_length(response: Any):
    raw_length = get_response_header(response, "content-length")

    if raw_length.isdigit():
        return int(raw_length)

    return None


def is_text_like_content_type(content_type: str):
    clean_content_type = clean_text(content_type).lower()

    if not clean_content_type:
        return True

    return any(
        marker in clean_content_type
        for marker in ["text/", "html", "json", "javascript", "xml", "x-www-form-urlencoded"]
    )


def find_current_url(*roots: Any):
    for root in roots:
        if root is None:
            continue

        for name in ["url", "current_url", "currentUrl", "last_url", "lastUrl"]:
            value = getattr(root, name, None)

            if isinstance(value, str) and value.strip():
                return value.strip()

    return ""


def get_debug_target(url: Any):
    normalized = normalize_candidate_url(url, PORTAL_HOME_URL)
    parsed = urlparse(normalized or clean_text(url))

    return {
        "targetHost": clean_text(parsed.netloc)[:180],
        "targetPath": clean_text(parsed.path or "/")[:220],
    }


def get_error_request_url(error: Exception, fallback_url: str):
    request = getattr(error, "request", None)
    request_url = getattr(request, "url", None) if request is not None else None
    return str(request_url or fallback_url)


def sanitize_debug_value(key: str, value: Any):
    if value is None or isinstance(value, (bool, int, float)):
        return value

    if isinstance(value, (list, tuple, set)):
        return [sanitize_debug_value(key, item) for item in list(value)[:40]]

    if isinstance(value, dict):
        return {
            sanitize_text(item_key)[:80]: sanitize_debug_value(str(item_key), item_value)
            for item_key, item_value in value.items()
            if not is_sensitive_debug_key(str(item_key))
        }

    lowered_key = key.lower()

    if lowered_key in {"raw", "rawurl"}:
        return safe_raw_url_for_debug(value)

    if lowered_key == "normalizedurl":
        return safe_url_for_debug(value, include_scheme=True) or sanitize_text(value)[:260]

    if lowered_key in {"baseurl", "url"}:
        return safe_url_for_debug(value, include_scheme=True) or sanitize_text(value)[:260]

    if lowered_key.endswith("url"):
        return safe_url_for_debug(value) or sanitize_text(value)[:260]

    if lowered_key == "targethost":
        return clean_text(value)[:180]

    if lowered_key == "targetpath":
        return clean_text(value)[:220]

    return sanitize_text(value)


def is_sensitive_debug_key(key: str):
    lowered = key.lower()
    return any(
        marker in lowered
        for marker in ["password", "cookie", "csrf", "token", "authorization"]
    )


def debug(message: str, **fields: Any):
    safe_fields = {
        key: sanitize_debug_value(key, value)
        for key, value in fields.items()
        if not is_sensitive_debug_key(key)
    }
    print(
        json.dumps(
            {
                "debug": message,
                **safe_fields,
            }
        ),
        file=sys.stderr,
    )


def serialize(value: Any):
    if shared_serialize is not None:
        try:
            return shared_serialize(value)
        except Exception:
            pass

    if value is None:
        return None

    if isinstance(value, (str, int, float, bool)):
        return value

    if isinstance(value, list):
        return [serialize(item) for item in value]

    if isinstance(value, tuple):
        return [serialize(item) for item in value]

    if isinstance(value, dict):
        return {str(key): serialize(item) for key, item in value.items()}

    if hasattr(value, "model_dump"):
        return serialize(value.model_dump())

    if hasattr(value, "dict"):
        return serialize(value.dict())

    if hasattr(value, "__dict__"):
        return serialize(value.__dict__)

    return str(value)


async def maybe_await(value: Any):
    if shared_maybe_await is not None:
        return await shared_maybe_await(value)

    if inspect.isawaitable(value):
        return await value

    return value


async def response_to_text(response: Any):
    if shared_response_to_text is not None:
        return await shared_response_to_text(response)

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


async def get_response_debug_length(response: Any):
    content_length = get_response_content_length(response)

    if content_length is not None:
        return content_length

    try:
        text = await response_to_text(response)
        return len(str(text or ""))
    except Exception:
        return None


def find_internal_http_client(pesu: Any):
    if shared_find_internal_http_client is not None:
        return shared_find_internal_http_client(pesu)

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
        value = getattr(pesu, name, None)

        if value is not None and hasattr(value, "get") and callable(getattr(value, "get")):
            return value

    if hasattr(pesu, "get") and callable(getattr(pesu, "get")):
        return pesu

    return None


def make_xhr_headers(pesu: Any):
    if shared_make_xhr_headers is not None:
        return shared_make_xhr_headers(pesu)

    return {
        "x-requested-with": "XMLHttpRequest",
        "content-type": "application/x-www-form-urlencoded",
        "referer": PORTAL_HOME_URL,
    }


async def safe_call(fn):
    try:
        return {"ok": True, "data": serialize(await maybe_await(fn()))}
    except Exception as error:
        return {"ok": False, "errorType": type(error).__name__}


async def check_login_page_connectivity():
    login_page_url = f"{ACADEMY_BASE_URL}{LOGIN_PAGE_PATH}"
    debug("materials-base-url", baseUrl=ACADEMY_BASE_URL)

    if httpx is None:
        debug(
            "materials-connectivity-check",
            url=login_page_url,
            status="skipped",
            errorType=type(HTTPX_IMPORT_ERROR).__name__,
            **get_debug_target(login_page_url),
        )
        return

    try:
        with httpx.Client(
            base_url=ACADEMY_BASE_URL,
            follow_redirects=True,
            timeout=LOGIN_TIMEOUT_SECONDS,
        ) as session:
            response = session.get(LOGIN_PAGE_PATH)

        debug(
            "materials-connectivity-check",
            url=login_page_url,
            status=get_response_status(response),
            responseLength=await get_response_debug_length(response),
        )
    except Exception as error:
        target_url = get_error_request_url(error, login_page_url)
        debug(
            "materials-connectivity-check",
            url=target_url,
            status=type(error).__name__,
            errorType=type(error).__name__,
            **get_debug_target(target_url),
        )
        raise


async def debug_login_failure(error: Exception):
    fields: dict[str, Any] = {
        "errorType": type(error).__name__,
    }
    response = getattr(error, "response", None)

    if response is None:
        response = getattr(error, "_campusflow_login_response", None)

    if response is not None:
        fields["status"] = get_response_status(response)
        fields["responseLength"] = await get_response_debug_length(response)

    target_url = clean_text(getattr(response, "url", "")) if response is not None else ""
    target_url = target_url or get_error_request_url(error, f"{ACADEMY_BASE_URL}{LOGIN_PAGE_PATH}")
    fields.update(get_debug_target(target_url))

    debug("materials-login-failure", **fields)


class TrackingHttpClient:
    def __init__(self, wrapped: Any):
        self._wrapped = wrapped
        self.last_response = None
        self.last_response_method = ""

    async def get(self, *args: Any, **kwargs: Any):
        response = await self._wrapped.get(*args, **kwargs)
        self.last_response = response
        self.last_response_method = "get"
        return response

    async def post(self, *args: Any, **kwargs: Any):
        response = await self._wrapped.post(*args, **kwargs)
        self.last_response = response
        self.last_response_method = "post"
        return response

    async def aclose(self):
        await self._wrapped.aclose()

    def __getattr__(self, name: str):
        return getattr(self._wrapped, name)


async def login_with_pesuacademy_flow(username: str, password: str):
    if PESUAcademy is None:
        raise RuntimeError(f"pesuacademy import failed: {type(PESU_IMPORT_ERROR).__name__}")

    if _PesuScraper is None:
        return await maybe_await(PESUAcademy.login(username=username, password=password))

    scraper = _PesuScraper()
    original_session = getattr(scraper, "_session", None)
    tracker = TrackingHttpClient(original_session)
    scraper._session = tracker

    try:
        await scraper.login(username, password)
    except Exception as error:
        if getattr(error, "response", None) is None and tracker.last_response is not None:
            setattr(error, "_campusflow_login_response", tracker.last_response)

        try:
            await scraper.close()
        except Exception:
            pass

        raise

    return PESUAcademy(scraper)


class ElearningJsParsingNotImplemented(RuntimeError):
    pass


def fallback_response(warnings: list[str] | None = None):
    return {
        "ok": True,
        "source": "mock-fallback",
        "catalog": MOCK_FALLBACK_CATALOG,
        "warnings": warnings or [FALLBACK_WARNING],
    }


def normalize_material_type(*values: Any):
    text = " ".join(clean_text(value).lower() for value in values if value is not None)

    if ".pdf" in text or " pdf" in f" {text}":
        return "pdf"

    if ".ppt" in text or ".pptx" in text or "powerpoint" in text or "slides" in text:
        return "ppt"

    if ".doc" in text or ".docx" in text or "word document" in text:
        return "doc"

    if text.startswith("http") or " link" in f" {text}" or "external" in text:
        return "link"

    return "unknown"


def safe_optional_text(value: Any, limit: int = 220):
    text = sanitize_text(value)

    if len(text) <= limit:
        return text

    return f"{text[: limit - 1].rstrip()}..."


def extract_subject_code(*values: Any):
    for value in values:
        match = SUBJECT_CODE_RE.search(clean_text(value))

        if match:
            return match.group(0)

    return ""


def extract_unit(*values: Any):
    text = " ".join(clean_text(value) for value in values if value is not None)
    match = re.search(r"\b(?:unit|module|chapter)\s*[-:]?\s*(\d+[A-Za-z]?)\b", text, re.I)

    if match:
        label = match.group(1).upper()
        return f"Unit {label}"

    return "General"


def extract_size(*values: Any):
    text = " ".join(clean_text(value) for value in values if value is not None)
    match = SIZE_RE.search(text)
    return match.group(0) if match else ""


def extract_date(*values: Any):
    text = " ".join(clean_text(value) for value in values if value is not None)
    match = DATE_RE.search(text)
    return match.group(0) if match else ""


def find_first_value(data: dict[str, Any], keys: list[str]):
    lowered = {str(key).lower(): value for key, value in data.items()}

    for key in keys:
        if key.lower() in lowered:
            return lowered[key.lower()]

    return None


def parse_query_params(text: str):
    params = {}

    for key in ["menuId", "controllerMode", "actionType", "id", "selectedData", "url"]:
        match = re.search(rf"{key}\s*[:=]\s*['\"]?([A-Za-z0-9_\-/]+)", text)

        if match:
            params[key] = match.group(1)

    for url in URL_RE.findall(text):
        parsed = urlparse(url)
        query = parse_qs(parsed.query)

        for key in ["menuId", "controllerMode", "actionType", "id", "selectedData", "url"]:
            if key in query and query[key]:
                params[key] = query[key][0]

    return params


def stable_material_id(subject_code: str, unit: str, title: str, raw_reference: str):
    key = "|".join([subject_code, unit, title, raw_reference])
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()[:18]
    return f"pesu-material-{digest}"


def material_signature(material: dict[str, Any]):
    return "|".join(
        [
            clean_text(material.get("subjectCode")).lower(),
            clean_text(material.get("unit")).lower(),
            clean_text(material.get("title")).lower(),
            clean_text(material.get("type")).lower(),
        ]
    )


def add_material(
    materials: list[dict[str, Any]],
    seen: set[str],
    *,
    subject_code: str,
    subject_name: str,
    unit: str,
    title: str,
    description: str = "",
    material_type: str = "unknown",
    raw_reference: str = "",
    size_label: str = "",
    uploaded_at: str = "",
):
    clean_title = safe_optional_text(title, 140)

    if not clean_title:
        return

    clean_subject_code = clean_text(subject_code) or "PESU-MATERIALS"
    clean_subject_name = safe_optional_text(subject_name, 120) or "PESU Academy Materials"
    clean_unit = safe_optional_text(unit, 80) or "General"

    material = {
        "id": stable_material_id(clean_subject_code, clean_unit, clean_title, raw_reference),
        "subjectCode": clean_subject_code,
        "subjectName": clean_subject_name,
        "unit": clean_unit,
        "title": clean_title,
        "description": safe_optional_text(description),
        "type": material_type if material_type in {"pdf", "ppt", "doc", "link", "unknown"} else "unknown",
        "source": "pesuacademy",
        "sizeLabel": safe_optional_text(size_label, 40),
        "uploadedAt": safe_optional_text(uploaded_at, 40),
    }

    signature = material_signature(material)

    if signature in seen:
        return

    seen.add(signature)
    materials.append(material)


def collect_subjects(value: Any, subjects: dict[str, str]):
    data = serialize(value)

    if isinstance(data, dict):
        code = clean_text(
            find_first_value(
                data,
                [
                    "code",
                    "course_code",
                    "courseCode",
                    "subject_code",
                    "subjectCode",
                ],
            )
        )
        name = clean_text(
            find_first_value(
                data,
                [
                    "name",
                    "title",
                    "course",
                    "course_name",
                    "courseName",
                    "subject",
                    "subject_name",
                    "subjectName",
                ],
            )
        )

        if not code:
            code = extract_subject_code(json.dumps(data, default=str))

        if code:
            subjects[code] = name or subjects.get(code) or code

        for item in data.values():
            collect_subjects(item, subjects)

    elif isinstance(data, list):
        for item in data:
            collect_subjects(item, subjects)


def guess_subject_name(subject_code: str, subject_lookup: dict[str, str], *values: Any):
    if subject_code and subject_lookup.get(subject_code):
        return subject_lookup[subject_code]

    text = " ".join(clean_text(value) for value in values if value is not None)

    if subject_code and subject_code in text:
        after_code = text.split(subject_code, 1)[1]
        match = re.search(r"[-:]\s*([^|]{3,90})", after_code)

        if match:
            return clean_text(match.group(1))

    return subject_code or "PESU Academy Materials"


def looks_like_material_text(*values: Any):
    text = " ".join(clean_text(value).lower() for value in values if value is not None)

    if not text:
        return False

    if EXTENSION_RE.search(text):
        return True

    return any(keyword in text for keyword in MATERIAL_KEYWORDS)


def collect_json_materials(
    value: Any,
    subject_lookup: dict[str, str],
    materials: list[dict[str, Any]],
    seen: set[str],
    context: dict[str, str] | None = None,
):
    context = context or {}
    data = serialize(value)

    if isinstance(data, list):
        for item in data:
            collect_json_materials(item, subject_lookup, materials, seen, context)

        return

    if not isinstance(data, dict):
        return

    subject_code = clean_text(
        find_first_value(
            data,
            ["subjectCode", "subject_code", "courseCode", "course_code", "code"],
        )
        or context.get("subjectCode")
        or ""
    )
    subject_code = subject_code or extract_subject_code(json.dumps(data, default=str))
    subject_name = clean_text(
        find_first_value(
            data,
            ["subjectName", "subject_name", "courseName", "course_name", "subject", "course"],
        )
        or context.get("subjectName")
        or ""
    )
    title = clean_text(
        find_first_value(
            data,
            [
                "title",
                "name",
                "fileName",
                "filename",
                "documentName",
                "displayText",
                "sectionName",
                "contentHeading",
                "resourceName",
                "materialName",
                "contentName",
            ],
        )
    )
    description = clean_text(
        find_first_value(
            data,
            ["description", "desc", "remarks", "summary", "details", "sectionContentDescription", "objective"],
        )
    )
    raw_url = clean_text(
        find_first_value(
            data,
            [
                "url",
                "href",
                "link",
                "fileUrl",
                "downloadUrl",
                "resourceUrl",
                "documentUrl",
                "sectionContentFilePath",
                "sectionReferenceLink",
                "sectionContentFileId",
            ],
        )
    )
    type_hint = clean_text(
        find_first_value(
            data,
            ["type", "fileType", "mimeType", "extension", "contentType", "sectionContentSubType"],
        )
    )
    unit = clean_text(
        find_first_value(data, ["unit", "module", "chapter", "unitName", "moduleName", "sectionName"])
        or context.get("unit")
        or ""
    )
    blob = json.dumps(data, default=str)
    material_type = normalize_material_type(type_hint, title, raw_url, blob)

    if not unit:
        unit = extract_unit(title, description, blob)

    if title and (raw_url or material_type != "unknown" or looks_like_material_text(title, description, blob)):
        add_material(
            materials,
            seen,
            subject_code=subject_code,
            subject_name=guess_subject_name(subject_code, subject_lookup, subject_name, title, blob),
            unit=unit,
            title=title,
            description=description,
            material_type=material_type,
            raw_reference=raw_url or blob,
            size_label=clean_text(find_first_value(data, ["size", "sizeLabel", "fileSize"])) or extract_size(blob),
            uploaded_at=clean_text(find_first_value(data, ["uploadedAt", "date", "createdAt", "modifiedAt"])) or extract_date(blob),
        )

    next_context = {
        "subjectCode": subject_code or context.get("subjectCode", ""),
        "subjectName": subject_name or context.get("subjectName", ""),
        "unit": unit or context.get("unit", ""),
    }

    for item in data.values():
        collect_json_materials(item, subject_lookup, materials, seen, next_context)


def html_node_text(node: Any):
    try:
        return clean_text(node.get_text(" ", strip=True))
    except Exception:
        return clean_text(node)


def html_node_reference(node: Any):
    values = []

    try:
        attrs = getattr(node, "attrs", {}) or {}

        for key in ["href", "onclick", "data-url", "data-href", "data-file", "data-id"]:
            value = attrs.get(key)

            if value:
                values.append(str(value))
    except Exception:
        pass

    return " ".join(values)


def find_html_subject_context(node: Any, subject_lookup: dict[str, str]):
    current = node

    for _ in range(5):
        if current is None:
            break

        text = html_node_text(current)
        code = extract_subject_code(text)

        if code:
            return code, guess_subject_name(code, subject_lookup, text)

        current = getattr(current, "parent", None)

    return "", ""


def collect_html_menu_candidates(html: str):
    candidates = []

    if BeautifulSoup is None or not html:
        return candidates

    soup = BeautifulSoup(html, "html.parser")

    for node in soup.find_all(["a", "button", "li", "div", "span"]):
        text = html_node_text(node)
        reference = html_node_reference(node)

        if not looks_like_material_text(text, reference):
            continue

        source = unquote(unescape(f"{text} {reference} {str(node)[:600]}"))
        params = parse_query_params(source)

        if params.get("menuId") or params.get("controllerMode"):
            params.setdefault("url", "studentProfilePESUAdmin")
            params.setdefault("id", "0")
            params.setdefault("selectedData", "0")
            candidates.append(params)

    unique = []
    seen = set()

    for params in candidates:
        key = json.dumps(params, sort_keys=True)

        if key not in seen:
            seen.add(key)
            unique.append(params)

    return unique[:8]


def add_discovered_candidate(
    candidates: dict[str, dict[str, str]],
    raw_url: Any,
    base_url: str,
    source: str,
    kind: str,
):
    normalized = normalize_candidate_url(raw_url, base_url)

    if not normalized:
        return

    if not has_material_keyword(normalized):
        return

    if normalized not in candidates:
        candidates[normalized] = {
            "url": normalized,
            "rawUrl": clean_text(raw_url),
            "source": source,
            "kind": kind,
        }


def collect_inline_url_like_strings(source: str):
    text = unquote(unescape(str(source or "")))

    for match in URL_RE.finditer(text):
        yield match.group(0)

    for match in re.finditer(r"""['"]([^'"]{1,500})['"]""", text):
        value = match.group(1)

        if has_material_keyword(value) or "/Academy/" in value:
            yield value

    for match in re.finditer(
        r"""(?:url|href|action|src)\s*[:=]\s*['"]([^'"]{1,500})['"]""",
        text,
        re.I,
    ):
        yield match.group(1)


def collect_material_candidates_from_html(html: str, page_url: str, source: str):
    candidates: dict[str, dict[str, str]] = {}

    if not html:
        return []

    if BeautifulSoup is not None:
        soup = BeautifulSoup(html, "html.parser")

        for node in soup.find_all(True):
            node_name = clean_text(getattr(node, "name", "node")) or "node"
            attrs = getattr(node, "attrs", {}) or {}
            node_text = html_node_text(node)

            for attr_name in [
                "href",
                "action",
                "src",
                "data-url",
                "data-href",
                "data-action",
                "data-file",
                "data-src",
                "onclick",
            ]:
                attr_value = attrs.get(attr_name)

                if not attr_value:
                    continue

                context = f"{node_text} {attr_name} {attr_value}"

                if has_material_keyword(context):
                    add_discovered_candidate(
                        candidates,
                        attr_value,
                        page_url,
                        source,
                        f"{node_name}.{attr_name}",
                    )

            if node_name == "script":
                inline_script = str(node.string or "")

                for value in collect_inline_url_like_strings(inline_script):
                    add_discovered_candidate(
                        candidates,
                        value,
                        page_url,
                        source,
                        "script.inline",
                    )

    else:
        for value in collect_inline_url_like_strings(html):
            add_discovered_candidate(candidates, value, page_url, source, "html")

    return list(candidates.values())


async def discover_material_endpoints(session: Any, base_url: str):
    headers = {
        "x-requested-with": "XMLHttpRequest",
        "referer": base_url,
    }
    discovered: dict[str, dict[str, str]] = {}

    for raw_url in KNOWN_MATERIAL_CANDIDATE_URLS:
        add_discovered_candidate(
            discovered,
            raw_url,
            PORTAL_HOME_URL,
            "known-material-candidate",
            "seed",
        )

    for request in KNOWN_POST_LOGIN_REQUESTS:
        request_url = normalize_candidate_url(request["url"], base_url)

        if not request_url:
            continue

        params = {
            **(request.get("params") or {}),
            "_": str(int(time.time() * 1000)),
        }

        try:
            response = await maybe_await(
                session.get(
                    request_url,
                    params=params,
                    headers=headers,
                )
            )
            content_type = get_response_content_type(response)
            content_length = get_response_content_length(response)
            html = ""

            if is_text_like_content_type(content_type):
                html = await response_to_text(response)
                content_length = len(str(html or ""))

            debug(
                "materials-discovery-page",
                source=request["name"],
                url=safe_url_for_debug(request_url),
                statusCode=get_response_status(response),
                contentType=content_type,
                responseLength=content_length,
            )

            page_candidates = collect_material_candidates_from_html(
                html,
                request_url,
                request["name"],
            )

            for candidate in page_candidates:
                discovered[candidate["url"]] = candidate
        except Exception as error:
            debug(
                "materials-discovery-page",
                source=request["name"],
                url=safe_url_for_debug(request_url),
                status=type(error).__name__,
            )

    compact_candidates = [
        safe_url_for_debug(candidate["url"])
        for candidate in list(discovered.values())[:40]
    ]

    debug(
        "materials-discovery-candidates",
        count=len(discovered),
        candidates=compact_candidates,
    )

    return list(discovered.values())


async def probe_candidate_endpoints(session: Any, candidates: list[dict[str, str]]):
    headers = {
        "x-requested-with": "XMLHttpRequest",
        "referer": PORTAL_HOME_URL,
    }

    for candidate in candidates[:20]:
        url = candidate.get("url", "")
        raw_url = candidate.get("rawUrl") or url

        if not url:
            continue

        if is_probably_download_url(url):
            debug(
                "materials-candidate-probe",
                rawUrl=raw_url,
                normalizedUrl=url,
                source=candidate.get("source", ""),
                kind=candidate.get("kind", ""),
                status="skipped-download-like-url",
            )
            continue

        try:
            response = await maybe_await(
                session.get(
                    url,
                    headers=headers,
                )
            )
            content_type = get_response_content_type(response)
            response_length = get_response_content_length(response)
            has_keywords = False

            if is_text_like_content_type(content_type):
                text = await response_to_text(response)
                response_length = len(str(text or ""))
                has_keywords = has_material_keyword(text)

            debug(
                "materials-candidate-probe",
                rawUrl=raw_url,
                normalizedUrl=url,
                source=candidate.get("source", ""),
                kind=candidate.get("kind", ""),
                statusCode=get_response_status(response),
                contentType=content_type,
                responseLength=response_length,
                hasMaterialKeywords=has_keywords,
            )
        except Exception as error:
            debug(
                "materials-candidate-probe",
                rawUrl=raw_url,
                normalizedUrl=url,
                source=candidate.get("source", ""),
                kind=candidate.get("kind", ""),
                status=type(error).__name__,
            )


def collect_html_materials(
    html: str,
    subject_lookup: dict[str, str],
    materials: list[dict[str, Any]],
    seen: set[str],
):
    if BeautifulSoup is None or not html:
        return

    soup = BeautifulSoup(html, "html.parser")

    for node in soup.select("a, button, tr, li, div[onclick], span[onclick], [data-url], [data-href]"):
        text = html_node_text(node)
        reference = html_node_reference(node)

        if len(text) > 900 and not EXTENSION_RE.search(reference):
            continue

        if not looks_like_material_text(text, reference):
            continue

        title = text

        if getattr(node, "name", None) == "tr":
            cells = [html_node_text(cell) for cell in node.find_all(["td", "th"])]
            title = next((cell for cell in cells if looks_like_material_text(cell, reference)), text)

        if not title:
            continue

        subject_code, subject_name = find_html_subject_context(node, subject_lookup)
        subject_code = subject_code or extract_subject_code(text, reference)
        subject_name = subject_name or guess_subject_name(subject_code, subject_lookup, text)

        add_material(
            materials,
            seen,
            subject_code=subject_code,
            subject_name=subject_name,
            unit=extract_unit(text, reference),
            title=title,
            description="" if title == text else text,
            material_type=normalize_material_type(reference, title),
            raw_reference=reference or title,
            size_label=extract_size(text, reference),
            uploaded_at=extract_date(text, reference),
        )


def has_elearning_js_keyword(value: Any):
    return bool(ELEARNING_JS_KEYWORD_RE.search(clean_text(value)))


def decode_js_string_literal(value: Any):
    text = str(value or "").replace("\\/", "/")

    try:
        return bytes(text, "utf-8").decode("unicode_escape")
    except Exception:
        return text


def find_matching_delimiter(
    text: str,
    start_index: int,
    open_char: str,
    close_char: str,
    max_chars: int = 8000,
):
    depth = 0
    quote = ""
    escaped = False
    end_index = min(len(text), start_index + max_chars)

    for index in range(start_index, end_index):
        char = text[index]

        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = ""

            continue

        if char in {"'", '"', "`"}:
            quote = char
        elif char == open_char:
            depth += 1
        elif char == close_char:
            depth -= 1

            if depth == 0:
                return index + 1

    return end_index


def looks_like_elearning_endpoint_string(value: Any):
    text = clean_text(value)

    if not text or len(text) > 500:
        return False

    if any(marker in text for marker in ["<", ">", "\n", "\r"]):
        return False

    lowered = text.lower()

    if lowered.startswith(("#", "data:", "javascript:", "mailto:", "tel:")):
        return False

    if lowered.endswith((".png", ".jpg", ".jpeg", ".gif", ".svg", ".css")):
        return False

    if lowered.startswith(
        (
            "http://",
            "https://",
            "www.",
            "pesuacademy.com",
            "/academy/",
            "../",
            "./",
        )
    ):
        return True

    if "/" in text:
        return True

    return bool(re.search(r"\.(?:html|json|jsp|do|action)(?:[?#]|$)", text, re.I))


def normalize_elearning_js_url(raw_url: Any):
    text = clean_text(unquote(unescape(str(raw_url or "")))).strip()

    if not text:
        return ""

    if text == "instituteApp":
        return normalize_pesu_url("/Academy/a/instituteApp")

    if re.match(r"(?i)^[A-Za-z][\w-]*App$", text):
        return normalize_pesu_url(f"/Academy/a/{text}")

    if re.match(r"(?i)^i/[A-Za-z0-9_./-]+$", text):
        return normalize_pesu_url(f"/Academy/a/{text}")

    if "${" in text and "download" not in text.lower():
        return ""

    return normalize_pesu_url(text, PORTAL_HOME_URL)


def parse_js_object_literal_fields(object_literal: str):
    fields: dict[str, str] = {}

    for match in ELEARNING_OBJECT_FIELD_RE.finditer(object_literal or ""):
        key = match.group("key").strip().strip("'\"")
        raw_value = match.group("value").strip()

        if is_sensitive_query_key(key):
            continue

        if raw_value in {"elearningmenuId"}:
            value = "200"
        elif raw_value.lower() == "true":
            value = "true"
        elif raw_value.lower() == "false":
            value = "false"
        elif raw_value.lower() == "null":
            value = ""
        elif raw_value.startswith(("'", '"')) and raw_value.endswith(("'", '"')):
            value = decode_js_string_literal(raw_value[1:-1])
        else:
            value = raw_value

        clean_value = clean_text(value)

        if clean_value and len(clean_value) <= 120:
            fields[key] = clean_value

    return fields


def find_previous_js_object_literal(js: str, var_name: str, before_index: int):
    if not var_name:
        return ""

    search_start = max(0, before_index - 2800)
    prefix = js[search_start:before_index]
    pattern = re.compile(rf"(?:var|let|const)?\s*{re.escape(var_name)}\s*=\s*\{{", re.I)
    matches = list(pattern.finditer(prefix))

    if not matches:
        return ""

    start = search_start + matches[-1].end() - 1
    end = find_matching_delimiter(js, start, "{", "}", max_chars=3600)
    literal = js[start:end]

    if literal.startswith("{") and literal.endswith("}"):
        return literal

    return ""


def iter_elearning_call_fragments(js: str):
    for match in ELEARNING_AJAX_CALL_RE.finditer(js or ""):
        start = match.end() - 1
        end = find_matching_delimiter(js, start, "(", ")", max_chars=6500)
        yield clean_text(match.group("kind")), js[match.start() : end]


def collect_elearning_literal_candidates(js: str):
    for match in ELEARNING_URL_ACTION_RE.finditer(js or ""):
        value = decode_js_string_literal(match.group("value"))

        if has_elearning_js_keyword(value) and looks_like_elearning_endpoint_string(value):
            yield value, "url-action", "url-or-action"

    for kind, fragment in iter_elearning_call_fragments(js):
        fragment_has_keyword = has_elearning_js_keyword(fragment)

        for match in ELEARNING_JS_STRING_RE.finditer(fragment):
            value = decode_js_string_literal(match.group("value"))

            if not looks_like_elearning_endpoint_string(value):
                continue

            if has_elearning_js_keyword(value) or fragment_has_keyword:
                yield value, "ajax-call", kind

    for match in ELEARNING_JS_STRING_RE.finditer(js or ""):
        value = decode_js_string_literal(match.group("value"))

        if has_elearning_js_keyword(value) and looks_like_elearning_endpoint_string(value):
            yield value, "keyword-string", "string"


def add_elearning_js_candidate(
    candidates: dict[str, dict[str, Any]],
    raw_url: Any,
    *,
    source: str,
    kind: str,
    method: str = "",
    form_data: dict[str, str] | None = None,
    ajax_like: bool = False,
):
    form_data = form_data or {}
    normalized = normalize_elearning_js_url(raw_url)

    if not normalized:
        return

    method = clean_text(method).upper()
    candidate_key = json.dumps(
        [
            normalized,
            method,
            sorted(form_data.items()),
            source,
            kind,
        ],
        sort_keys=True,
    )

    if candidate_key in candidates:
        return

    candidate = {
        "url": normalized,
        "rawUrl": clean_text(raw_url),
        "source": source,
        "kind": kind,
        "method": method,
        "formData": form_data,
        "ajaxLike": ajax_like or "/Academy/a/" in urlparse(normalized).path,
        "index": len(candidates),
    }
    candidates[candidate_key] = candidate

    debug(
        "elearning-js-candidate",
        raw=raw_url,
        normalizedUrl=normalized,
        source=source,
        kind=kind,
        method=method or "GET",
        controllerMode=form_data.get("controllerMode", ""),
        actionType=form_data.get("actionType", ""),
        page=form_data.get("page", ""),
    )


def collect_elearning_do_ajax_candidates(js: str, candidates: dict[str, dict[str, Any]]):
    for match in ELEARNING_DO_AJAX_CALL_RE.finditer(js or ""):
        endpoint = decode_js_string_literal(match.group("endpoint"))
        method = clean_text(match.group("method")).upper()
        data_var = match.group("data_var")
        object_literal = find_previous_js_object_literal(js, data_var, match.start())
        form_data = parse_js_object_literal_fields(object_literal)
        context = js[max(0, match.start() - 900) : min(len(js), match.end() + 900)]

        if form_data.get("controllerMode") != "9935" and not has_elearning_js_keyword(context):
            continue

        add_elearning_js_candidate(
            candidates,
            endpoint,
            source="doAjaxCall",
            kind=f"action-{form_data.get('actionType', 'unknown')}",
            method=method,
            form_data=form_data,
            ajax_like=True,
        )


def looks_like_json_response(text: str, content_type: str):
    stripped = str(text or "").strip()

    if not stripped:
        return False

    if "json" not in clean_text(content_type).lower() and stripped[:1] not in {"{", "["}:
        return False

    try:
        json.loads(stripped)
        return True
    except Exception:
        return False


def collect_materials_from_probe_text(
    text: str,
    content_type: str,
    subject_lookup: dict[str, str],
    materials: list[dict[str, Any]],
    seen: set[str],
):
    if not text:
        return

    if looks_like_json_response(text, content_type):
        try:
            collect_json_materials(json.loads(text), subject_lookup, materials, seen)
            return
        except Exception:
            pass

    if has_material_keyword(text) or EXTENSION_RE.search(text):
        collect_html_materials(text, subject_lookup, materials, seen)


def elearning_probe_sort_key(candidate: dict[str, Any]):
    form_data = candidate.get("formData") or {}
    action_type = clean_text(form_data.get("actionType", ""))
    priority = ELEARNING_ACTION_PRIORITY.get(action_type, 100)

    return (
        priority,
        0 if candidate.get("method") == "POST" else 1,
        int(candidate.get("index") or 0),
    )


def group_based_category_key_matches(key: Any):
    lowered = clean_text(key).lower()
    return any(marker in lowered for marker in GROUP_BASED_CATEGORY_MATCH_KEYS)


def group_based_category_id_key_matches(key: Any):
    return clean_text(key).replace("_", "").lower() in GROUP_BASED_CATEGORY_ID_KEYS


def find_group_based_category_name(item: dict[str, Any]):
    for key in GROUP_BASED_CATEGORY_NAME_KEYS:
        value = find_first_value(item, [key])

        if value is not None:
            return safe_optional_text(value, 140)

    for key, value in item.items():
        if "name" in clean_text(key).lower():
            return safe_optional_text(value, 140)

    return ""


def iter_group_based_category_matches(value: Any, path: str = "root"):
    data = serialize(value)

    if isinstance(data, dict):
        for key, item in data.items():
            key_text = clean_text(key)
            next_path = f"{path}.{key_text}" if path else key_text

            if group_based_category_key_matches(key_text):
                yield {
                    "path": next_path,
                    "key": key_text,
                    "valueType": type(item).__name__,
                }

            yield from iter_group_based_category_matches(item, next_path)
    elif isinstance(data, list):
        for index, item in enumerate(data):
            yield from iter_group_based_category_matches(item, f"{path}[{index}]")


def iter_group_based_category_ids(value: Any, path: str = "root"):
    data = serialize(value)

    if isinstance(data, dict):
        name = find_group_based_category_name(data)

        for key, item in data.items():
            if group_based_category_id_key_matches(key) and item is not None:
                id_value = safe_optional_text(item, 120)

                if id_value:
                    yield {
                        "id": id_value,
                        "name": name,
                    }

            yield from iter_group_based_category_ids(item, f"{path}.{clean_text(key)}")
    elif isinstance(data, list):
        for index, item in enumerate(data):
            yield from iter_group_based_category_ids(item, f"{path}[{index}]")


async def inspect_group_based_category(session: Any):
    debug_log = debug
    try:
        response = await maybe_await(
            session.get(
                GROUP_BASED_CATEGORY_URL,
                headers={
                    "x-requested-with": "XMLHttpRequest",
                    "referer": PORTAL_ADMIN_URL,
                },
            )
        )

        import json

        raw_text = response.text

        debug_log(
            "groupBasedcategory-raw",
            preview=raw_text[:500],
        )

        try:
            data = json.loads(raw_text)
        except Exception:
            data = raw_text

        if isinstance(data, str):
            try:
                data = json.loads(data)
            except Exception:
                pass

        debug_log(
            "groupBasedcategory-summary",
            topLevelType=type(data).__name__,
            itemCount=len(data) if hasattr(data, "__len__") else None,
        )

        if isinstance(data, list):
            for item in data[:5]:
                debug_log(
                    "groupBasedcategory-item",
                    data=str(item)[:500],
                )

        seen_matches = set()

        for match in iter_group_based_category_matches(data):
            key = (match["path"], match["key"], match["valueType"])

            if key in seen_matches:
                continue

            seen_matches.add(key)
            debug(
                "groupBasedcategory-match",
                path=match["path"],
                key=match["key"],
                valueType=match["valueType"],
            )

        seen_ids = set()

        for candidate in iter_group_based_category_ids(data):
            key = (candidate["id"], candidate["name"])

            if key in seen_ids:
                continue

            seen_ids.add(key)
            debug(
                "groupBasedcategory-id",
                id=candidate["id"],
                name=candidate["name"],
            )

        return data
    except Exception as exc:
        import traceback
        debug_log(
            "groupBasedcategory-error",
            errorType=type(exc).__name__,
            error=str(exc),
        )
        debug_log(
            "groupBasedcategory-traceback",
            traceback=traceback.format_exc()[:2000],
        )
        raise


async def probe_elearning_endpoint(
    session: Any,
    *,
    method: str,
    url: str,
    payload: dict[str, str] | None = None,
    payload_kind: str = "empty",
    subject_lookup: dict[str, str],
    materials: list[dict[str, Any]],
    seen: set[str],
):
    method = clean_text(method).upper() or "GET"
    payload = payload or {}

    if not url:
        return

    if is_probably_download_url(url):
        debug(
            "elearning-endpoint-probe",
            method=method,
            url=url,
            payloadKind=payload_kind,
            status="skipped-download-like-url",
            statusCode=None,
            contentType="",
            responseLength=0,
            looksLikeJson=False,
            hasMaterialKeywords=False,
        )
        return

    headers = {
        "x-requested-with": "XMLHttpRequest",
        "content-type": "application/x-www-form-urlencoded",
        "referer": PORTAL_ADMIN_URL,
    }

    try:
        if method == "POST":
            response = await maybe_await(
                session.post(
                    url,
                    data=payload,
                    headers=headers,
                )
            )
        else:
            response = await maybe_await(
                session.get(
                    url,
                    params=payload or None,
                    headers=headers,
                )
            )

        content_type = get_response_content_type(response)
        response_length = get_response_content_length(response)
        response_text = ""
        looks_like_json = False
        has_keywords = False

        if is_text_like_content_type(content_type):
            response_text = await response_to_text(response)
            response_length = len(str(response_text or ""))
            looks_like_json = looks_like_json_response(response_text, content_type)
            has_keywords = has_material_keyword(response_text)
            collect_materials_from_probe_text(
                response_text,
                content_type,
                subject_lookup,
                materials,
                seen,
            )

        debug(
            "elearning-endpoint-probe",
            method=method,
            url=url,
            payloadKind=payload_kind,
            statusCode=get_response_status(response),
            contentType=content_type,
            responseLength=response_length,
            looksLikeJson=looks_like_json,
            hasMaterialKeywords=has_keywords,
        )
    except Exception as error:
        debug(
            "elearning-endpoint-probe",
            method=method,
            url=url,
            payloadKind=payload_kind,
            status=type(error).__name__,
            statusCode=None,
            contentType="",
            responseLength=0,
            looksLikeJson=False,
            hasMaterialKeywords=False,
        )


async def inspect_elearning_js(
    session: Any,
    subject_lookup: dict[str, str] | None = None,
    materials: list[dict[str, Any]] | None = None,
    seen: set[str] | None = None,
):
    subject_lookup = subject_lookup or {}
    materials = materials if materials is not None else []
    seen = seen if seen is not None else set()
    starting_material_count = len(materials)
    candidates: dict[str, dict[str, Any]] = {}

    try:
        response = await maybe_await(
            session.get(
                ELEARNING_JS_URL,
                headers={
                    "referer": PORTAL_ADMIN_URL,
                },
            )
        )
        content_type = get_response_content_type(response)
        js = await response_to_text(response) if is_text_like_content_type(content_type) else ""
        response_length = len(str(js or "")) if js else await get_response_debug_length(response)

        debug(
            "elearning-js-fetch",
            statusCode=get_response_status(response),
            responseLength=response_length,
        )
    except Exception as error:
        debug(
            "elearning-js-fetch",
            status=type(error).__name__,
            statusCode=None,
            responseLength=0,
        )
        return {
            "fetched": False,
            "candidateCount": 0,
            "materialCount": 0,
        }

    for raw_url, source, kind in collect_elearning_literal_candidates(js):
        add_elearning_js_candidate(
            candidates,
            raw_url,
            source=source,
            kind=kind,
            method="GET",
            ajax_like=source in {"ajax-call", "url-action"},
        )

    collect_elearning_do_ajax_candidates(js, candidates)

    unique_endpoint_candidates: dict[str, dict[str, Any]] = {}

    for candidate in candidates.values():
        unique_endpoint_candidates.setdefault(candidate["url"], candidate)

    for candidate in unique_endpoint_candidates.values():
        url = candidate.get("url", "")
        ajax_like = bool(candidate.get("ajaxLike"))

        await probe_elearning_endpoint(
            session,
            method="GET",
            url=url,
            payload_kind="empty",
            subject_lookup=subject_lookup,
            materials=materials,
            seen=seen,
        )

        if ajax_like:
            await probe_elearning_endpoint(
                session,
                method="POST",
                url=url,
                payload={},
                payload_kind="empty",
                subject_lookup=subject_lookup,
                materials=materials,
                seen=seen,
            )

    form_candidates = sorted(
        [
            candidate
            for candidate in candidates.values()
            if candidate.get("formData") and candidate.get("method")
        ],
        key=elearning_probe_sort_key,
    )

    for candidate in form_candidates[:ELEARNING_ENDPOINT_PROBE_LIMIT]:
        await probe_elearning_endpoint(
            session,
            method=candidate.get("method", "GET"),
            url=candidate.get("url", ""),
            payload=candidate.get("formData") or {},
            payload_kind="js-formdata",
            subject_lookup=subject_lookup,
            materials=materials,
            seen=seen,
        )

    return {
        "fetched": True,
        "candidateCount": len(candidates),
        "materialCount": len(materials) - starting_material_count,
    }


async def fetch_course_subject_lookup(pesu: Any):
    subjects = {}
    courses_result = await safe_call(lambda: pesu.get_courses())

    if courses_result.get("ok"):
        collect_subjects(courses_result.get("data"), subjects)

    return subjects


def get_candidate_method_names(pesu: Any):
    method_names = []

    for name in dir(pesu):
        lower_name = name.lower()

        if name.startswith("_") or any(keyword in lower_name for keyword in SKIPPED_METHOD_KEYWORDS):
            continue

        if not any(keyword in lower_name for keyword in MATERIAL_METHOD_KEYWORDS):
            continue

        method = getattr(pesu, name, None)

        if callable(method):
            method_names.append(name)

    return method_names[:10]


async def fetch_wrapper_method_materials(
    pesu: Any,
    subject_lookup: dict[str, str],
    materials: list[dict[str, Any]],
    seen: set[str],
):
    for method_name in get_candidate_method_names(pesu):
        method = getattr(pesu, method_name)
        result = await safe_call(lambda method=method: method())

        if result.get("ok"):
            collect_json_materials(result.get("data"), subject_lookup, materials, seen)
            debug("materials-wrapper-method", method=method_name, status="ok")
        else:
            debug("materials-wrapper-method", method=method_name, status="failed")


async def request_text(http_client: Any, method: str, url: str, **kwargs: Any):
    caller = getattr(http_client, method)
    response = await maybe_await(caller(url, **kwargs))
    return await response_to_text(response)


async def fetch_portal_materials(
    pesu: Any,
    subject_lookup: dict[str, str],
    materials: list[dict[str, Any]],
    seen: set[str],
):
    http_client = find_internal_http_client(pesu)

    if http_client is None:
        raise RuntimeError("Could not find authenticated PESU HTTP client for materials.")

    headers = make_xhr_headers(pesu)
    timestamp = str(int(time.time() * 1000))
    menu_candidates = []
    elearning_js_result = await inspect_elearning_js(
        http_client,
        subject_lookup,
        materials,
        seen,
    )
    discovered_candidates = await discover_material_endpoints(http_client, PORTAL_HOME_URL)
    await probe_candidate_endpoints(http_client, discovered_candidates)

    shell_requests = [
        ("student-profile", PORTAL_HOME_URL),
        ("student-profile-admin", PORTAL_ADMIN_URL),
    ]

    for label, url in shell_requests:
        try:
            html = await request_text(
                http_client,
                "get",
                url,
                params={"_": timestamp},
                headers=headers,
            )
            collect_html_materials(html, subject_lookup, materials, seen)
            menu_candidates.extend(collect_html_menu_candidates(html))
            debug(
                "materials-shell-probe",
                source=label,
                status="ok",
                htmlLength=len(str(html or "")),
            )
        except Exception as error:
            debug("materials-shell-probe", source=label, status=type(error).__name__)

    endpoint_requests = [
        {
            "name": endpoint_name,
            "method": "get",
            "url": f"{ACTION_BASE_URL}/{endpoint_name}",
            "params": {"_": timestamp},
        }
        for endpoint_name in MATERIAL_ENDPOINT_NAMES
    ]

    for candidate in discovered_candidates:
        candidate_url = candidate.get("url", "")

        if not candidate_url or is_probably_download_url(candidate_url):
            continue

        endpoint_requests.append(
            {
                "name": f"discovered-{candidate.get('source', 'candidate')}",
                "method": "get",
                "url": candidate_url,
                "params": None,
            }
        )

    for params in [*menu_candidates, *MATERIAL_MENU_GUESSES]:
        candidate = {
            "url": "studentProfilePESUAdmin",
            "id": "0",
            "selectedData": "0",
            **params,
        }
        endpoint_requests.append(
            {
                "name": "student-profile-admin-menu",
                "method": "post",
                "url": PORTAL_ADMIN_URL,
                "data": candidate,
            }
        )

    for request in endpoint_requests[:24]:
        try:
            if request["method"] == "post":
                html = await request_text(
                    http_client,
                    "post",
                    request["url"],
                    data=request.get("data"),
                    headers=headers,
                )
            else:
                html = await request_text(
                    http_client,
                    "get",
                    request["url"],
                    params=request.get("params"),
                    headers=headers,
                )

            collect_html_materials(html, subject_lookup, materials, seen)

            try:
                collect_json_materials(json.loads(html), subject_lookup, materials, seen)
            except Exception:
                pass

            debug(
                "materials-endpoint-probe",
                source=request["name"],
                url=safe_url_for_debug(request["url"]),
                status="ok",
                htmlLength=len(str(html or "")),
                hasMaterialKeywords=has_material_keyword(html),
            )
        except Exception as error:
            debug(
                "materials-endpoint-probe",
                source=request["name"],
                url=safe_url_for_debug(request["url"]),
                status=type(error).__name__,
            )

    return {
        "elearningJsDiscovered": bool(
            elearning_js_result.get("fetched") and elearning_js_result.get("candidateCount")
        ),
        "elearningMaterialCount": elearning_js_result.get("materialCount", 0),
    }


def build_catalog(materials: list[dict[str, Any]], subject_lookup: dict[str, str]):
    if not materials:
        raise RuntimeError("No PESU material metadata discovered.")

    subject_map: dict[str, dict[str, Any]] = {}

    for material in materials:
        code = clean_text(material.get("subjectCode")) or "PESU-MATERIALS"
        unit = clean_text(material.get("unit")) or "General"

        if code not in subject_map:
            subject_map[code] = {
                "code": code,
                "name": clean_text(material.get("subjectName")) or subject_lookup.get(code) or code,
                "units": [],
            }

        if unit not in subject_map[code]["units"]:
            subject_map[code]["units"].append(unit)

    for subject in subject_map.values():
        subject["units"] = subject["units"] or ["General"]

    return {
        "subjects": list(subject_map.values()),
        "materials": materials,
    }



async def fetch_real_catalog(payload: dict[str, Any]):
    username = payload.get("username")
    password = payload.get("password")

    debug("materials-login-attempt-started")
    await check_login_page_connectivity()

    if PESUAcademy is None:
        debug("materials-login-failure", errorType=type(PESU_IMPORT_ERROR).__name__)
        raise RuntimeError(f"pesuacademy import failed: {type(PESU_IMPORT_ERROR).__name__}")

    pesu = None

    try:
        try:
            pesu = await login_with_pesuacademy_flow(username=username, password=password)
        except Exception as error:
            await debug_login_failure(error)
            raise

        http_client = find_internal_http_client(pesu)
        debug(
            "materials-login-success",
            currentUrl=safe_url_for_debug(find_current_url(pesu, http_client)) or "unavailable",
        )
        await inspect_group_based_category(http_client)

        subject_lookup = await fetch_course_subject_lookup(pesu)
        materials = []
        seen = set()

        await fetch_wrapper_method_materials(pesu, subject_lookup, materials, seen)
        portal_result = await fetch_portal_materials(pesu, subject_lookup, materials, seen)

        if not materials and portal_result.get("elearningJsDiscovered"):
            raise ElearningJsParsingNotImplemented()

        return build_catalog(materials, subject_lookup)
    finally:
        if pesu is not None:
            close_method = getattr(pesu, "close", None)

            if callable(close_method):
                await maybe_await(close_method())


async def handle_catalog_action(payload: dict[str, Any]):
    username = clean_text(payload.get("username"))
    password = payload.get("password")

    if not username or not password:
        return {
            "ok": False,
            "error": "Username and password are required.",
        }

    try:
        catalog = await fetch_real_catalog(payload)

        return {
            "ok": True,
            "source": "pesuacademy",
            "catalog": catalog,
            "warnings": [],
        }
    except ElearningJsParsingNotImplemented as error:
        debug("materials-catalog-fallback", errorType=type(error).__name__)
        return fallback_response([ELEARNING_JS_PARSE_WARNING])
    except Exception as error:
        debug("materials-catalog-fallback", errorType=type(error).__name__)
        return fallback_response()


async def main():
    action = sys.argv[1] if len(sys.argv) > 1 else ""

    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except Exception:
        payload = {}

    if action != "catalog":
        result = {
            "ok": False,
            "error": "Unsupported materials action.",
        }
    else:
        result = await handle_catalog_action(payload)

    print(json.dumps(result))


if __name__ == "__main__":
    asyncio.run(main())
