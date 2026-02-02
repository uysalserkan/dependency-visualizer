"""Code preview endpoints."""

import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.exceptions import ValidationError
from app.core.logging import get_logger
from app.core.validation import validate_project_path

logger = get_logger(__name__)

router = APIRouter(prefix="/preview", tags=["preview"])


class CodePreview(BaseModel):
    """Code preview model."""
    
    file_path: str
    start_line: int
    end_line: int
    lines: list[str]
    language: str
    total_lines: int


class ImportLocation(BaseModel):
    """Import statement location."""
    
    line_number: int
    line_content: str
    import_type: str  # import, from_import, dynamic
    imported_names: list[str]


@router.get("/file", response_model=CodePreview)
async def preview_file(
    file_path: str = Query(..., description="Absolute file path"),
    start_line: int = Query(1, ge=1, description="Start line number"),
    end_line: Optional[int] = Query(None, description="End line number (optional)"),
    context_lines: int = Query(5, ge=0, le=20, description="Context lines around target"),
):
    """Get code preview for a file.
    
    Args:
        file_path: Absolute path to file
        start_line: Start line number (1-indexed)
        end_line: End line number (optional)
        context_lines: Number of context lines around target
        
    Returns:
        Code preview with line numbers
        
    Raises:
        HTTPException: If file not found or invalid
    """
    try:
        path = Path(file_path)
        
        # Security: Ensure file exists and is readable
        if not path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        if not path.is_file():
            raise HTTPException(status_code=400, detail="Path is not a file")
        
        # Read file
        try:
            with open(path, "r", encoding="utf-8") as f:
                all_lines = f.readlines()
        except UnicodeDecodeError:
            # Try with different encoding
            with open(path, "r", encoding="latin-1") as f:
                all_lines = f.readlines()
        
        total_lines = len(all_lines)
        
        # Calculate range with context
        if end_line is None:
            end_line = start_line
        
        actual_start = max(1, start_line - context_lines)
        actual_end = min(total_lines, end_line + context_lines)
        
        # Extract lines (convert to 0-indexed)
        selected_lines = all_lines[actual_start - 1 : actual_end]
        
        # Determine language from extension
        language = path.suffix.lstrip(".") or "text"
        
        logger.info(
            "File preview",
            file_path=str(path),
            start=actual_start,
            end=actual_end,
            total_lines=total_lines,
        )
        
        return CodePreview(
            file_path=str(path),
            start_line=actual_start,
            end_line=actual_end,
            lines=[line.rstrip("\n") for line in selected_lines],
            language=language,
            total_lines=total_lines,
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error previewing file", file_path=file_path, error=str(e))
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")


@router.get("/imports", response_model=list[ImportLocation])
async def get_import_locations(
    file_path: str = Query(..., description="Absolute file path"),
):
    """Get all import statement locations in a file.
    
    Args:
        file_path: Absolute path to file
        
    Returns:
        List of import locations
        
    Raises:
        HTTPException: If file not found or invalid
    """
    try:
        path = Path(file_path)
        
        if not path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        # Read file
        try:
            with open(path, "r", encoding="utf-8") as f:
                lines = f.readlines()
        except UnicodeDecodeError:
            with open(path, "r", encoding="latin-1") as f:
                lines = f.readlines()
        
        # Detect language
        suffix = path.suffix.lower()
        
        imports = []
        
        if suffix == ".py":
            imports = _find_python_imports(lines)
        elif suffix in [".js", ".jsx", ".ts", ".tsx", ".mjs"]:
            imports = _find_javascript_imports(lines)
        else:
            # Unsupported language
            return []
        
        logger.info(
            "Import locations found",
            file_path=str(path),
            count=len(imports),
        )
        
        return imports
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error finding imports", file_path=file_path, error=str(e))
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")


def _find_python_imports(lines: list[str]) -> list[ImportLocation]:
    """Find Python import statements.
    
    Args:
        lines: File lines
        
    Returns:
        List of import locations
    """
    imports = []
    
    for line_num, line in enumerate(lines, start=1):
        stripped = line.strip()
        
        # Simple regex-free detection
        if stripped.startswith("import ") or stripped.startswith("from "):
            import_type = "from_import" if stripped.startswith("from") else "import"
            
            # Extract imported names (simple approach)
            imported_names = []
            if "import" in stripped:
                after_import = stripped.split("import", 1)[1]
                # Remove comments
                if "#" in after_import:
                    after_import = after_import.split("#")[0]
                
                # Split by comma
                names = after_import.split(",")
                imported_names = [name.strip().split()[0] for name in names if name.strip()]
            
            imports.append(
                ImportLocation(
                    line_number=line_num,
                    line_content=stripped,
                    import_type=import_type,
                    imported_names=imported_names,
                )
            )
    
    return imports


def _find_javascript_imports(lines: list[str]) -> list[ImportLocation]:
    """Find JavaScript/TypeScript import statements.
    
    Args:
        lines: File lines
        
    Returns:
        List of import locations
    """
    imports = []
    
    for line_num, line in enumerate(lines, start=1):
        stripped = line.strip()
        
        # ES6 imports
        if stripped.startswith("import "):
            # Extract imported names (simple approach)
            imported_names = []
            if " from " in stripped:
                before_from = stripped.split(" from ")[0]
                # Remove 'import' keyword
                imports_part = before_from.replace("import", "", 1).strip()
                
                # Handle different import styles
                if "{" in imports_part:
                    # Named imports: import { a, b } from 'module'
                    in_braces = imports_part.split("{")[1].split("}")[0]
                    imported_names = [name.strip().split()[0] for name in in_braces.split(",")]
                elif imports_part and not imports_part.startswith("*"):
                    # Default import: import Name from 'module'
                    imported_names = [imports_part.split()[0]]
            
            imports.append(
                ImportLocation(
                    line_number=line_num,
                    line_content=stripped,
                    import_type="import",
                    imported_names=imported_names,
                )
            )
        
        # CommonJS require
        elif "require(" in stripped and ("const " in stripped or "let " in stripped or "var " in stripped):
            imports.append(
                ImportLocation(
                    line_number=line_num,
                    line_content=stripped,
                    import_type="require",
                    imported_names=[],
                )
            )
        
        # Dynamic import
        elif "import(" in stripped:
            imports.append(
                ImportLocation(
                    line_number=line_num,
                    line_content=stripped,
                    import_type="dynamic",
                    imported_names=[],
                )
            )
    
    return imports


@router.get("/node-context")
async def get_node_context(
    analysis_id: str = Query(..., description="Analysis ID"),
    node_id: str = Query(..., description="Node ID"),
    context_lines: int = Query(5, ge=0, le=20, description="Context lines"),
):
    """Get code context for a specific node.
    
    This endpoint combines node metadata with code preview.
    
    Args:
        analysis_id: Analysis ID
        node_id: Node ID
        context_lines: Context lines around import
        
    Returns:
        Node information with code preview
    """
    from app.core.cache import CacheDB
    
    cache = CacheDB()
    result = cache.get(analysis_id)
    
    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    # Find node
    node = next((n for n in result.nodes if n.id == node_id), None)
    
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    # Get file preview if file_path exists
    preview = None
    imports = []
    
    if node.file_path:
        try:
            # Get file preview
            preview = await preview_file(
                file_path=node.file_path,
                start_line=1,
                end_line=None,
                context_lines=context_lines,
            )
            
            # Get import locations
            imports = await get_import_locations(file_path=node.file_path)
        
        except HTTPException:
            # File might have been moved or deleted
            logger.warning("Could not load file preview", file_path=node.file_path)
    
    return {
        "node": node,
        "preview": preview,
        "imports": imports,
    }
