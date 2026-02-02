# Sample Project

This is a sample Python project to demonstrate the Import Visualizer.

## Structure

- `models.py` - Data models (User, Post)
- `database.py` - Database service
- `api.py` - API service
- `utils.py` - Utility functions
- `config.py` - Configuration
- `main.py` - Main entry point

## Import Graph

```
main.py
  ├─> api.py
  │    ├─> database.py
  │    │    └─> models.py
  │    ├─> models.py
  │    └─> utils.py
  └─> utils.py

config.py
  └─> utils.py
```

## Usage

```bash
python -m sample_project.main
```
