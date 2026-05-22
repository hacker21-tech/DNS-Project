from sqlmodel import create_engine

DATABASE_URL = "sqlite:///./dns_protection.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
