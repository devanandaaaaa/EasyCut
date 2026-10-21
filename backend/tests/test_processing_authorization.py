import json
import shutil
import unittest
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.models import Base, Project, ProjectFile, User
from app.processing.routes import retry_video_indexing, router as processing_router
from app.routes import get_db
from app.security import create_access_token


class ProcessingRouteAuthorizationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.project_root = Path(__file__).resolve().parents[2]
        cls.source_root = cls.project_root / "data" / "source_videos"

    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()
        self.owner = User(username="owner", email="owner@test.invalid", password_hash="x")
        self.other = User(username="other", email="other@test.invalid", password_hash="x")
        self.db.add_all([self.owner, self.other])
        self.db.commit()
        self.db.refresh(self.owner)
        self.db.refresh(self.other)
        self.owner_token = create_access_token(self.owner.id)
        self.other_token = create_access_token(self.other.id)

        app = FastAPI()
        app.include_router(processing_router)

        def override_db():
            yield self.db

        app.dependency_overrides[get_db] = override_db
        self.client = TestClient(app)
        self.sessionlocal_patch = patch("app.security.SessionLocal", self.Session)
        self.sessionlocal_patch.start()

        self.source_root.mkdir(parents=True, exist_ok=True)
        self.source_file = self.source_root / f"auth-test-{uuid4().hex}.mp4"
        self.source_file.write_bytes(b"fixture source video")
        self.project = Project(
            name="Owner project",
            owner_id=self.owner.id,
            video_url="/generated/owned-output.mp4",
            editor_settings=json.dumps({"timelineClips": []}),
        )
        self.db.add(self.project)
        self.db.commit()
        self.db.refresh(self.project)
        self.db.add(ProjectFile(
            project_id=self.project.id,
            original_name=self.source_file.name,
            stored_path=str(self.source_file.resolve()),
            file_type="video/mp4",
        ))
        self.db.add(ProjectFile(
            project_id=self.project.id,
            original_name="owned-output.mp4",
            stored_path=str((self.project_root / "data" / "generated" / "owned-output.mp4").resolve()),
            file_type="video/mp4",
        ))
        self.db.commit()

    def tearDown(self):
        self.client.close()
        self.sessionlocal_patch.stop()
        self.db.close()
        self.engine.dispose()
        self.source_file.unlink(missing_ok=True)

    def headers(self, token):
        return {"Authorization": f"Bearer {token}"}

    def test_health_is_public_but_private_processing_routes_require_auth(self):
        self.assertEqual(self.client.get("/processing/health").status_code, 200)
        self.assertEqual(
            self.client.post("/processing/script", json={
                "project_id": self.project.id,
                "script": "A story",
                "source_videos": [str(self.source_file)],
            }).status_code,
            401,
        )
        self.assertEqual(
            self.client.post(
                "/processing/upload-video",
                data={"project_id": str(self.project.id)},
                files={"video": ("clip.mp4", b"video", "video/mp4")},
            ).status_code,
            401,
        )
        self.assertEqual(
            self.client.post(
                f"/processing/retry-indexing/{self.source_file.name}?project_id={self.project.id}"
            ).status_code,
            401,
        )
        self.assertEqual(
            self.client.post(
                "/processing/voiceover",
                data={
                    "project_id": str(self.project.id),
                    "source_videos": json.dumps([str(self.source_file)]),
                },
                files={"voiceover": ("narration.wav", b"audio", "audio/wav")},
            ).status_code,
            401,
        )
        self.assertEqual(
            self.client.post("/processing/edit-video", json={
                "project_id": self.project.id,
                "video_url": "/generated/owned-output.mp4",
                "trim_start": 0,
                "trim_end": 1,
            }).status_code,
            401,
        )

    def test_authenticated_script_generation_receives_only_owned_sources(self):
        with patch("app.processing.routes.generate_video_from_script", return_value={
            "final_video": "/generated/script-result.mp4",
        }) as generate:
            response = self.client.post(
                "/processing/script",
                headers=self.headers(self.owner_token),
                json={
                    "project_id": self.project.id,
                    "script": "A story",
                    "source_videos": [str(self.source_file)],
                },
            )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(generate.call_args.kwargs["source_videos"], [str(self.source_file.resolve())])

    def test_authenticated_upload_is_recorded_on_the_owned_project(self):
        uploaded_filename = None
        try:
            with patch("app.processing.routes.extract_frame_samples", return_value=[]), \
                 patch("app.processing.routes.index_extracted_frames", return_value=[]):
                response = self.client.post(
                    "/processing/upload-video",
                    headers=self.headers(self.owner_token),
                    data={"project_id": str(self.project.id)},
                    files={"video": ("new-source.mp4", b"mock video", "video/mp4")},
                )
            self.assertEqual(response.status_code, 200, response.text)
            uploaded_filename = response.json()["filename"]
            stored = self.db.query(ProjectFile).filter(
                ProjectFile.project_id == self.project.id,
                ProjectFile.stored_path.endswith(uploaded_filename),
            ).one()
            self.assertEqual(stored.original_name, "new-source.mp4")
        finally:
            if uploaded_filename:
                (self.source_root / uploaded_filename).unlink(missing_ok=True)

    def test_authenticated_voiceover_generation_uses_only_project_sources(self):
        stored_voiceover = None
        try:
            with patch("app.processing.routes.generate_video_from_voiceover", return_value={
                "final_video": "/generated/voiceover-result.mp4",
            }) as generate:
                response = self.client.post(
                    "/processing/voiceover",
                    headers=self.headers(self.owner_token),
                    data={
                        "project_id": str(self.project.id),
                        "source_videos": json.dumps([str(self.source_file)]),
                    },
                    files={"voiceover": ("narration.wav", b"mock audio", "audio/wav")},
                )
            self.assertEqual(response.status_code, 200, response.text)
            stored_voiceover = Path(generate.call_args.kwargs["voiceover_path"])
            self.assertEqual(
                generate.call_args.kwargs["source_videos"],
                [str(self.source_file.resolve())],
            )
        finally:
            if stored_voiceover:
                stored_voiceover.unlink(missing_ok=True)

    def test_another_user_cannot_generate_from_or_retry_an_owned_source(self):
        with patch("app.processing.routes.generate_video_from_script") as generate:
            response = self.client.post(
                "/processing/script",
                headers=self.headers(self.other_token),
                json={
                    "project_id": self.project.id,
                    "script": "A story",
                    "source_videos": [str(self.source_file)],
                },
            )
        self.assertEqual(response.status_code, 404)
        generate.assert_not_called()

        retry = self.client.post(
            f"/processing/retry-indexing/{self.source_file.name}?project_id={self.project.id}",
            headers=self.headers(self.other_token),
        )
        self.assertEqual(retry.status_code, 404)

    def test_owner_can_retry_indexing_but_invalid_or_missing_sources_are_rejected(self):
        with patch("app.processing.routes.index_single_video", return_value={"status": "indexed"}) as index:
            response = self.client.post(
                f"/processing/retry-indexing/{self.source_file.name}?project_id={self.project.id}",
                headers=self.headers(self.owner_token),
            )
        self.assertEqual(response.status_code, 200, response.text)
        index.assert_called_once()

        invalid = self.client.post(
            f"/processing/retry-indexing/..bad.mp4?project_id={self.project.id}",
            headers=self.headers(self.owner_token),
        )
        self.assertEqual(invalid.status_code, 404)

        missing = self.client.post(
            f"/processing/retry-indexing/missing-{uuid4().hex}.mp4?project_id={self.project.id}",
            headers=self.headers(self.owner_token),
        )
        self.assertEqual(missing.status_code, 404)
        self.assertEqual(missing.json()["detail"], "Source video not found in this project.")

        with self.assertRaises(HTTPException) as unsafe_path:
            retry_video_indexing(
                str(self.source_root / "outside.mp4"),
                self.project.id,
                self.owner,
                self.db,
            )
        self.assertEqual(unsafe_path.exception.status_code, 400)

    def test_export_rejects_other_users_and_missing_or_invalid_project_media(self):
        other_user_export = self.client.post(
            "/processing/edit-video",
            headers=self.headers(self.other_token),
            json={
                "project_id": self.project.id,
                "video_url": "/generated/owned-output.mp4",
                "trim_start": 0,
                "trim_end": 1,
            },
        )
        self.assertEqual(other_user_export.status_code, 404)

        invalid = self.client.post(
            "/processing/edit-video",
            headers=self.headers(self.owner_token),
            json={
                "project_id": self.project.id,
                "video_url": "/generated/..",
                "trim_start": 0,
                "trim_end": 1,
            },
        )
        self.assertEqual(invalid.status_code, 400)

        missing = self.client.post(
            "/processing/edit-video",
            headers=self.headers(self.owner_token),
            json={
                "project_id": self.project.id,
                "video_url": "/generated/owned-output.mp4",
                "trim_start": 0,
                "trim_end": 1,
            },
        )
        self.assertEqual(missing.status_code, 404)


if __name__ == "__main__":
    unittest.main()
