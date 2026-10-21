
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routes import router as auth_router
from app.processing.routes import router as processing_router
from app.payment_routes import router as payment_router
from app.database import initialize_database


app = FastAPI(title="EasyCut API")


@app.on_event("startup")
def initialize_application_database():
    initialize_database()


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(processing_router)
app.include_router(payment_router)


# Serve generated video files to the frontend.
BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
GENERATED_DIR = PROJECT_ROOT / "data" / "generated"

GENERATED_DIR.mkdir(parents=True, exist_ok=True)

app.mount(
    "/generated",
    StaticFiles(directory=str(GENERATED_DIR)),
    name="generated",
)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "project": "EasyCut",
    }
