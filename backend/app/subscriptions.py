from datetime import datetime, timezone


FREE_PROJECT_LIMIT = 5


def has_active_subscription(user, now: datetime | None = None) -> bool:
    expires_at = user.subscription_expires_at
    if user.subscription_status != "active" or expires_at is None:
        return False
    now = now or datetime.now(timezone.utc)
    if expires_at.tzinfo is None:
        now = now.replace(tzinfo=None)
    return expires_at > now


def project_creation_allowed(project_count: int, subscription_active: bool) -> bool:
    return subscription_active or project_count < FREE_PROJECT_LIMIT
