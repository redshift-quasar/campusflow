import asyncio
import inspect
import json
import sys
import traceback
from typing import Any

from pesuacademy import PESUAcademy


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
        return {str(key): serialize(item) for key, item in value.items()}

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


async def safe_call(name: str, fn):
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
            "trace": traceback.format_exc(limit=3),
        }


async def main():
    pesu = None

    try:
        payload = json.loads(sys.stdin.read() or "{}")

        username = payload.get("username")
        password = payload.get("password")

        if not username or not password:
            raise ValueError("Username and password are required.")

        pesu = await maybe_await(
            PESUAcademy.login(username=username, password=password)
        )

        available_methods = [
            method
            for method in dir(pesu)
            if not method.startswith("_") and callable(getattr(pesu, method))
        ]

        profile = await safe_call("get_profile", lambda: pesu.get_profile())
        attendance = await safe_call("get_attendance", lambda: pesu.get_attendance())
        courses = await safe_call("get_courses", lambda: pesu.get_courses())
        seating = await safe_call("get_seating_info", lambda: pesu.get_seating_info())

        result = {
            "ok": True,
            "source": "pesu",
            "syncedAt": payload.get("syncedAt"),
            "availableMethods": available_methods,
            "profile": profile,
            "attendance": attendance,
            "courses": courses,
            "seating": seating,
            "note": "This installed pesuacademy version does not expose a timetable method. We are fetching profile, attendance, courses and seating first.",
        }

        print(json.dumps(result))

    except Exception as error:
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": str(error),
                    "trace": traceback.format_exc(limit=6),
                    "classMethods": [
                        method
                        for method in dir(PESUAcademy)
                        if not method.startswith("_")
                    ],
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