from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, text
from sqlalchemy.orm import relationship
from database import Base
from .post_photos import post_photos

class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, nullable=False, autoincrement=True)
    s3_key = Column(String(255), nullable=False, unique=True)
    original_filename = Column(String(255), nullable=False)
    mime_type = Column(String(100), default="image/jpeg")
    uploaded_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    user = relationship("User", back_populates="photos")
    posts = relationship("Post", secondary=post_photos, back_populates="photos")

    def to_dict(self, s3_service=None) -> dict:
        data = {
            "id": self.id,
            "s3_key": self.s3_key,
            "original_filename": self.original_filename,
            "mime_type": self.mime_type,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "user_id": self.user_id,
        }
        if s3_service:
            data["url"] = s3_service.get_public_url(self.s3_key)
        return data

    def __repr__(self) -> str:
        return f"<Photo id={self.id} s3_key='{self.s3_key}'>"
    

def delete_photo_if_orphan(photo_id, session, s3_client, bucket_name):
    """
    Проверяет, прикреплена ли фотография хотя бы к одному посту.
    Если связей нет — удаляет файл из S3 и запись из таблицы photos.
    """
    check_stmt = text("SELECT COUNT(*) FROM post_photo WHERE photo_id = :photo_id")
    count = session.execute(check_stmt, {"photo_id": photo_id}).scalar()

    if count == 0:
        photo_stmt = text("SELECT s3_key FROM photos WHERE id = :photo_id")
        photo = session.execute(photo_stmt, {"photo_id": photo_id}).fetchone()

        if photo:
            s3_key = photo.s3_key

            try:
                s3_client.delete_object(Bucket=bucket_name, Key=s3_key)
            except Exception as e:
                print(f"Ошибка при удалении объекта {s3_key} из S3: {e}")

            delete_stmt = text("DELETE FROM photos WHERE id = :photo_id")
            session.execute(delete_stmt, {"photo_id": photo_id})