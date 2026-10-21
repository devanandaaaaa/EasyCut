import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from app.subscriptions import has_active_subscription, project_creation_allowed


class ProjectLimitTests(unittest.TestCase):
    def test_free_users_can_create_below_five_but_not_at_or_above_limit(self):
        for count in (0, 4):
            with self.subTest(count=count):
                self.assertTrue(project_creation_allowed(count, False))
        for count in (5, 6):
            with self.subTest(count=count):
                self.assertFalse(project_creation_allowed(count, False))

    def test_active_subscription_allows_creation_beyond_limit(self):
        self.assertTrue(project_creation_allowed(6, True))

    def test_subscription_must_be_active_and_unexpired(self):
        now = datetime.now(timezone.utc)
        active = SimpleNamespace(
            subscription_status="active",
            subscription_expires_at=now + timedelta(days=1),
        )
        expired = SimpleNamespace(
            subscription_status="active",
            subscription_expires_at=now - timedelta(days=1),
        )
        pending = SimpleNamespace(
            subscription_status="pending",
            subscription_expires_at=now + timedelta(days=1),
        )
        self.assertTrue(has_active_subscription(active, now))
        self.assertFalse(has_active_subscription(expired, now))
        self.assertFalse(has_active_subscription(pending, now))


if __name__ == "__main__":
    unittest.main()
