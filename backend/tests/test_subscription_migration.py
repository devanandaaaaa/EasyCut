import unittest

try:
    from sqlalchemy import create_engine, inspect, text
    import app.database as database
except ModuleNotFoundError:
    create_engine = inspect = text = database = None


@unittest.skipIf(database is None, "SQLAlchemy is not installed in this environment")
class SubscriptionMigrationTests(unittest.TestCase):
    def test_upgrade_adds_subscription_data_without_replacing_users(self):
        original_engine = database.engine
        test_engine = create_engine("sqlite:///:memory:")
        database.engine = test_engine
        try:
            with test_engine.begin() as connection:
                connection.execute(text(
                    "CREATE TABLE users (id INTEGER PRIMARY KEY, username VARCHAR(50) NOT NULL, "
                    "email VARCHAR(255) NOT NULL, password_hash VARCHAR(255) NOT NULL, created_at DATETIME)"
                ))
                connection.execute(text(
                    "INSERT INTO users (id, username, email, password_hash) VALUES (7, 'kept', 'kept@example.test', 'hash')"
                ))
                connection.execute(text(
                    "CREATE TABLE projects (id INTEGER PRIMARY KEY, name VARCHAR(150) NOT NULL, "
                    "description VARCHAR(500), created_at DATETIME, owner_id INTEGER NOT NULL, "
                    "video_url TEXT, final_video_url TEXT, editor_settings TEXT)"
                ))
                connection.execute(text(
                    "INSERT INTO projects (id, name, owner_id) VALUES (11, 'existing', 7)"
                ))

            database.initialize_database()

            columns = {column["name"] for column in inspect(test_engine).get_columns("users")}
            self.assertTrue({"subscription_status", "subscription_plan", "subscription_expires_at"}.issubset(columns))
            project_columns = {column["name"] for column in inspect(test_engine).get_columns("projects")}
            self.assertIn("is_saved", project_columns)
            with test_engine.connect() as connection:
                user = connection.execute(text(
                    "SELECT id, username, email, password_hash, subscription_status FROM users WHERE id = 7"
                )).one()
                self.assertEqual(tuple(user), (7, "kept", "kept@example.test", "hash", "free"))
                saved_flag = connection.execute(text(
                    "SELECT is_saved FROM projects WHERE id = 11"
                )).scalar_one()
                self.assertEqual(saved_flag, 1)
            self.assertIn("payment_orders", inspect(test_engine).get_table_names())
        finally:
            test_engine.dispose()
            database.engine = original_engine


if __name__ == "__main__":
    unittest.main()
