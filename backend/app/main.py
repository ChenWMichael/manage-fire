from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes import fire, profile, snapshots

app = FastAPI(
    title="ManageFIRE API",
    description="Backend API for the ManageFIRE financial independence platform",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(fire.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(snapshots.router, prefix="/api")


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "ManageFIRE API", "version": "0.1.0"}
