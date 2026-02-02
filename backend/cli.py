#!/usr/bin/env python3
"""
Import Visualizer CLI Tool

Command-line interface for analyzing projects in CI/CD pipelines.
"""

import argparse
import json
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.discovery import FileDiscovery
from app.core.graph.analyzer import GraphAnalyzer
from app.core.graph.builder import GraphBuilder
from app.core.parallel_parser import ParallelParser
from app.core.language_detector import LanguageDetector


def analyze_command(args):
    """Analyze a project and output results."""
    project_path = Path(args.project).resolve()

    if not project_path.exists():
        print(f"Error: Project path does not exist: {project_path}", file=sys.stderr)
        return 1

    if not project_path.is_dir():
        print(f"Error: Project path is not a directory: {project_path}", file=sys.stderr)
        return 1

    # Discover files
    discoverer = FileDiscovery()
    files = discoverer.discover_files(project_path)

    if not files:
        print(f"Error: No supported source files found in {project_path}", file=sys.stderr)
        return 1

    print(f"Found {len(files)} files to analyze...")

    # Parse files
    parser = ParallelParser()
    all_imports, warnings = parser.parse_files(files, project_path)

    print(f"Extracted {len(all_imports)} import statements")

    # Build graph
    graph_builder = GraphBuilder(project_path)
    graph_builder.add_imports(all_imports)

    # Analyze
    analyzer = GraphAnalyzer(graph_builder.get_graph())
    metrics = analyzer.compute_metrics()

    # Output results
    if args.format == "json":
        output_json(metrics, args.output)
    elif args.format == "text":
        output_text(metrics, warnings)
    elif args.format == "summary":
        output_summary(metrics)

    # Exit code based on thresholds
    exit_code = check_thresholds(metrics, args)

    return exit_code


def output_json(metrics, output_file):
    """Output results as JSON."""
    result = {
        "total_files": metrics.total_files,
        "total_imports": metrics.total_imports,
        "circular_dependencies": metrics.circular_dependencies,
        "circular_dependency_count": len(metrics.circular_dependencies),
        "max_import_depth": metrics.max_import_depth,
        "isolated_modules": metrics.isolated_modules,
        "isolated_module_count": len(metrics.isolated_modules),
    }

    if metrics.statistics:
        result["statistics"] = {
            "avg_imports_per_file": metrics.statistics.avg_imports_per_file,
            "max_imports_in_file": metrics.statistics.max_imports_in_file,
            "max_imports_file": metrics.statistics.max_imports_file,
            "most_imported_module": metrics.statistics.most_imported_module,
            "most_imported_count": metrics.statistics.most_imported_count,
        }

    if output_file:
        with open(output_file, "w") as f:
            json.dump(result, f, indent=2)
        print(f"Results written to {output_file}")
    else:
        print(json.dumps(result, indent=2))


def output_text(metrics, warnings):
    """Output results as formatted text."""
    print("\n" + "=" * 70)
    print("ANALYSIS RESULTS")
    print("=" * 70)
    print(f"\nTotal Files: {metrics.total_files}")
    print(f"Total Imports: {metrics.total_imports}")
    print(f"Max Import Depth: {metrics.max_import_depth}")

    if metrics.circular_dependencies:
        print(f"\n⚠️  Circular Dependencies: {len(metrics.circular_dependencies)}")
        for i, cycle in enumerate(metrics.circular_dependencies[:5], 1):
            print(f"  {i}. {' → '.join([Path(n).name for n in cycle])}")
        if len(metrics.circular_dependencies) > 5:
            print(f"  ... and {len(metrics.circular_dependencies) - 5} more")

    if metrics.isolated_modules:
        print(f"\nℹ️  Isolated Modules: {len(metrics.isolated_modules)}")

    if metrics.statistics:
        print(f"\n📊 Statistics:")
        print(f"  Avg Imports/File: {metrics.statistics.avg_imports_per_file}")
        print(f"  Max Imports in File: {metrics.statistics.max_imports_in_file}")

    if warnings:
        print(f"\n⚠️  Warnings: {len(warnings)}")
        for warning in warnings[:5]:
            print(f"  - {warning}")
        if len(warnings) > 5:
            print(f"  ... and {len(warnings) - 5} more")

    print()


def output_summary(metrics):
    """Output a brief summary."""
    health_score = 100
    if metrics.circular_dependencies:
        health_score -= len(metrics.circular_dependencies) * 5
    if metrics.max_import_depth > 10:
        health_score -= (metrics.max_import_depth - 10) * 2
    health_score = max(0, min(100, health_score))

    status = (
        "EXCELLENT"
        if health_score >= 90
        else "GOOD" if health_score >= 70 else "FAIR" if health_score >= 50 else "POOR"
    )

    print(f"\n{'='*50}")
    print(f"PROJECT HEALTH: {status} ({health_score}/100)")
    print(f"{'='*50}")
    print(f"Files: {metrics.total_files}")
    print(f"Circular Dependencies: {len(metrics.circular_dependencies)}")
    print(f"Max Depth: {metrics.max_import_depth}")
    print()


def check_thresholds(metrics, args):
    """Check if metrics exceed thresholds."""
    exit_code = 0

    if args.max_cycles is not None:
        if len(metrics.circular_dependencies) > args.max_cycles:
            print(
                f"❌ FAIL: Circular dependencies ({len(metrics.circular_dependencies)}) "
                f"exceeds threshold ({args.max_cycles})",
                file=sys.stderr,
            )
            exit_code = 1

    if args.max_depth is not None:
        if metrics.max_import_depth > args.max_depth:
            print(
                f"❌ FAIL: Import depth ({metrics.max_import_depth}) "
                f"exceeds threshold ({args.max_depth})",
                file=sys.stderr,
            )
            exit_code = 1

    if exit_code == 0 and (args.max_cycles is not None or args.max_depth is not None):
        print("✅ PASS: All quality gates passed")

    return exit_code


def detect_command(args):
    """Detect languages in a project."""
    project_path = Path(args.project).resolve()

    if not project_path.exists():
        print(f"Error: Project path does not exist: {project_path}", file=sys.stderr)
        return 1

    detector = LanguageDetector()
    breakdown = detector.get_language_breakdown(project_path)

    print(f"\nLanguages detected in {project_path.name}:")
    print("=" * 50)

    for lang, info in breakdown["languages"].items():
        print(f"{lang:15} {info['count']:5} files ({info['percentage']:5.1f}%)")

    print(f"\nPrimary Language: {breakdown['primary_language']}")
    print(f"Total Files: {breakdown['total_files']}")

    return 0


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Import Visualizer CLI - Analyze project dependencies",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Analyze project with summary output
  import-viz analyze ./my-project --format summary

  # Analyze and fail if more than 5 circular dependencies
  import-viz analyze ./my-project --max-cycles 5

  # Output JSON to file
  import-viz analyze ./my-project --format json --output results.json

  # Detect languages
  import-viz detect ./my-project
        """,
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Analyze command
    analyze_parser = subparsers.add_parser("analyze", help="Analyze a project")
    analyze_parser.add_argument("project", help="Path to project directory")
    analyze_parser.add_argument(
        "--format",
        choices=["json", "text", "summary"],
        default="text",
        help="Output format (default: text)",
    )
    analyze_parser.add_argument("--output", "-o", help="Output file (for JSON format)")
    analyze_parser.add_argument(
        "--max-cycles", type=int, help="Maximum allowed circular dependencies (fail if exceeded)"
    )
    analyze_parser.add_argument(
        "--max-depth", type=int, help="Maximum allowed import depth (fail if exceeded)"
    )

    # Detect command
    detect_parser = subparsers.add_parser("detect", help="Detect languages in a project")
    detect_parser.add_argument("project", help="Path to project directory")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 1

    if args.command == "analyze":
        return analyze_command(args)
    elif args.command == "detect":
        return detect_command(args)

    return 0


if __name__ == "__main__":
    sys.exit(main())
