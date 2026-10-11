from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import router as auth_router
from app.processing.routes import router as processing_router
from app.payment_routes import router as payment_router


app = FastAPI(title="EasyCut API")


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


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "project": "EasyCut"
    }