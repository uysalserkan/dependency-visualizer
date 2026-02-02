"""API service."""

from typing import List, Optional
from .database import Database
from .models import User, Post
from .utils import get_project_root


class API:
    """Simple API service."""
    
    def __init__(self):
        self.db = Database()
    
    def create_user(self, name: str, email: str, age: Optional[int] = None) -> User:
        """Create a new user."""
        user_id = len(self.db.users) + 1
        user = User(id=user_id, name=name, email=email, age=age)
        self.db.add_user(user)
        return user
    
    def get_user(self, user_id: int) -> Optional[User]:
        """Get a user by ID."""
        return self.db.get_user(user_id)
    
    def create_post(self, author_id: int, title: str, content: str) -> Post:
        """Create a new post."""
        post_id = len(self.db.posts) + 1
        post = Post(id=post_id, title=title, content=content, author_id=author_id)
        self.db.add_post(post)
        return post
    
    def get_user_posts(self, user_id: int) -> List[Post]:
        """Get all posts by a user."""
        return self.db.get_posts_by_author(user_id)
