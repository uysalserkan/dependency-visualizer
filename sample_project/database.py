"""Database service."""

from typing import List, Optional
from .models import User, Post


class Database:
    """Simple in-memory database."""
    
    def __init__(self):
        self.users: List[User] = []
        self.posts: List[Post] = []
    
    def add_user(self, user: User) -> None:
        """Add a user to the database."""
        self.users.append(user)
    
    def get_user(self, user_id: int) -> Optional[User]:
        """Get a user by ID."""
        for user in self.users:
            if user.id == user_id:
                return user
        return None
    
    def add_post(self, post: Post) -> None:
        """Add a post to the database."""
        self.posts.append(post)
    
    def get_posts_by_author(self, author_id: int) -> List[Post]:
        """Get all posts by an author."""
        return [post for post in self.posts if post.author_id == author_id]
