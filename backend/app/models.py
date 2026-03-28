import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Text, ForeignKey, Enum, DateTime
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship, DeclarativeBase

class Base(DeclarativeBase):
    pass

class ReadingStatus(str, enum.Enum):
    want_to_read = "want_to_read"
    currently_reading = "currently_reading"
    read = "read"

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    google_id = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    display_name = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    user_books = relationship("UserBook", back_populates="user", cascade="all, delete-orphan")
    shelves = relationship("Shelf", back_populates="user", cascade="all, delete-orphan")

class Book(Base):
    __tablename__ = "books"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    google_books_id = Column(String, unique=True, nullable=True)
    isbn = Column(String, nullable=True)
    title = Column(String, nullable=False)
    authors = Column(ARRAY(String), nullable=True)
    description = Column(Text, nullable=True)
    cover_url = Column(String, nullable=True)
    page_count = Column(Integer, nullable=True)
    published_date = Column(String, nullable=True)
    publisher = Column(String, nullable=True)

class UserBook(Base):
    __tablename__ = "user_books"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    book_id = Column(UUID(as_uuid=True), ForeignKey("books.id", ondelete="RESTRICT"), nullable=False)
    status = Column(Enum(ReadingStatus), nullable=False)
    rating = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    user = relationship("User", back_populates="user_books")
    book = relationship("Book")
    shelf_entries = relationship("ShelfBook", back_populates="user_book", cascade="all, delete-orphan")

class Shelf(Base):
    __tablename__ = "shelves"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    user = relationship("User", back_populates="shelves")
    shelf_books = relationship("ShelfBook", back_populates="shelf", cascade="all, delete-orphan")

class ShelfBook(Base):
    __tablename__ = "shelf_books"
    shelf_id = Column(UUID(as_uuid=True), ForeignKey("shelves.id"), primary_key=True)
    user_book_id = Column(UUID(as_uuid=True), ForeignKey("user_books.id"), primary_key=True)
    added_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    shelf = relationship("Shelf", back_populates="shelf_books")
    user_book = relationship("UserBook", back_populates="shelf_entries")
