
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from core.database import db_execute, get_db
from core.jobs import job_manager
from core.models import Job, Notebook
from core.schemas import JobResponse

router = APIRouter(prefix="", tags=["Jobs"])

@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job_status(job_id: str, db = Depends(get_db)):
    """
    Retrieves the status, stage, progress, and result reference of a background job.
    """
    stmt = select(Job).where(Job.id == job_id)
    res = await db_execute(db, stmt)
    job = res.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.post("/jobs/{job_id}/cancel", response_model=JobResponse)
async def cancel_job(job_id: str, db = Depends(get_db)):
    """
    Cooperatively cancels an ongoing or queued background job.
    """
    stmt = select(Job).where(Job.id == job_id)
    res = await db_execute(db, stmt)
    job = res.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    cancelled_job = await job_manager.cancel_job(job_id, db)
    return cancelled_job

@router.get("/notebooks/{notebook_id}/jobs", response_model=list[JobResponse])
async def list_notebook_jobs(notebook_id: str, db = Depends(get_db)):
    """
    Lists recent background jobs for a specific research notebook.
    """
    nb_stmt = select(Notebook).where(Notebook.id == notebook_id)
    nb_res = await db_execute(db, nb_stmt)
    nb = nb_res.scalars().first()
    if not nb:
        raise HTTPException(status_code=404, detail="Notebook not found")

    stmt = select(Job).where(Job.notebook_id == notebook_id).order_by(Job.created_at.desc()).limit(20)
    jobs_res = await db_execute(db, stmt)
    return jobs_res.scalars().all()
