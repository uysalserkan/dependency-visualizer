"""Language detection utilities."""

from pathlib import Path
from collections import Counter


class LanguageDetector:
    """Detect programming languages in a project."""

    # File extension to language mapping
    EXTENSION_MAP = {
        ".py": "Python",
        ".pyi": "Python",
        ".js": "JavaScript",
        ".jsx": "JavaScript",
        ".mjs": "JavaScript",
        ".cjs": "JavaScript",
        ".ts": "TypeScript",
        ".tsx": "TypeScript",
        ".java": "Java",
        ".go": "Go",
        ".rs": "Rust",
        ".rb": "Ruby",
        ".php": "PHP",
        ".c": "C",
        ".cpp": "C++",
        ".cc": "C++",
        ".h": "C/C++",
        ".hpp": "C++",
        ".cs": "C#",
        ".swift": "Swift",
        ".kt": "Kotlin",
        ".scala": "Scala",
    }

    def detect_languages(self, project_path: Path) -> dict[str, int]:
        """Detect languages used in a project.

        Args:
            project_path: Path to the project directory

        Returns:
            Dictionary mapping language names to file counts
        """
        if not project_path.exists() or not project_path.is_dir():
            return {}

        language_counts = Counter()

        # Walk through project and count files by language
        for file_path in project_path.rglob("*"):
            if file_path.is_file():
                ext = file_path.suffix
                if ext in self.EXTENSION_MAP:
                    language = self.EXTENSION_MAP[ext]
                    language_counts[language] += 1

        return dict(language_counts)

    def get_primary_language(self, project_path: Path) -> str | None:
        """Get the primary (most common) language in a project.

        Args:
            project_path: Path to the project directory

        Returns:
            Primary language name or None
        """
        languages = self.detect_languages(project_path)
        if not languages:
            return None

        return max(languages.items(), key=lambda x: x[1])[0]

    def is_multi_language(self, project_path: Path, threshold: int = 10) -> bool:
        """Check if project uses multiple languages significantly.

        Args:
            project_path: Path to the project directory
            threshold: Minimum file count to be considered significant

        Returns:
            True if multiple languages are used significantly
        """
        languages = self.detect_languages(project_path)
        significant_languages = [lang for lang, count in languages.items() if count >= threshold]
        return len(significant_languages) > 1

    def get_language_breakdown(self, project_path: Path) -> dict:
        """Get detailed language breakdown with percentages.

        Args:
            project_path: Path to the project directory

        Returns:
            Dictionary with language statistics
        """
        languages = self.detect_languages(project_path)
        total_files = sum(languages.values())

        if total_files == 0:
            return {"languages": {}, "total_files": 0, "primary_language": None}

        breakdown = {}
        for language, count in languages.items():
            percentage = (count / total_files) * 100
            breakdown[language] = {"count": count, "percentage": round(percentage, 2)}

        primary = max(languages.items(), key=lambda x: x[1])[0] if languages else None

        return {"languages": breakdown, "total_files": total_files, "primary_language": primary}
