"""Tests for Java resolver."""

import tempfile
from pathlib import Path

import pytest

from app.core.graph.resolvers.java import JavaImportResolver


# --- Resolver Tests ---


@pytest.fixture
def temp_maven_project():
    """Create a temporary Maven project structure."""
    with tempfile.TemporaryDirectory() as tmpdir:
        project_root = Path(tmpdir)

        # Create Maven structure
        src_main = project_root / "src" / "main" / "java"
        src_main.mkdir(parents=True)

        # Create pom.xml
        (project_root / "pom.xml").write_text(
            """<project>
    <groupId>com.example</groupId>
    <artifactId>myapp</artifactId>
    <version>1.0.0</version>
</project>"""
        )

        # Create package structure
        (src_main / "com" / "example").mkdir(parents=True)
        (src_main / "com" / "example" / "Main.java").write_text(
            """package com.example;

import com.example.utils.Helper;

public class Main {}"""
        )

        (src_main / "com" / "example" / "utils").mkdir(parents=True)
        (src_main / "com" / "example" / "utils" / "Helper.java").write_text(
            """package com.example.utils;

public class Helper {}"""
        )

        (src_main / "com" / "example" / "model").mkdir(parents=True)
        (src_main / "com" / "example" / "model" / "User.java").write_text(
            """package com.example.model;

public class User {}"""
        )

        yield project_root


@pytest.fixture
def temp_gradle_project():
    """Create a temporary Gradle project structure."""
    with tempfile.TemporaryDirectory() as tmpdir:
        project_root = Path(tmpdir)

        # Create Gradle structure
        src_main = project_root / "src" / "main" / "java"
        src_main.mkdir(parents=True)

        # Create build.gradle
        (project_root / "build.gradle").write_text(
            """plugins {
    id 'java'
}

sourceSets {
    main {
        java {
            srcDirs = ['src/main/java']
        }
    }
}"""
        )

        # Create package structure
        (src_main / "com" / "example").mkdir(parents=True)
        (src_main / "com" / "example" / "App.java").write_text(
            """package com.example;

public class App {}"""
        )

        yield project_root


@pytest.fixture
def temp_plain_java_project():
    """Create a temporary plain Java project (no build tools)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        project_root = Path(tmpdir)

        # Create package structure directly in project root
        (project_root / "com" / "example").mkdir(parents=True)
        (project_root / "com" / "example" / "Main.java").write_text(
            """package com.example;

public class Main {}"""
        )

        yield project_root


def test_java_resolver_stdlib(temp_maven_project):
    """Test that stdlib packages are detected as external."""
    resolver = JavaImportResolver(temp_maven_project)

    # Standard library packages should return None (external)
    assert resolver.resolve_import(str(temp_maven_project / "src" / "main" / "java" / "com" / "example" / "Main.java"), "java.util.ArrayList") is None
    assert (
        resolver.resolve_import(
            str(temp_maven_project / "src" / "main" / "java" / "com" / "example" / "Main.java"),
            "java.io.IOException",
        )
        is None
    )
    assert (
        resolver.resolve_import(
            str(temp_maven_project / "src" / "main" / "java" / "com" / "example" / "Main.java"),
            "javax.swing.JButton",
        )
        is None
    )


def test_java_resolver_external_dependencies(temp_maven_project):
    """Test that third-party packages are detected as external."""
    resolver = JavaImportResolver(temp_maven_project)

    # Third-party packages should return None (external)
    assert (
        resolver.resolve_import(
            str(temp_maven_project / "src" / "main" / "java" / "com" / "example" / "Main.java"),
            "org.springframework.boot.SpringApplication",
        )
        is None
    )
    assert (
        resolver.resolve_import(
            str(temp_maven_project / "src" / "main" / "java" / "com" / "example" / "Main.java"),
            "com.google.common.collect.Lists",
        )
        is None
    )


def test_java_resolver_internal_class_maven(temp_maven_project):
    """Test resolving internal project classes in Maven."""
    resolver = JavaImportResolver(temp_maven_project)

    # Internal class should resolve to file path
    result = resolver.resolve_import(
        str(temp_maven_project / "src" / "main" / "java" / "com" / "example" / "Main.java"),
        "com.example.utils.Helper",
    )
    expected = str(
        (temp_maven_project / "src" / "main" / "java" / "com" / "example" / "utils" / "Helper.java").resolve()
    )
    assert result == expected


def test_java_resolver_nested_packages_maven(temp_maven_project):
    """Test resolving deeply nested packages in Maven."""
    resolver = JavaImportResolver(temp_maven_project)

    result = resolver.resolve_import(
        str(temp_maven_project / "src" / "main" / "java" / "com" / "example" / "Main.java"),
        "com.example.model.User",
    )
    expected = str(
        (temp_maven_project / "src" / "main" / "java" / "com" / "example" / "model" / "User.java").resolve()
    )
    assert result == expected


def test_java_resolver_wildcard_import(temp_maven_project):
    """Test that wildcard imports are treated as external."""
    resolver = JavaImportResolver(temp_maven_project)

    # Wildcard imports can't be resolved
    assert (
        resolver.resolve_import(
            str(temp_maven_project / "src" / "main" / "java" / "com" / "example" / "Main.java"),
            "java.util.*",
        )
        is None
    )
    assert (
        resolver.resolve_import(
            str(temp_maven_project / "src" / "main" / "java" / "com" / "example" / "Main.java"),
            "com.example.utils.*",
        )
        is None
    )


def test_java_resolver_nonexistent_package(temp_maven_project):
    """Test that nonexistent packages return None."""
    resolver = JavaImportResolver(temp_maven_project)

    result = resolver.resolve_import(
        str(temp_maven_project / "src" / "main" / "java" / "com" / "example" / "Main.java"),
        "com.example.nonexistent.Class",
    )
    assert result is None


def test_java_resolver_gradle_project(temp_gradle_project):
    """Test resolver with Gradle project structure."""
    resolver = JavaImportResolver(temp_gradle_project)

    # Create another file to import
    src_main = temp_gradle_project / "src" / "main" / "java"
    (src_main / "com" / "example" / "Service.java").write_text(
        """package com.example;

public class Service {}"""
    )

    result = resolver.resolve_import(
        str(src_main / "com" / "example" / "App.java"),
        "com.example.Service",
    )
    expected = str((src_main / "com" / "example" / "Service.java").resolve())
    assert result == expected


def test_java_resolver_plain_java_project(temp_plain_java_project):
    """Test resolver with plain Java project (no build tools)."""
    resolver = JavaImportResolver(temp_plain_java_project)

    # Create another file
    (temp_plain_java_project / "com" / "example" / "Util.java").write_text(
        """package com.example;

public class Util {}"""
    )

    result = resolver.resolve_import(
        str(temp_plain_java_project / "com" / "example" / "Main.java"),
        "com.example.Util",
    )
    expected = str((temp_plain_java_project / "com" / "example" / "Util.java").resolve())
    assert result == expected


def test_java_resolver_supported_extensions():
    """Test that resolver returns correct supported extensions."""
    with tempfile.TemporaryDirectory() as tmpdir:
        resolver = JavaImportResolver(Path(tmpdir))
        extensions = resolver.get_supported_extensions()
        assert extensions == [".java"]


def test_java_resolver_is_stdlib():
    """Test stdlib detection for various packages."""
    with tempfile.TemporaryDirectory() as tmpdir:
        resolver = JavaImportResolver(Path(tmpdir))

        # Java packages
        assert resolver.is_stdlib("", "java.util.ArrayList")
        assert resolver.is_stdlib("", "java.io.IOException")
        assert resolver.is_stdlib("", "java.lang.String")
        assert resolver.is_stdlib("", "java.time.LocalDate")

        # Javax packages
        assert resolver.is_stdlib("", "javax.swing.JButton")
        assert resolver.is_stdlib("", "javax.xml.XMLConstants")

        # JDK packages
        assert resolver.is_stdlib("", "jdk.jshell.JShell")

        # Non-stdlib
        assert not resolver.is_stdlib("", "org.springframework.boot.SpringApplication")
        assert not resolver.is_stdlib("", "com.example.MyClass")
        assert not resolver.is_stdlib("", "com.google.common.collect.Lists")


def test_java_resolver_maven_with_custom_source_dir():
    """Test Maven project with custom source directory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        project_root = Path(tmpdir)

        # Create custom source directory
        custom_src = project_root / "custom" / "sources" / "java"
        custom_src.mkdir(parents=True)

        # Create pom.xml with custom sourceDirectory
        (project_root / "pom.xml").write_text(
            """<project>
    <groupId>com.example</groupId>
    <artifactId>myapp</artifactId>
    <version>1.0.0</version>
    <build>
        <sourceDirectory>custom/sources/java</sourceDirectory>
    </build>
</project>"""
        )

        # Create Java files
        (custom_src / "com" / "example").mkdir(parents=True)
        (custom_src / "com" / "example" / "App.java").write_text(
            """package com.example;

public class App {}"""
        )
        (custom_src / "com" / "example" / "Util.java").write_text(
            """package com.example;

public class Util {}"""
        )

        resolver = JavaImportResolver(project_root)

        result = resolver.resolve_import(
            str(custom_src / "com" / "example" / "App.java"),
            "com.example.Util",
        )
        expected = str((custom_src / "com" / "example" / "Util.java").resolve())
        assert result == expected


def test_java_resolver_multiple_source_roots():
    """Test project with multiple source roots (main and test)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        project_root = Path(tmpdir)

        # Create Maven structure with both main and test
        src_main = project_root / "src" / "main" / "java"
        src_test = project_root / "src" / "test" / "java"

        src_main.mkdir(parents=True)
        src_test.mkdir(parents=True)

        # Create pom.xml (will detect both by default)
        (project_root / "pom.xml").write_text(
            """<project>
    <groupId>com.example</groupId>
    <artifactId>myapp</artifactId>
    <version>1.0.0</version>
</project>"""
        )

        # Create production code
        (src_main / "com" / "example").mkdir(parents=True)
        (src_main / "com" / "example" / "App.java").write_text(
            """package com.example;

public class App {}"""
        )

        # Create test code
        (src_test / "com" / "example").mkdir(parents=True)
        (src_test / "com" / "example" / "AppTest.java").write_text(
            """package com.example;

public class AppTest {}"""
        )

        resolver = JavaImportResolver(project_root)

        # Should resolve both main and test classes
        result_main = resolver.resolve_import(
            str(src_test / "com" / "example" / "AppTest.java"),
            "com.example.App",
        )
        assert result_main is not None
        assert "src/main/java" in result_main or "src\\main\\java" in result_main


def test_java_resolver_inner_class():
    """Test that inner class imports are treated as external.
    
    Note: Inner classes like com.example.Outer.Inner are not typically
    directly imported in Java. Most code imports just the outer class.
    Our resolver will not match them, which is acceptable as they
    represent a rare edge case.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        project_root = Path(tmpdir)

        src_main = project_root / "src" / "main" / "java"
        src_main.mkdir(parents=True)

        (project_root / "pom.xml").write_text(
            """<project>
    <groupId>com.example</groupId>
    <artifactId>myapp</artifactId>
    <version>1.0.0</version>
</project>"""
        )

        # Create outer class
        (src_main / "com" / "example").mkdir(parents=True)
        (src_main / "com" / "example" / "Outer.java").write_text(
            """package com.example;

public class Outer {
    public static class Inner {}
}"""
        )

        resolver = JavaImportResolver(project_root)

        # Inner classes imported as Outer.Inner don't resolve directly
        # (they resolve when you import the outer class)
        result = resolver.resolve_import(
            str(src_main / "com" / "example" / "Outer.java"),
            "com.example.Outer.Inner",
        )
        # Inner class resolution is not supported; treated as external
        assert result is None
