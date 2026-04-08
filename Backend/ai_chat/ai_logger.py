"""
AI Terminal + File Logger
=========================
• Terminal  → coloured ANSI output
• File      → clean plain-text log at  logs/ai_activity.log
              (rotates at 5 MB, keeps 5 backups)

Every section shows which user the AI is responding to.
"""
from __future__ import annotations

import json
import logging
import textwrap
from datetime import datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Any, Optional


# ─────────────────────────────── ANSI colour palette ───────────────────────
class C:
    RESET   = "\033[0m"
    BOLD    = "\033[1m"
    DIM     = "\033[2m"

    WHITE   = "\033[97m"
    CYAN    = "\033[96m"
    MAGENTA = "\033[95m"
    BLUE    = "\033[94m"
    YELLOW  = "\033[93m"
    GREEN   = "\033[92m"
    RED     = "\033[91m"
    GREY    = "\033[90m"

    BG_BLUE    = "\033[44m"
    BG_MAGENTA = "\033[45m"
    BG_GREEN   = "\033[42m"
    BG_RED     = "\033[41m"
    BG_YELLOW  = "\033[43m"
    BG_CYAN    = "\033[46m"


# ─────────────────────────────── File logger setup ─────────────────────────
_LOG_DIR  = Path(__file__).resolve().parent.parent / "logs"
_LOG_FILE = _LOG_DIR / "ai_activity.log"

_LOG_DIR.mkdir(exist_ok=True)

_file_logger = logging.getLogger("ai_activity")
_file_logger.setLevel(logging.DEBUG)
_file_logger.propagate = False  # don't bubble up to Django's root logger

if not _file_logger.handlers:
    _handler = RotatingFileHandler(
        _LOG_FILE,
        maxBytes=5 * 1024 * 1024,   # 5 MB
        backupCount=5,
        encoding="utf-8",
    )
    _handler.setFormatter(logging.Formatter("%(message)s"))
    _file_logger.addHandler(_handler)


def _flog(line: str) -> None:
    """Write a single plain-text line to the log file."""
    _file_logger.info(line)


# ─────────────────────────────── helpers ───────────────────────────────────
WIDTH = 72

def _now() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def _user_label(user) -> str:
    """Return a short display string for any user object (or None)."""
    if user is None:
        return "unknown"
    username = getattr(user, "username", None) or getattr(user, "email", None)
    uid = getattr(user, "id", None) or getattr(user, "pk", None)
    if username and uid:
        return f"{username} (id={uid})"
    return str(username or uid or user)

def _indent(text: str, spaces: int = 4) -> str:
    return textwrap.indent(text, " " * spaces)

def _fmt_value(val: Any, depth: int = 0) -> str:
    """Recursively pretty-format a value for terminal display."""
    indent = "  " * depth
    if isinstance(val, dict):
        if not val:
            return f"{C.GREY}{{}}{C.RESET}"
        lines = []
        for k, v in val.items():
            key_str = f"{C.CYAN}{k}{C.RESET}{C.GREY}:{C.RESET}"
            val_str = _fmt_value(v, depth + 1)
            lines.append(f"{indent}  {key_str} {val_str}")
        return "\n" + "\n".join(lines)
    elif isinstance(val, list):
        if not val:
            return f"{C.GREY}[]{C.RESET}"
        lines = []
        for i, item in enumerate(val):
            item_str = _fmt_value(item, depth + 1)
            lines.append(f"{indent}  {C.GREY}[{i}]{C.RESET} {item_str}")
        return "\n" + "\n".join(lines)
    elif isinstance(val, bool):
        color = C.GREEN if val else C.RED
        return f"{color}{val}{C.RESET}"
    elif isinstance(val, (int, float)):
        return f"{C.YELLOW}{val}{C.RESET}"
    elif val is None:
        return f"{C.GREY}null{C.RESET}"
    else:
        s = str(val)
        if len(s) > 200:
            s = s[:200] + "…"
        return f"{C.WHITE}{s}{C.RESET}"

def _fmt_value_plain(val: Any, depth: int = 0) -> str:
    """Same as _fmt_value but with no ANSI — for the log file."""
    indent = "  " * depth
    if isinstance(val, dict):
        if not val:
            return "{}"
        lines = [f"{indent}  {k}: {_fmt_value_plain(v, depth+1)}" for k, v in val.items()]
        return "\n" + "\n".join(lines)
    elif isinstance(val, list):
        if not val:
            return "[]"
        lines = [f"{indent}  [{i}] {_fmt_value_plain(item, depth+1)}" for i, item in enumerate(val)]
        return "\n" + "\n".join(lines)
    else:
        s = str(val) if val is not None else "null"
        if len(s) > 200:
            s = s[:200] + "..."
        return s


# ─────────────────────────────── public API ────────────────────────────────

def log_ai_request(user_message: str, round_num: int, user=None) -> None:
    """Log the beginning of an AI processing cycle."""
    user_str = _user_label(user)
    ts = _now()

    # ── Terminal ──
    print()
    print(f"{C.BLUE}{'═' * WIDTH}{C.RESET}")
    print(
        f"  {C.BG_BLUE}{C.WHITE}{C.BOLD}  🤖  PUP AI  {C.RESET}"
        f"  {C.GREY}Round {round_num}  ·  {ts}{C.RESET}"
        f"  {C.CYAN}User: {C.BOLD}{user_str}{C.RESET}"
    )
    print(f"{C.BLUE}{'═' * WIDTH}{C.RESET}")
    if user_message:
        print(f"  {C.DIM}Message:{C.RESET} {C.WHITE}{user_message[:120]}{C.RESET}")
        print(f"{C.GREY}{'─' * WIDTH}{C.RESET}")
    print()

    # ── File ──
    _flog("")
    _flog("=" * WIDTH)
    _flog(f"  🤖  PUP AI  |  Round {round_num}  |  {ts}  |  User: {user_str}")
    _flog("=" * WIDTH)
    if user_message:
        _flog(f"  Message: {user_message[:300]}")
        _flog("-" * WIDTH)
    _flog("")


def log_tool_call(tool_name: str, args: dict, call_idx: int = 0, user=None) -> None:
    """Log a single tool call with all its arguments."""
    user_str = _user_label(user)
    badge_colour = {
        "get_today_tasks":        C.BG_CYAN,
        "get_tasks":              C.BG_CYAN,
        "get_task_by_id":         C.BG_CYAN,
        "get_overdue_tasks":      C.BG_CYAN,
        "get_daily_load_summary": C.BG_CYAN,
        "find_free_time":         C.BG_YELLOW,
        "get_user_preferences":   C.BG_YELLOW,
        "get_task_crud_rules":    C.BG_YELLOW,
        "respond_to_user":        C.BG_MAGENTA,
    }.get(tool_name, C.BG_BLUE)

    # ── Terminal ──
    print(
        f"  {badge_colour}{C.WHITE}{C.BOLD}  🔧 {tool_name}  {C.RESET}"
        f"  {C.GREY}call #{call_idx + 1}  ·  user: {C.RESET}{C.CYAN}{user_str}{C.RESET}"
    )
    if args:
        print(f"  {C.GREY}┌─ params {'─' * (WIDTH - 12)}┐{C.RESET}")
        for key, val in args.items():
            val_str = _fmt_value(val)
            if "\n" not in val_str:
                print(f"  {C.GREY}│{C.RESET}  {C.CYAN}{key:<30}{C.RESET} {val_str}")
            else:
                print(f"  {C.GREY}│{C.RESET}  {C.CYAN}{key}{C.RESET}")
                for sub_line in val_str.splitlines():
                    print(f"  {C.GREY}│{C.RESET}    {sub_line}")
        print(f"  {C.GREY}└{'─' * (WIDTH - 4)}┘{C.RESET}")
    else:
        print(f"  {C.GREY}│  (no parameters){C.RESET}")
    print()

    # ── File ──
    _flog(f"  🔧 TOOL CALL  [{tool_name}]  call #{call_idx + 1}  |  user: {user_str}")
    if args:
        for key, val in args.items():
            val_str = _fmt_value_plain(val)
            if "\n" not in val_str:
                _flog(f"     {key}: {val_str}")
            else:
                _flog(f"     {key}:")
                for sub in val_str.splitlines():
                    _flog(f"       {sub}")
    else:
        _flog("     (no parameters)")
    _flog("")


def log_tool_result(tool_name: str, result: str, user=None) -> None:
    """Log the result returned by a tool."""
    user_str = _user_label(user)
    lines = result.strip().splitlines()
    shown = lines[:8]
    truncated = len(lines) > 8

    # ── Terminal ──
    print(f"  {C.GREEN}✔ {C.BOLD}{tool_name}{C.RESET} {C.GREY}returned  (user: {user_str}):{C.RESET}")
    for line in shown:
        print(f"     {C.WHITE}{line}{C.RESET}")
    if truncated:
        print(f"     {C.GREY}… ({len(lines) - 8} more lines){C.RESET}")
    print()

    # ── File ──
    _flog(f"  ✔ RESULT  [{tool_name}]  |  user: {user_str}")
    for line in shown:
        _flog(f"     {line}")
    if truncated:
        _flog(f"     ... ({len(lines) - 8} more lines)")
    _flog("")


def log_tool_error(tool_name: str, error: str, user=None) -> None:
    """Log a tool execution error."""
    user_str = _user_label(user)

    # ── Terminal ──
    print(f"  {C.RED}✘ {C.BOLD}{tool_name}{C.RESET} {C.RED}ERROR  (user: {user_str}):{C.RESET} {error}")
    print()

    # ── File ──
    _flog(f"  ✘ ERROR  [{tool_name}]  |  user: {user_str}  |  {error}")
    _flog("")


def log_respond_to_user(args: dict, user=None) -> None:
    """Special logging for the respond_to_user tool (AI's final decision)."""
    user_str = _user_label(user)
    ts = _now()

    message = args.get("message", "")
    choices = args.get("choices", [])

    # ── Terminal ──
    print(f"{C.MAGENTA}{'─' * WIDTH}{C.RESET}")
    print(
        f"  {C.BG_MAGENTA}{C.WHITE}{C.BOLD}  💬  RESPONDING TO: {user_str}  {C.RESET}"
        f"  {C.GREY}{ts}{C.RESET}"
    )
    print(f"{C.MAGENTA}{'─' * WIDTH}{C.RESET}")
    print(f"  {C.BOLD}Message:{C.RESET} {C.WHITE}{message}{C.RESET}")

    if choices:
        print(f"\n  {C.BOLD}Choices ({len(choices)}):{C.RESET}")
        for i, choice in enumerate(choices):
            choice_id = choice.get("id", f"choice_{i+1}")
            actions   = choice.get("actions", [])
            print(f"\n  {C.YELLOW}  [{i+1}] {choice_id}{C.RESET}")
            for j, action in enumerate(actions):
                action_name = action.get("action_name", "unknown")
                params      = action.get("params", {})
                print(f"      {C.CYAN}Action {j+1}: {C.BOLD}{action_name}{C.RESET}")
                for k, v in params.items():
                    val_str = _fmt_value(v)
                    if "\n" not in val_str:
                        print(f"        {C.GREY}{k:<28}{C.RESET} {val_str}")
                    else:
                        print(f"        {C.GREY}{k}{C.RESET}")
                        for sub in val_str.splitlines():
                            print(f"          {sub}")
    else:
        print(f"\n  {C.GREY}(no choices — plain response){C.RESET}")

    print()
    print(f"{C.MAGENTA}{'═' * WIDTH}{C.RESET}")
    print()

    # ── File ──
    _flog("-" * WIDTH)
    _flog(f"  💬  RESPONDING TO: {user_str}  |  {ts}")
    _flog("-" * WIDTH)
    _flog(f"  Message: {message}")
    if choices:
        _flog(f"  Choices ({len(choices)}):")
        for i, choice in enumerate(choices):
            choice_id = choice.get("id", f"choice_{i+1}")
            actions   = choice.get("actions", [])
            _flog(f"    [{i+1}] {choice_id}")
            for j, action in enumerate(actions):
                action_name = action.get("action_name", "unknown")
                params      = action.get("params", {})
                _flog(f"      Action {j+1}: {action_name}")
                for k, v in params.items():
                    plain = _fmt_value_plain(v)
                    if "\n" not in plain:
                        _flog(f"        {k}: {plain}")
                    else:
                        _flog(f"        {k}:")
                        for sub in plain.splitlines():
                            _flog(f"          {sub}")
    _flog("=" * WIDTH)
    _flog("")


def log_validation_warning(action_name: str, error: str, user=None) -> None:
    user_str = _user_label(user)

    # ── Terminal ──
    print(
        f"  {C.BG_YELLOW}{C.BOLD}  ⚠  VALIDATION  {C.RESET}"
        f"  {C.YELLOW}{action_name}  (user: {user_str}){C.RESET}"
    )
    print(f"  {C.YELLOW}{error}{C.RESET}")
    print()

    # ── File ──
    _flog(f"  ⚠ VALIDATION WARNING  [{action_name}]  |  user: {user_str}  |  {error}")
    _flog("")


def log_ai_final_text(text: str, user=None) -> None:
    user_str = _user_label(user)
    ts = _now()

    # ── Terminal ──
    print(f"{C.GREEN}{'─' * WIDTH}{C.RESET}")
    print(
        f"  {C.BG_GREEN}{C.WHITE}{C.BOLD}  💬  Plain Reply → {user_str}  {C.RESET}"
        f"  {C.GREY}{ts}{C.RESET}"
    )
    print(f"{C.GREEN}{'─' * WIDTH}{C.RESET}")
    for line in text.strip().splitlines()[:10]:
        print(f"  {C.WHITE}{line}{C.RESET}")
    if len(text.splitlines()) > 10:
        print(f"  {C.GREY}…{C.RESET}")
    print()

    # ── File ──
    _flog("-" * WIDTH)
    _flog(f"  💬  PLAIN REPLY → {user_str}  |  {ts}")
    _flog("-" * WIDTH)
    for line in text.strip().splitlines()[:10]:
        _flog(f"  {line}")
    if len(text.splitlines()) > 10:
        _flog("  ...")
    _flog("")


def log_rate_limit(retry_after: Optional[int], user=None) -> None:
    user_str = _user_label(user)
    suffix = f"  retry in {retry_after}s" if retry_after else ""

    print(f"\n  {C.BG_RED}{C.WHITE}{C.BOLD}  ⏳  RATE LIMITED  (user: {user_str}){C.RESET}{suffix}")
    print()

    _flog(f"  ⏳ RATE LIMITED  |  user: {user_str}{suffix}")
    _flog("")


def log_max_rounds_reached(rounds: int, user=None) -> None:
    user_str = _user_label(user)

    print(f"  {C.BG_RED}{C.WHITE}{C.BOLD}  ⚠  MAX ROUNDS ({rounds}) REACHED  (user: {user_str}){C.RESET}")
    print()

    _flog(f"  ⚠ MAX ROUNDS ({rounds}) REACHED  |  user: {user_str}")
    _flog("")
