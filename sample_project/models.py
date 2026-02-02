"""Data models."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class User:
    """User model."""
    
    id: int
    name: str
    email: str
    age: Optional[int] = None


@dataclass
class Post:
    """Post model."""
    
    id: int
    title: str
    content: str
    author_id: int
