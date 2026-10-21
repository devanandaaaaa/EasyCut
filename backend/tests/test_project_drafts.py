import importlib
import sys
import types
import unittest
from unittest.mock import patch

try:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from fastapi import HTTPException
    from app.models import Base, Project, User
    from app.schemas import ProjectCreate, ProjectSave

    # Import endpoint functions without loading configured JWT secrets. Tests
    # call the functions with explicit users and sessions, not HTTP auth.
    test_security = types.ModuleType("app.security")
    test_security.get_current_user = lambda: None
    test_security.create_access_token = lambda user_id: "test-token"
    with patch.dict(sys.modules, {"app.security": test_security}):
        routes = importlib.import_module("app.routes")
except ModuleNotFoundError:
    create_engine = sessionmaker = HTTPException = Base = Project = User = None
    ProjectCreate = ProjectSave = routes = None


@unittest.skipIf(routes is None, "SQLAlchemy or backend route dependencies are not installed")
class ProjectDraftLifecycleTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.session = sessionmaker(bind=self.engine)()
        self.user = User(username="owner", email="owner@example.test", password_hash="x")
        self.other = User(username="other", email="other@example.test", password_hash="x")
        self.session.add_all([self.user, self.other])
        self.session.commit()
        self.session.refresh(self.user)
        self.session.refresh(self.other)

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def make_draft(self, user=None):
        return routes.create_project(ProjectCreate(name="Draft"), user or self.user, self.session)

    def test_generation_draft_is_not_listed_until_save_and_repeat_save_is_idempotent(self):
        draft = self.make_draft()
        self.assertFalse(draft.is_saved)
        self.assertEqual(routes.get_my_projects(self.user, self.session), [])
        self.assertEqual(routes.get_project_usage(self.user, self.session)["project_count"], 0)
        routes.update_project_draft(
            draft.id,
            ProjectSave(video_url="/generated/draft.mp4", editor_settings={"filter": "warm"}),
            self.user,
            self.session,
        )
        draft_id = draft.id
        user_id = self.user.id
        other_user_id = self.other.id
        self.session.close()
        self.session = sessionmaker(bind=self.engine)()
        self.user = self.session.get(User, user_id)
        self.other = self.session.get(User, other_user_id)
        self.assertEqual(routes.get_project(draft_id, self.user, self.session).video_url, "/generated/draft.mp4")
        self.assertEqual(routes.get_my_projects(self.other, self.session), [])

        saved = routes.save_project_video(
            draft_id,
            ProjectSave(video_url="/generated/draft.mp4"),
            self.user,
            self.session,
        )
        self.assertTrue(saved["is_saved"])
        routes.save_project_video(
            draft_id,
            ProjectSave(editor_settings={"filter": "warm"}),
            self.user,
            self.session,
        )
        self.assertEqual(len(routes.get_my_projects(self.user, self.session)), 1)
        self.assertEqual(routes.get_my_projects(self.other, self.session), [])
        self.assertEqual(self.session.query(Project).filter(Project.owner_id == self.user.id).count(), 1)

    def test_saved_project_limit_is_checked_only_when_draft_is_saved(self):
        self.session.add_all([
            Project(name=f"Saved {index}", owner_id=self.user.id, is_saved=True)
            for index in range(5)
        ])
        self.session.commit()
        draft = self.make_draft()
        self.assertEqual(routes.get_project_usage(self.user, self.session)["project_count"], 5)
        with self.assertRaises(HTTPException) as raised:
            routes.save_project_video(
                draft.id,
                ProjectSave(video_url="/generated/sixth.mp4"),
                self.user,
                self.session,
            )
        self.assertEqual(raised.exception.status_code, 403)
        self.assertFalse(self.session.get(Project, draft.id).is_saved)

    def test_other_user_cannot_list_access_or_save_an_owned_draft(self):
        draft = self.make_draft()
        self.assertEqual(routes.get_my_projects(self.other, self.session), [])
        self.assertEqual(routes.get_project_usage(self.other, self.session)["project_count"], 0)
        with self.assertRaises(HTTPException) as get_error:
            routes.get_project(draft.id, self.other, self.session)
        self.assertEqual(get_error.exception.status_code, 404)
        with self.assertRaises(HTTPException) as save_error:
            routes.save_project_video(
                draft.id,
                ProjectSave(video_url="/generated/other.mp4"),
                self.other,
                self.session,
            )
        self.assertEqual(save_error.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
