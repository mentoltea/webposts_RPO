from contextlib import contextmanager
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session
from config import DB_URL
engine = create_engine(
    DB_URL,
    echo=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

@contextmanager
def new_session() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        

def init_db():
    Base.metadata.create_all(bind=engine)