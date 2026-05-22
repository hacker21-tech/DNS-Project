from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID, uuid4
from sqlmodel import Field, Relationship, SQLModel

class User(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    scans: List["Scan"] = Relationship(back_populates="user")

class Scan(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="user.id")
    domain: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = Field(default="pending") # pending, complete, failed
    error_message: Optional[str] = None
    rbl_status: str = Field(default="pending") # pending, complete, error
    rbl_completed_at: Optional[datetime] = None

    # WHOIS info
    registrar: Optional[str] = None
    expiry_date: Optional[datetime] = None

    user: User = Relationship(back_populates="scans")
    dns_records: List["DNSRecord"] = Relationship(back_populates="scan")
    security_checks: List["SecurityCheck"] = Relationship(back_populates="scan")
    rbl_results: List["RBLResult"] = Relationship(back_populates="scan")
    ip_info: List["IPInfo"] = Relationship(back_populates="scan")

class DNSRecord(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    scan_id: UUID = Field(foreign_key="scan.id")
    record_type: str
    name: str
    value: str
    ttl: int
    priority: Optional[int] = None

    scan: Scan = Relationship(back_populates="dns_records")

class SecurityCheck(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    scan_id: UUID = Field(foreign_key="scan.id")
    check_name: str # spf_exists, dmarc_policy, etc.
    status: str # pass, fail, warn, missing, error
    raw_value: Optional[str] = None
    detail: Optional[str] = None

    scan: Scan = Relationship(back_populates="security_checks")

class RBLResult(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    scan_id: UUID = Field(foreign_key="scan.id")
    rbl_name: str
    checked_ip: str
    is_listed: bool
    response: Optional[str] = None
    checked_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    scan: Scan = Relationship(back_populates="rbl_results")

class IPInfo(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    scan_id: UUID = Field(foreign_key="scan.id")
    ip_address: str
    rdns: Optional[str] = None
    asn: Optional[str] = None
    org: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    source: str = "ip-api"

    scan: Scan = Relationship(back_populates="ip_info")
