"""Configuration module."""

import json
from pathlib import Path
from .utils import get_project_root, ensure_directory


class Config:
    """Application configuration."""
    
    def __init__(self):
        self.root = get_project_root()
        self.data_dir = self.root / "data"
        ensure_directory(self.data_dir)
    
    def load_settings(self) -> dict:
        """Load settings from file."""
        settings_file = self.data_dir / "settings.json"
        if settings_file.exists():
            with open(settings_file) as f:
                return json.load(f)
        return {}
    
    def save_settings(self, settings: dict) -> None:
        """Save settings to file."""
        settings_file = self.data_dir / "settings.json"
        with open(settings_file, 'w') as f:
            json.dump(settings, f, indent=2)
