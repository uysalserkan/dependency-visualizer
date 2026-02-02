"""Main entry point."""

from .api import API
from .utils import get_project_root


def main():
    """Run the sample application."""
    print(f"Project root: {get_project_root()}")
    
    # Create API instance
    api = API()
    
    # Create users
    user1 = api.create_user("Alice", "alice@example.com", 30)
    user2 = api.create_user("Bob", "bob@example.com", 25)
    
    print(f"Created users: {user1.name}, {user2.name}")
    
    # Create posts
    post1 = api.create_post(user1.id, "Hello World", "This is my first post!")
    post2 = api.create_post(user1.id, "Python Tips", "Here are some Python tips...")
    post3 = api.create_post(user2.id, "Intro", "Hi everyone!")
    
    print(f"Created {len(api.db.posts)} posts")
    
    # Get user posts
    alice_posts = api.get_user_posts(user1.id)
    print(f"{user1.name} has {len(alice_posts)} posts")


if __name__ == "__main__":
    main()
