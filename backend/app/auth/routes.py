"""Authentication API routes."""

from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

from app.auth.security import (
    User,
    create_access_token,
    get_current_active_user,
    verify_password,
)
from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])


class Token(BaseModel):
    """Access token response."""
    access_token: str
    token_type: str


class UserLogin(BaseModel):
    """User login request."""
    username: str
    password: str


# Mock user database (in production, use a real database)
MOCK_USERS = {
    "admin": {
        "username": "admin",
        "email": "admin@example.com",
        "full_name": "Admin User",
        "hashed_password": "$2b$12$KIXqkN8O3pQZMVVLKlEVZ.lXxVQQVl0LbH6vQCPGqVzKX5wBGOqWW",  # "admin123"
        "disabled": False,
        "roles": ["admin"],
    },
    "analyst": {
        "username": "analyst",
        "email": "analyst@example.com",
        "full_name": "Analyst User",
        "hashed_password": "$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi",  # "analyst123"
        "disabled": False,
        "roles": ["analyst"],
    },
    "viewer": {
        "username": "viewer",
        "email": "viewer@example.com",
        "full_name": "Viewer User",
        "hashed_password": "$2b$12$gixPQz6cYYZ9mW.FvGJZj.eY5T0YK3J0VGJZj8yQZXGYZ9mW.FvGJ",  # "viewer123"
        "disabled": False,
        "roles": ["viewer"],
    },
}


def authenticate_user(username: str, password: str) -> User | None:
    """Authenticate a user with username and password.
    
    Args:
        username: Username
        password: Password
        
    Returns:
        User if authentication successful, None otherwise
    """
    user_dict = MOCK_USERS.get(username)
    if not user_dict:
        return None
    
    if not verify_password(password, user_dict["hashed_password"]):
        return None
    
    return User(**{k: v for k, v in user_dict.items() if k != "hashed_password"})


@router.post("/token", response_model=Token)
async def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    """Login with username and password to get access token.
    
    Args:
        form_data: OAuth2 password request form
        
    Returns:
        Access token
        
    Raises:
        HTTPException: If authentication fails
    """
    user = authenticate_user(form_data.username, form_data.password)
    
    if not user:
        logger.warning("Login failed", username=form_data.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "roles": user.roles},
        expires_delta=access_token_expires
    )
    
    logger.info("User logged in", username=user.username, roles=user.roles)
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.post("/login", response_model=Token)
async def login_json(user_login: UserLogin):
    """Login with JSON payload (alternative to OAuth2 form).
    
    Args:
        user_login: User login credentials
        
    Returns:
        Access token
    """
    user = authenticate_user(user_login.username, user_login.password)
    
    if not user:
        logger.warning("Login failed", username=user_login.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "roles": user.roles},
        expires_delta=access_token_expires
    )
    
    logger.info("User logged in", username=user.username, roles=user.roles)
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """Get current user information.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Current user
    """
    return current_user


@router.get("/test-auth")
async def test_auth(current_user: User = Depends(get_current_active_user)):
    """Test authentication endpoint.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Authentication status
    """
    return {
        "authenticated": True,
        "username": current_user.username,
        "roles": current_user.roles,
        "message": "Authentication successful!",
    }
