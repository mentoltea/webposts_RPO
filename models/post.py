from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from .post_photos import post_photos

class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, nullable=False, autoincrement=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    author = relationship("User", back_populates="posts")
    
    photos = relationship("Photo", secondary=post_photos, back_populates="posts")

    def to_dict(self, s3_service=None) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "content": self.content,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "author_id": self.author_id,
            "photo_ids": [photo.id for photo in self.photos],
            "photos": [photo.to_dict(s3_service=s3_service) for photo in self.photos],
        }

    def __repr__(self) -> str:
        return f"<Post id={self.id} title='{self.title}'>"