import unittest

from fivucsas_deployer.decision import (Action, Relation, RepoSnapshot, decide, green_shas,
                                        is_sha, newest_in_order, relation_from_compare_status,
                                        rollback_tags_to_prune, should_query)

A, B, C = "a" * 40, "b" * 40, "c" * 40
REPO = "Rollingcat-Software/identity-core-api"


def run(sha, ts, **over):
    r = {"head_sha": sha, "head_branch": "main", "event": "push", "status": "completed",
         "conclusion": "success", "created_at": ts, "head_repository": {"full_name": REPO}}
    r.update(over)
    return r


def snap(**over):
    base = dict(prod_sha=A, prod_branch="main", expected_branch="main", target_sha=B,
                relation=Relation.BEHIND, failed_sha=None, paused=False)
    base.update(over)
    return RepoSnapshot(**base)


class GreenShasTest(unittest.TestCase):
    def test_greenShas_WhenSeveralGreenRuns_ShouldOrderNewestRunFirstWithoutDuplicates(self):
        runs = [run(A, "2026-11-01T10:00:00Z"), run(B, "2026-11-02T10:00:00Z"),
                run(A, "2026-11-01T09:00:00Z")]
        self.assertEqual(green_shas(runs, REPO), [B, A])

    def test_greenShas_WhenRunsAreNotGreenPushesOnMain_ShouldIgnoreThem(self):
        runs = [run(A, "2026-11-05T00:00:00Z", event="pull_request"),
                run(B, "2026-11-05T00:00:00Z", head_branch="feature/x"),
                run(C, "2026-11-05T00:00:00Z", conclusion="failure"),
                run(A, "2026-11-05T00:00:00Z", status="in_progress", conclusion=None)]
        self.assertEqual(green_shas(runs, REPO), [])

    def test_greenShas_WhenHeadRepositoryIsAFork_ShouldIgnoreIt(self):
        runs = [run(A, "t", head_repository={"full_name": "attacker/identity-core-api"}),
                run(B, "t", head_repository=None)]
        self.assertEqual(green_shas(runs, REPO), [])

    def test_greenShas_WhenHeadShaIsNotFullHex_ShouldIgnoreIt(self):
        for bad in ("--upload-pack=x", "a" * 39, "A" * 40, "a" * 40 + chr(10), None, 42):
            with self.subTest(bad=bad):
                self.assertEqual(green_shas([run(bad, "t")], REPO), [])

    def test_greenShas_WhenNoRuns_ShouldReturnEmpty(self):
        self.assertEqual(green_shas([], REPO), [])


class NewestInOrderTest(unittest.TestCase):
    def test_newestInOrder_WhenOlderCommitRanLater_ShouldStillPreferNewerCommitByGitOrder(self):
        # green_shas would put A first (its run is newer); the branch order wins.
        self.assertEqual(newest_in_order([C, B, A], [A, B]), B)

    def test_newestInOrder_WhenGreenCommitNotOnBranch_ShouldIgnoreIt(self):
        self.assertIsNone(newest_in_order([C, B], [A]))

    def test_newestInOrder_WhenTipIsGreen_ShouldReturnTip(self):
        self.assertEqual(newest_in_order([C, B, A], [A, C]), C)


class IsShaTest(unittest.TestCase):
    def test_isSha_WhenFullLowercaseHex_ShouldAcceptOnlyThat(self):
        self.assertTrue(is_sha(A))
        for bad in ("", "-" + "a" * 39, "a" * 41, "g" * 40, None):
            with self.subTest(bad=bad):
                self.assertFalse(is_sha(bad))


class DecideTest(unittest.TestCase):
    def test_decide_WhenProdStrictlyBehindGreen_ShouldDeploy(self):
        self.assertIs(decide(snap()).action, Action.DEPLOY)

    def test_decide_WhenUpToDate_ShouldSkip(self):
        d = decide(snap(target_sha=A, relation=Relation.SAME))
        self.assertIs(d.action, Action.SKIP)
        self.assertEqual(d.reason, "up to date")

    def test_decide_WhenProdAheadOrDiverged_ShouldSkip(self):
        for rel in (Relation.AHEAD, Relation.DIVERGED, Relation.UNKNOWN):
            with self.subTest(rel=rel):
                self.assertIs(decide(snap(relation=rel)).action, Action.SKIP)

    def test_decide_WhenTargetFailedBefore_ShouldHoldUntilNewerCommit(self):
        self.assertIs(decide(snap(failed_sha=B)).action, Action.SKIP)
        self.assertIs(decide(snap(failed_sha=C)).action, Action.DEPLOY)

    def test_decide_WhenPaused_ShouldSkip(self):
        d = decide(snap(paused=True))
        self.assertIs(d.action, Action.SKIP)
        self.assertEqual(d.reason, "paused")

    def test_decide_WhenNoGreenRun_ShouldSkip(self):
        self.assertIs(decide(snap(target_sha=None)).action, Action.SKIP)

    def test_decide_WhenCheckoutOnOtherBranchOrDetached_ShouldSkip(self):
        for branch in ("hotfix", ""):
            with self.subTest(branch=branch):
                self.assertIs(decide(snap(prod_branch=branch)).action, Action.SKIP)


class ShouldQueryTest(unittest.TestCase):
    def test_shouldQuery_WhenNoHistoryOrTipUnknownOrTipMoved_ShouldQuery(self):
        poll = {"tip": A, "at": 0, "target": A, "streak": 0}
        self.assertTrue(should_query(10, A, None, 300))
        self.assertTrue(should_query(10, None, poll, 300))
        self.assertTrue(should_query(10, B, poll, 300))

    def test_shouldQuery_WhenTipAlreadyGreen_ShouldNeverQuery(self):
        poll = {"tip": A, "at": 0, "target": A, "streak": 0}
        self.assertFalse(should_query(10 ** 9, A, poll, 300))

    def test_shouldQuery_WhenTipNotGreenYet_ShouldBackOffExponentiallyUpToMax(self):
        poll = {"tip": B, "at": 1000, "target": A, "streak": 0}
        self.assertFalse(should_query(1299, B, poll, 300))
        self.assertTrue(should_query(1300, B, poll, 300))
        poll["streak"] = 2  # 300 * 4 = 1200 s
        self.assertFalse(should_query(2199, B, poll, 300))
        self.assertTrue(should_query(2200, B, poll, 300))
        poll["streak"] = 10  # capped at one hour
        self.assertTrue(should_query(1000 + 3600, B, poll, 300))


class HelpersTest(unittest.TestCase):
    def test_relationFromCompareStatus_WhenTargetAhead_ShouldMeanProdBehind(self):
        self.assertIs(relation_from_compare_status("ahead"), Relation.BEHIND)
        self.assertIs(relation_from_compare_status("behind"), Relation.AHEAD)
        self.assertIs(relation_from_compare_status("identical"), Relation.SAME)
        self.assertIs(relation_from_compare_status("diverged"), Relation.DIVERGED)
        self.assertIs(relation_from_compare_status("weird"), Relation.UNKNOWN)

    def test_rollbackTagsToPrune_WhenMoreThanKeep_ShouldReturnOldestRollbackTagsOnly(self):
        tags = ["latest", "rollback-3", "rollback-2", "sha-x", "rollback-1"]
        self.assertEqual(rollback_tags_to_prune(tags, keep=2), ["rollback-1"])


if __name__ == "__main__":
    unittest.main()
