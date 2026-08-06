#!/usr/bin/env python3
"""
pre_tick.py — deterministic STATUS guard for the GCCSAAS cron relay.

Runs BEFORE the LLM agent on every scheduled tick (cron job `script` field).
It owns the safety-critical `READY -> IN_PROGRESS` transition in code, so the
flip can never be skipped or mis-ordered by a drifting model. It also
self-heals a *stale* `IN_PROGRESS` back to `READY`.

stdout contract (the standing prompt reads this as "## Script Output"):
  - When a task is available it prints `TASK_READY` first, then the queued
    task text from handoff/STATUS.md, so the agent has everything it needs.
  - When idle it prints `IDLE: <STATE>`. The agent is expected to reply
    with exactly `[SILENT]` (one cheap silent tick; NOT no_agent mode).

This file lives inside the GCC MENTOR project (D:\\claude work\\GCCSAAS) and
touches only handoff/STATUS.md — nothing outside the project.
"""
import os
import re
import sys
from datetime import datetime, timezone

STATUS_PATH = r"D:\claude work\GCCSAAS\handoff\STATUS.md"
# A run that has held IN_PROGRESS longer than this (seconds) is presumed dead:
# the platform never auto-retries or auto-resumes an interrupted run, so a
# stale IN_PROGRESS would wedge the whole pipeline silently until a human
# clears it. We un-wedge it here in code instead.
STALE_SECONDS = 30 * 60  # 30 minutes

STATE_RE = re.compile(r"^STATE:\s*(.*)$")
IN_PROGRESS_TS_RE = re.compile(r"since\s+(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})")


def read_first_line() -> str:
    with open(STATUS_PATH, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                return line.strip()
    return ""


def replace_first_line(new_first: str) -> None:
    """Replace only line 1 of STATUS.md, preserving the rest byte-for-byte."""
    with open(STATUS_PATH, "r", encoding="utf-8", newline="") as f:
        content = f.read()
    lines = content.split("\n")
    lines[0] = new_first
    with open(STATUS_PATH, "w", encoding="utf-8", newline="") as f:
        f.write("\n".join(lines))


def parse_in_progress_age(first: str, now: datetime) -> float | None:
    """Seconds since the embedded 'IN_PROGRESS since <UTC>' timestamp.

    Falls back to file mtime if the embedded timestamp is missing/parses
    badly. Returns None only if neither is usable.
    """
    m = IN_PROGRESS_TS_RE.search(first)
    if m:
        try:
            date_part, time_part = m.group(1), m.group(2)
            then = datetime.strptime(f"{date_part} {time_part}", "%Y-%m-%d %H:%M:%S")
            then = then.replace(tzinfo=timezone.utc)
            return (now - then).total_seconds()
        except ValueError:
            pass
    try:
        mt = datetime.fromtimestamp(os.path.getmtime(STATUS_PATH), timezone.utc)
        return (now - mt).total_seconds()
    except OSError:
        return None


def queued_task_context() -> str:
    """Return the text of the '## Queued task' section (after the heading)."""
    try:
        with open(STATUS_PATH, "r", encoding="utf-8") as f:
            content = f.read()
    except OSError:
        return ""
    if "## Queued task" not in content:
        return ""
    return content.split("## Queued task", 1)[1].strip()


def main() -> int:
    try:
        first = read_first_line()
    except OSError as e:
        print(f"SCRIPT_ERROR: could not read {STATUS_PATH}: {e}")
        return 1

    now = datetime.now(timezone.utc)
    ts_str = now.strftime("%Y-%m-%d %H:%M:%S UTC")

    # --- Stale IN_PROGRESS recovery (before anything else) -------------
    if first.startswith("STATE: IN_PROGRESS"):
        age = parse_in_progress_age(first, now)
        if age is None or age > STALE_SECONDS:
            # Presumed dead run (or unparseable age). Heal back to READY and
            # continue into the normal READY handling below.
            replace_first_line("STATE: READY")
            first = "STATE: READY"

    # --- READY -> IN_PROGRESS (the deterministic flip) ------------------
    if first == "STATE: READY":
        replace_first_line(f"STATE: IN_PROGRESS since {ts_str}")
        print("TASK_READY")
        task = queued_task_context()
        if task:
            print(task)
        return 0

    # --- Idle: everything else (WAITING / NEEDS_REVIEW / fresh IN_PROGRESS)
    print(f"IDLE: {first}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
