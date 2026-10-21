# EasyCut AI Video Editor — Project Introduction and Handover

## 1. Project overview

EasyCut is a web application for turning a written script or recorded voiceover and selected source footage into an edited video. Its main workflow analyzes visual footage, matches scenes to narration, assembles clips with FFmpeg, and offers an editor for trimming and adding one text overlay and stickers.

Project goals:

- Let an authenticated user create, save, reopen, and manage video projects.
- Use Gemini and semantic retrieval to select footage relevant to a script or voiceover.
- Assemble generated video and narration with local video-processing tools.
- Let users make basic edits and export an MP4.
- Enforce project ownership and subscription limits in the backend.

This is an active development project. The existence of a module or screen does not by itself mean the live provider workflow, payment, browser behavior, or deployment has been verified.

## 2. Technologies and architecture

| Area | Technology and role |
|---|---|
| Frontend | React 19, Vite 8, React Router, Axios, Lucide icons |
| API | FastAPI, Pydantic, bearer-token authentication |
| Persistence | SQLAlchemy with local SQLite (`backend/easycut.db`) |
| AI | Google Gemini for script analysis, frame descriptions, embeddings, and voiceover analysis |
| Retrieval | Persistent ChromaDB; the main RAG collection is `gemini_video_scenes` |
| Ranking | Sentence Transformers (`all-MiniLM-L6-v2`) plus a trained classifier, combined with Chroma similarity |
| Media | MoviePy for frame extraction; FFmpeg/ffprobe for rendering, assembly, normalization, and muxing |
| Payments | Razorpay SDK integration; code enforces a test-mode key and verifies payment server-side |

### Gemini model split

The two editing workflows use separate Gemini models in code. Script-based scene breakdown calls `STORY_MODEL` (`gemini-3.5-flash-lite`) from `backend/app/ai/gemini_client.py`; voiceover story-beat analysis calls `VOICEOVER_MODEL` (`gemini-3.6-flash`) from `backend/app/audio/voiceover_analyzer.py`. Keep these assignments separate. Model availability and live responses were not verified during this handover check. Frame descriptions and embeddings are separate AI operations and use their own code paths.

The frontend calls the backend at `http://127.0.0.1:8000`; Vite normally serves the UI on port `5173`. CORS in `backend/app/main.py` currently allows the two local Vite origins only. The database and Chroma paths are relative to the backend working directory, so run the API from `backend/`.

## 3. Folder structure and important files

```text
EasyCut_Proj/
├── backend/
│   ├── app/
│   │   ├── ai/             # Gemini and trained semantic matcher
│   │   ├── audio/          # Voiceover analysis and audio normalization
│   │   ├── processing/     # Processing API, indexing, selection, pipelines
│   │   ├── rag/            # Gemini embeddings and ChromaDB
│   │   ├── video/          # Frame extraction, rendering, assembly
│   │   ├── routes.py       # Authentication and project CRUD/file APIs
│   │   ├── payment*.py     # Razorpay order and verification APIs
│   │   ├── models.py       # User, Project, ProjectFile, PaymentOrder
│   │   ├── database.py     # SQLite connection and additive initialization
│   │   ├── security.py     # Existing JWT bearer authentication
│   │   └── main.py         # FastAPI app, routers, CORS, generated media mount
│   ├── tests/              # Python unittest suites
│   ├── .venv/              # Local-only Python environment; ignored by Git
│   ├── chroma_db/           # Local persistent vector store; ignored by Git
│   └── easycut.db            # Local SQLite database; ignored by Git
├── data/
│   ├── source_videos/       # Uploaded source video files
│   ├── frames/              # Extracted frames
│   ├── generated/           # Generated and edited videos
│   └── easycut_training_artifacts/ # Trained matcher assets
├── docs/
│   └── introduction.md      # This handover document
└── frontend/
    ├── src/pages/           # React screens, including CreateProject, Editor,
    │                        # Generation, FinalOutput, Projects, Payment
    ├── src/editor/          # Editor validation and its Node tests
    ├── src/services/api.js  # Axios client and bearer-token interceptor
    ├── package.json
    └── package-lock.json
```

`frontend_old/` is a legacy frontend tree. Use `frontend/` for current work. Local uploads, generated media, databases, `.env`, virtual environments, and build output are ignored by the repository rules; protect them separately when they contain valuable project data.

## 4. Setup and run instructions

### Backend (Windows PowerShell)

The current working copy has a local virtual environment at `backend/.venv`. From the project root:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API initializes the SQLite schema on startup. Health endpoints are `GET http://127.0.0.1:8000/health` and `GET http://127.0.0.1:8000/processing/health`.

**Clean-checkout limitation:** No backend `requirements.txt`, `pyproject.toml`, or Pipfile was found. The local `.venv` is ignored by Git and is not a reproducible dependency installation method. Before handing the project to a teammate who must build a new Python environment, create and review a pinned backend dependency manifest. Do not guess dependency versions or copy the local virtual environment as a substitute.

### Frontend

From the project root:

```powershell
cd frontend
npm ci
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). The API base URL is currently set in `frontend/src/services/api.js`; changing it for another environment requires an intentional configuration change.

### Environment-variable names

`backend/.env` is local and must remain private. The source references these names:

- `GEMINI_API_KEY` — required for Gemini-backed workflows.
- `SECRET_KEY` — required for JWT signing.
- `JWT_ALGORITHM` — optional; defaults to `HS256`.
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` — required only for Razorpay operations; the application requires a test-mode key ID.

This document intentionally contains names only, never values. Obtain credentials through an approved secret manager or secure channel. Do not place real values in Git, screenshots, logs, support tickets, or handover documents.

## 5. AI video-generation workflow

### Script workflow

1. The authenticated user creates a project draft. The frontend uploads each selected video to `/processing/upload-video` with its project ID.
2. The backend checks project ownership, writes the uploaded video under `data/source_videos/`, and records the file against the project.
3. `extract_frame_samples` in `backend/app/video/frame_extractor.py` extracts frames with their source timestamps. `video_indexer.index_extracted_frames` sends frames to Gemini through `scene_analyzer.analyze_frame`.
4. `gemini_rag.add_scene` creates a Gemini embedding and stores the description, source filename, and time window in ChromaDB.
5. The frontend sends the script, project ID, and selected source videos to `/processing/script`. The backend verifies project ownership of every source file.
6. `auto_editor.generate_video_from_script` asks Gemini for a numbered visual scene breakdown. `script_matcher` parses the scenes; `clip_selector` retrieves candidates through `semantic_matcher` and reranks them through `trained_semantic_matcher`.
7. The renderer cuts selected time ranges from the authorized source videos. The assembler joins the clips into an MP4. Generated outputs are registered to the project before the response is returned.
8. The frontend opens the result/editor flow and saves working settings to the project draft.

### Voiceover workflow

1. The authenticated request includes a project ID, voiceover upload, and source video selections. The backend checks ownership before processing.
2. `audio_normalizer.normalize_audio` uses FFmpeg to normalize audio. `voiceover_analyzer.analyze_voiceover` asks Gemini for transcript/story beats, supported language, and visual concepts.
3. The pipeline retrieves and ranks footage for each beat, sequences clips, and handles duration by selecting/repeating suitable short cuts where needed.
4. The video assembler builds the visual sequence; `renderer.add_voiceover` muxes the narration. ffprobe checks resulting stream durations.
5. A successful final video is registered to the project. The existing retry behavior is bounded for transient provider failures; mocked tests cover error handling but do not establish current Gemini availability.

### Frame timestamp fix

The extractor now returns explicit frame start/end timestamps. Upload and retry-indexing paths pass those values through to scene metadata and Chroma instead of relying on a second interval assumption. Path-only callers remain supported as a compatibility fallback. Older indexed Chroma records are not silently rewritten; they need a reviewed reindex procedure to correct historical timestamps.

## 6. Main application modules

### Authentication and project management

- `/auth/register`, `/auth/login`, `/auth/me` handle account creation, login, and current-user information.
- JWT bearer authentication is implemented in `backend/app/security.py`; the frontend Axios interceptor reads the local token and sends it as a bearer credential.
- `/auth/projects` and related routes create drafts, list saved projects, open, update/save, delete, and manage project files. Ownership is checked server-side.
- `Project`, `ProjectFile`, `User`, and `PaymentOrder` are defined in `backend/app/models.py`.
- Tokens have a limited lifetime. A stale token should be handled by logging in again; authentication must not be bypassed to work around token errors.

### Editor and export

`frontend/src/pages/Editor.jsx` provides trim, a single timed text overlay, built-in stickers, timeline controls, and audio settings. `frontend/src/pages/FinalOutput.jsx` sends the export request through the authenticated Axios client. `/processing/edit-video` validates project media ownership and renders with FFmpeg. Generated media is served under `/generated/` by FastAPI.

The generated-media mount is static and currently public to anyone who knows a URL. Processing routes now check project ownership, but this does not make direct `/generated/...` downloads private.

### Subscription and payments

`backend/app/subscriptions.py` implements a five-saved-project free limit and active-subscription checks. `backend/app/payment_routes.py` creates authenticated Razorpay orders and verifies the signature plus provider-reported payment status before activating a plan. The code requires a test-mode Razorpay key ID. Payment integration is not established as operational merely because these handlers exist.

## 7. Tests and build commands

Run backend commands from `backend/` with the project virtual environment active:

```powershell
python -m unittest tests.test_processing_authorization tests.test_frame_timestamp_indexing tests.test_editor_overlay_export tests.test_project_limit tests.test_project_drafts tests.test_subscription_migration tests.test_voiceover_pipeline tests.test_voiceover_sequence tests.test_voiceover_duration
```

Run the frontend editor validation tests directly from `frontend/`:

```powershell
node src/editor/editorValidation.test.js
```

The following command has encountered a Windows `spawn EPERM` issue in the test runner in this environment; direct execution above worked in prior runs:

```powershell
node --test src/editor/editorValidation.test.js
```

Frontend production build, from `frontend/`:

```powershell
npm run build
```

Lint command available from `frontend/`:

```powershell
npm run lint
```

## 8. Verification status and known limitations

### Verified during handover preparation

- The combined relevant backend command above completed with **34 tests passed**. The project-draft lifecycle test now reloads its users after reopening the database session, avoiding a detached SQLAlchemy test fixture.
- `npm run build` in `frontend/` completed successfully with **1,992 modules transformed**.
- `node src/editor/editorValidation.test.js` completed with **7 tests passed**.
- The timestamp regression uses a generated FFmpeg video and checks timestamp propagation into mocked scene-storage calls. It does not call live Gemini or persist to a real Chroma collection.
- Authorization tests use signed test tokens and isolated test data. Script/voiceover generation functions are mocked. They verify request authorization and project ownership, not real AI generation.
- Editor export tests use real FFmpeg fixture videos and check overlay/timing output.
- Voiceover ordering, provider error handling, and repeat fallback tests use deterministic mocked analysis responses; duration/mux tests include local FFmpeg fixtures. They do not prove live Gemini availability or quality.

### Implemented but only partially verified

- Gemini script understanding, frame descriptions, embedding generation, Chroma retrieval, and trained ranking are code paths in the main workflow. Live end-to-end operation with current provider credentials and stored footage has not been demonstrated here.
- Voiceover parsing, bounded retries, duration planning, and FFmpeg muxing have mocked/local-media coverage. Live Gemini voiceover generation has not been demonstrated.
- English, Malayalam, and Hindi appear in voiceover prompt/validation code; full quality tests for all three languages were not established.
- Razorpay order/verification handlers exist, but no successful test-mode provider transaction was demonstrated. Do not claim successful payment processing.
- Browser workflows for registration/login/logout, project reopening, upload, generation, editing, export, and payment have not all been verified end to end.
- Production deployment has not been verified. CORS is local-only, data paths are local, and a backend dependency manifest is missing.
- `npm run lint` currently reports two errors: `ThemeContext.jsx` exports both a provider and a hook under the Fast Refresh rule, and `Login.jsx` sets success state synchronously in an effect. The production build succeeds; resolve these lint findings in follow-up work.

### Security and compatibility limits

- Processing upload, retry-indexing, script, voiceover, and edit-export operations require the existing bearer authentication and verify project/file ownership. The processing health endpoint remains public.
- Generated output URLs are served by a public static mount. Do not store sensitive footage there if public URL access is unacceptable.
- No explicit upload size cap or content-based media sniffing was established in the audited routes; add both before exposing the API publicly.
- Older uploads and generated files without a server-created `ProjectFile` ownership record may need reupload/regeneration or a carefully reviewed ownership migration before processing/export can use them.
- Historical Chroma scenes indexed with incorrect time windows remain unchanged until that video's records are safely reindexed.
- The local trained-model artifact and Sentence Transformers cache must be available for the main ranking path. A clean clone should verify these dependencies and artifacts before a live demo.

## 9. Recommended remaining work and testing order

1. **Create a pinned backend dependency manifest** and test a clean virtual-environment install without copying `.venv`.
2. **Test new-account security and ownership**: register/login, upload to a draft, verify another account cannot use its sources, retry indexing, or export its media.
3. **Test project lifecycle in the browser**: draft, save, reopen, edit, delete; repair and rerun the detached-user project lifecycle test.
4. **Test the editor in the browser**: full and short trim ranges, single text timing, stickers, save/reopen, export, and playback of the resulting MP4.
5. **Run a live Gemini script smoke test** using newly uploaded footage; confirm indexed timestamps, returned scene matches, and final MP4. Then run one live voiceover test and separately check each supported language with known samples.
6. **Run a Razorpay test-mode transaction** and test invalid signature, wrong order/amount, and non-captured payment rejection. Keep server-side verification enabled.
7. **Address public media and upload limits**, then verify production CORS, storage, database backup/restore, and deployment on the intended host.

## 10. Safe handover, backup, Git, and credential handling

- Confirm the working directory is `EasyCut_Proj`. Never use the original `EasyCut` folder as a source for copying or restoration.
- Before handover, review `git status` and `git diff`; stage only intentional files. For this document alone, stage `docs/introduction.md` explicitly rather than staging the entire workspace.
- Keep `.env`, token/signing keys, API credentials, local databases containing user data, uploaded media, and generated media out of Git. `.gitignore` excludes these local assets, but verify staged files before every commit.
- Create backups only in an approved protected location. Stop the backend before copying SQLite/Chroma data to obtain a consistent backup. Encrypt backups that contain user uploads or generated video. Keep credentials in a separate secret manager; do not include `.env` in project archives or team chat.
- Use normal feature branches and focused commits. Review the exact staged diff before commit; do not use broad reset/restore commands to clean a teammate's work.
- After cloning, install frontend packages with `npm ci`, provision the backend from a reviewed pinned dependency manifest, configure environment variables securely, and run tests/build before using production or payment credentials.
