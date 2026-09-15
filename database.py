from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from config import DB_URL
engine = create_engine(
    DB_URL,
    echo=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def new_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        

def init_db():
    Base.metadata.create_all(bind=engine)