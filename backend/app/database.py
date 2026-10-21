from sqlalchemy import create_engine
from sqlalchemy import inspect, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "sqlite:///./easycut.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


def initialize_database():
    """Create missing tables and apply safe additive subscription columns."""
    from app.models import Base

    Base.metadata.create_all(bind=engine)

    if engine.dialect.name != "sqlite":
        return

    existing_columns = {
        column["name"] for column in inspect(engine).get_columns("users")
    }
    additions = {
        "subscription_status": "VARCHAR(20) NOT NULL DEFAULT 'free'",
        "subscription_plan": "VARCHAR(40)",
        "subscription_expires_at": "DATETIME",
    }
    with engine.begin() as connection:
        for name, definition in additions.items():
            if name not in existing_columns:
                connection.execute(text(
                    f"ALTER TABLE users ADD COLUMN {name} {definition}"
                ))

        project_columns = {
            column["name"] for column in inspect(connection).get_columns("projects")
        }
        if "is_saved" not in project_columns:
            # Preserve every existing project as saved; new draft inserts set 0.
            connection.execute(text(
                "ALTER TABLE projects ADD COLUMN is_saved BOOLEAN NOT NULL DEFAULT 1"
            ))
