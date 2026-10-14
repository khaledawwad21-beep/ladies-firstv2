import plistlib
import tempfile
import unittest
from pathlib import Path

from scripts.configure_ios_identity import ADMIN_ID, STORE_ID, configure


class ConfigureIosIdentityTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.project = self.root / "project.pbxproj"
        self.plist = self.root / "Info.plist"
        self.project.write_text(
            "\n".join(
                [
                    f"PRODUCT_BUNDLE_IDENTIFIER = {STORE_ID};",
                    f"PRODUCT_BUNDLE_IDENTIFIER = {STORE_ID}.RunnerTests;",
                    "PRODUCT_BUNDLE_IDENTIFIER = unrelated.bundle;",
                ]
            )
        )
        with self.plist.open("wb") as output:
            plistlib.dump({"CFBundleName": "Runner"}, output)

    def tearDown(self):
        self.temp.cleanup()

    def test_admin_identity_is_distinct_and_display_name_is_arabic(self):
        self.assertEqual(configure("admin", self.project, self.plist), 2)
        project = self.project.read_text()
        self.assertIn(f"PRODUCT_BUNDLE_IDENTIFIER = {ADMIN_ID};", project)
        self.assertIn(f"PRODUCT_BUNDLE_IDENTIFIER = {ADMIN_ID}.RunnerTests;", project)
        self.assertIn("PRODUCT_BUNDLE_IDENTIFIER = unrelated.bundle;", project)
        with self.plist.open("rb") as source:
            settings = plistlib.load(source)
        self.assertEqual(settings["CFBundleDisplayName"], "Ladies First إدارة")
        self.assertIn("NSMicrophoneUsageDescription", settings)

    def test_store_identity_is_stable_when_reapplied_after_admin(self):
        configure("admin", self.project, self.plist)
        self.assertEqual(configure("store", self.project, self.plist), 2)
        project = self.project.read_text()
        self.assertIn(f"PRODUCT_BUNDLE_IDENTIFIER = {STORE_ID};", project)
        self.assertIn(f"PRODUCT_BUNDLE_IDENTIFIER = {STORE_ID}.RunnerTests;", project)

    def test_rejects_unknown_mode_without_editing_project(self):
        original = self.project.read_text()
        with self.assertRaises(ValueError):
            configure("test", self.project, self.plist)
        self.assertEqual(self.project.read_text(), original)


if __name__ == "__main__":
    unittest.main()
