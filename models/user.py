from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, func, Column, Integer, Boolean
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, nullable=False, autoincrement=True, index=True)
    
    username = Column(String(80), unique=True, nullable=False, index=True)
    
    email = Column(String(120), unique=True, nullable=False)
    email_checked = Column(Boolean)
    
    created_at = Column(DateTime, server_default=func.now())
    
    is_admin = Column(Boolean)
    password_hash = Column(String(128), nullable=False)
    
    photos = relationship("Photo", back_populates="user")
    posts = relationship("Post", back_populates="author")

    def __repr__(self) -> str:
        return f"<User(id={self.id}, username='{self.username}')>"