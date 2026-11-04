import json
import os
import shutil
import tempfile
import unittest

from fivucsas_deployer.state import InvalidMarker, StateStore

OLD, NEW = "1" * 40, "2" * 40
RECORD = {"old": OLD, "new": NEW, "old_image": "sha256:" + "a" * 64,
          "rollback_tag": f"rollback-{OLD[:12]}", "started": 1}


class StateStoreTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.state = StateStore(self.tmp)

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _write(self, name, content):
        with open(os.path.join(self.tmp, name), "w") as fh:
            fh.write(content)

    def test_failedSha_WhenMarkerHoldsSha_ShouldReturnIt(self):
        self.state.set_failed("r", NEW)
        self.assertEqual(self.state.failed_sha("r"), NEW)

    def test_failedSha_WhenMarkerContentIsNotASha_ShouldRaiseSoTheRepoIsHeld(self):
        for junk in ("", "--upload-pack=x\n", NEW[:12], ("ab" * 20).upper(), NEW + "x"):
            with self.subTest(junk=junk):
                self._write("FAILED.r", junk)
                with self.assertRaises(InvalidMarker):
                    self.state.failed_sha("r")

    def test_clearFailed_WhenMarkerIsJunk_ShouldStillRemoveIt(self):
        self._write("FAILED.r", "junk")
        self.assertEqual(self.state.clear_failed("r"), "junk")
        self.assertIsNone(self.state.failed_sha("r"))

    def test_setFailed_WhenNotASha_ShouldRefuse(self):
        with self.assertRaises(ValueError):
            self.state.set_failed("r", "main")

    def test_inflight_WhenWrittenThenCleared_ShouldRoundTrip(self):
        self.assertIsNone(self.state.inflight("r"))
        self.assertTrue(self.state.set_inflight("r", RECORD))
        self.assertEqual(self.state.inflight("r"), RECORD)
        self.state.clear_inflight("r")
        self.assertIsNone(self.state.inflight("r"))

    def test_inflight_WhenSurvivesARestart_ShouldBeVisibleToANewStore(self):
        self.state.set_inflight("r", RECORD)
        self.assertEqual(StateStore(self.tmp).inflight("r")["new"], NEW)

    def test_inflight_WhenMarkerCorrupt_ShouldRaise(self):
        bad = [("not json", None), (json.dumps(dict(RECORD, old="HEAD")), None),
               (json.dumps(dict(RECORD, old_image="evil:latest")), None),
               (json.dumps(dict(RECORD, rollback_tag="latest")), None),
               (json.dumps(dict(RECORD, new_image="x")), None), (json.dumps([1]), None)]
        for content, _ in bad:
            with self.subTest(content=content):
                self._write("INFLIGHT.r", content)
                with self.assertRaises(InvalidMarker):
                    self.state.inflight("r")

    def test_setInflight_WhenRecordInvalid_ShouldRefuse(self):
        with self.assertRaises(ValueError):
            self.state.set_inflight("r", dict(RECORD, new="--force"))


if __name__ == "__main__":
    unittest.main()
