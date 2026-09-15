from sqlalchemy import Column, Integer, ForeignKey, Table
from database import Base

# Many-to-Many между Post и Photo
post_photos = Table(
    "post_photos",
    Base.metadata,
    
    Column("post_id", Integer, ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True),
    Column("photo_id", Integer, ForeignKey("photos.id", ondelete="CASCADE"), primary_key=True),
)