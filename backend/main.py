import os
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, SQLModel, select
from typing import List
from models import User, Scan, DNSRecord, SecurityCheck, IPInfo, RBLResult
from auth import get_password_hash, verify_password, create_access_token
from pydantic import BaseModel
from dependencies import get_current_user, get_session
from scanner import DNSSecurityEngine, check_rbl
from fastapi import BackgroundTasks
from database import engine
from datetime import datetime, timezone
import uuid

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

app = FastAPI(title="DNS Protection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

class UserCreate(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

@app.post("/register", response_model=Token)
def register(user_data: UserCreate):
    with Session(engine) as session:
        statement = select(User).where(User.email == user_data.email)
        existing_user = session.exec(statement).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        user = User(
            email=user_data.email,
            password_hash=get_password_hash(user_data.password)
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        access_token = create_access_token(data={"sub": str(user.id)})
        return {"access_token": access_token, "token_type": "bearer"}

from fastapi.security import OAuth2PasswordRequestForm

@app.post("/token", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    with Session(engine) as session:
        statement = select(User).where(User.email == form_data.username)
        user = session.exec(statement).first()
        if not user or not verify_password(form_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        access_token = create_access_token(data={"sub": str(user.id)})
        return {"access_token": access_token, "token_type": "bearer"}

@app.get("/")
def read_root():
    return {"message": "Welcome to DNS Protection API"}

def background_rbl_check(scan_id_str: str, ips: List[str]):
    with Session(engine) as session:
        scan_uuid = uuid.UUID(scan_id_str)
        scan = session.get(Scan, scan_uuid)
        if not scan:
            return

        for ip in ips:
            rbl_results = check_rbl(ip)
            for res in rbl_results:
                db_res = RBLResult(
                    scan_id=scan_uuid,
                    rbl_name=res["rbl_name"],
                    checked_ip=res["checked_ip"],
                    is_listed=res["is_listed"]
                )
                session.add(db_res)

        scan.rbl_status = "complete"
        scan.rbl_completed_at = datetime.now(timezone.utc)
        session.add(scan)
        session.commit()

@app.post("/scan")
def create_scan(
    domain: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    scan = Scan(user_id=current_user.id, domain=domain, status="pending")
    session.add(scan)
    session.commit()
    session.refresh(scan)

    try:
        engine_scanner = DNSSecurityEngine(domain)
        results = engine_scanner.run_all_checks()

        scan.registrar = results["whois"].get("registrar")
        scan.expiry_date = results["whois"].get("expiry_date")

        for r in results["dns_records"]:
            priority = None
            if r["record_type"] == "MX":
                try:
                    priority = int(r["value"].split()[0])
                except:
                    pass
            db_record = DNSRecord(
                scan_id=scan.id,
                record_type=r["record_type"],
                name=r["name"],
                value=r["value"],
                ttl=r["ttl"],
                priority=priority
            )
            session.add(db_record)

        for c in results["security_checks"]:
            db_check = SecurityCheck(
                scan_id=scan.id,
                check_name=c["check_name"],
                status=c["status"],
                raw_value=c.get("raw_value"),
                detail=c.get("detail")
            )
            session.add(db_check)

        for i in results["ip_info"]:
            db_ip = IPInfo(
                scan_id=scan.id,
                ip_address=i["ip_address"],
                rdns=i.get("rdns"),
                asn=i.get("asn"),
                org=i.get("org"),
                country=i.get("country"),
                city=i.get("city")
            )
            session.add(db_ip)

        scan.status = "complete"
        session.add(scan)
        session.commit()

        ips = [i["ip_address"] for i in results["ip_info"]]
        background_tasks.add_task(background_rbl_check, str(scan.id), ips)

        return {"scan_id": scan.id}

    except Exception as e:
        scan.status = "failed"
        scan.error_message = str(e)
        session.add(scan)
        session.commit()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/scan/{scan_id}")
def get_scan_result(scan_id: str, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    scan = session.get(Scan, uuid.UUID(scan_id))
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    if scan.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    dns_records = {}
    for r in scan.dns_records:
        if r.record_type not in dns_records:
            dns_records[r.record_type] = []
        dns_records[r.record_type].append({"value": r.value, "ttl": r.ttl})

    security_checks = []
    for c in scan.security_checks:
        security_checks.append({
            "check_name": c.check_name,
            "status": c.status,
            "raw_value": c.raw_value,
            "detail": c.detail
        })

    rbl_results = []
    for r in scan.rbl_results:
        rbl_results.append({
            "rbl_name": r.rbl_name,
            "checked_ip": r.checked_ip,
            "is_listed": r.is_listed
        })

    ip_info = []
    for i in scan.ip_info:
        ip_info.append({
            "ip": i.ip_address,
            "rdns": i.rdns,
            "org": i.org,
            "country": i.country,
            "city": i.city
        })

    weights = {
        "dmarc_policy": 20,
        "spf_exists": 15,
        "dnssec_enabled": 20,
        "dkim_exists": 10,
        "open_resolver": 15,
        "zone_transfer_exposed": 10,
        "mx_resolves": 5,
        "ns_consistency": 5
    }

    total_score = 0
    breakdown = []

    for check_name, weight in weights.items():
        db_check = next((c for c in scan.security_checks if c.check_name == check_name), None)
        earned = 0
        status = "missing"

        if db_check:
            status = db_check.status
            if db_check.status == "pass":
                earned = weight
            elif db_check.status == "warn":
                earned = weight // 2

        total_score += earned
        breakdown.append({
            "check": check_name,
            "points_earned": earned,
            "points_max": weight,
            "status": status
        })

    return {
        "scan": {
            "id": scan.id,
            "domain": scan.domain,
            "created_at": scan.created_at,
            "status": scan.status,
            "rbl_status": scan.rbl_status,
            "registrar": scan.registrar,
            "expiry_date": scan.expiry_date
        },
        "score": {
            "total": total_score,
            "breakdown": breakdown
        },
        "dns_records": dns_records,
        "security_checks": security_checks,
        "rbl_results": rbl_results,
        "ip_info": ip_info
    }

@app.get("/history")
def get_history(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    statement = select(Scan).where(Scan.user_id == current_user.id).order_by(Scan.created_at.desc())
    scans = session.exec(statement).all()
    return scans

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
