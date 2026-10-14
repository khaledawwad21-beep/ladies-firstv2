#!/usr/bin/env python3
"""Set the generated iOS app's name and distinct store/admin bundle ID."""

from __future__ import annotations

import plistlib
import re
import sys
from pathlib import Path


STORE_ID = "com.ladiesfirst.ladies_first"
ADMIN_ID = f"{STORE_ID}.admin"
PROJECT = Path("ios/Runner.xcodeproj/project.pbxproj")
INFO_PLIST = Path("ios/Runner/Info.plist")


def configure(mode: str, project: Path = PROJECT, info_plist: Path = INFO_PLIST) -> int:
    if mode not in {"store", "admin"}:
        raise ValueError("mode must be 'store' or 'admin'")

    bundle_id = STORE_ID if mode == "store" else ADMIN_ID
    project_text = project.read_text()
    pattern = re.compile(r"(^\s*PRODUCT_BUNDLE_IDENTIFIER\s*=\s*)([^;]+)(;)", re.MULTILINE)
    changed = 0

    def replace(match: re.Match[str]) -> str:
        nonlocal changed
        current = match.group(2).strip()
        test_target = current.endswith(".RunnerTests")
        app_id = current.removesuffix(".RunnerTests")
        if app_id not in {STORE_ID, ADMIN_ID}:
            return match.group(0)
        changed += 1
        return f"{match.group(1)}{bundle_id}{'.RunnerTests' if test_target else ''}{match.group(3)}"

    updated = pattern.sub(replace, project_text)
    if changed == 0:
        raise ValueError(f"No generated Ladies First bundle IDs found in {project}")
    project.write_text(updated)

    with info_plist.open("rb") as source:
        settings = plistlib.load(source)
    display_name = "Ladies First" if mode == "store" else "Ladies First إدارة"
    settings["CFBundleDisplayName"] = display_name
    settings["CFBundleName"] = display_name
    settings["NSMicrophoneUsageDescription"] = (
        "يُستخدم الميكروفون عند طلبك استخدام الإدخال الصوتي في المتجر."
    )
    with info_plist.open("wb") as destination:
        plistlib.dump(settings, destination, fmt=plistlib.FMT_XML, sort_keys=False)
    return changed


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: configure_ios_identity.py store|admin")
    print(f"Updated {configure(sys.argv[1])} iOS bundle identifiers for {sys.argv[1]} app")
