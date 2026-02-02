"""Tests for Java parser."""

import tempfile
from pathlib import Path

import pytest

from app.core.parser.java import JavaParser


# --- Parser Tests ---


def test_java_parser_single_import():
    """Test parsing single import statement."""
    parser = JavaParser()

    with tempfile.NamedTemporaryFile(mode="w", suffix=".java", delete=False) as f:
        f.write(
            """package com.example;

import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        ArrayList<String> list = new ArrayList<>();
    }
}"""
        )
        f.flush()

        imports = parser.parse_file(Path(f.name))

    assert len(imports) == 1
    assert imports[0].imported_module == "java.util.ArrayList"
    assert imports[0].import_type == "module"
    assert imports[0].line_number == 3


def test_java_parser_multiple_imports():
    """Test parsing multiple imports."""
    parser = JavaParser()

    with tempfile.NamedTemporaryFile(mode="w", suffix=".java", delete=False) as f:
        f.write(
            """package com.example;

import java.util.ArrayList;
import java.util.HashMap;
import java.io.IOException;

public class Main {}"""
        )
        f.flush()

        imports = parser.parse_file(Path(f.name))

    assert len(imports) == 3
    modules = {imp.imported_module for imp in imports}
    assert modules == {"java.util.ArrayList", "java.util.HashMap", "java.io.IOException"}


def test_java_parser_wildcard_import():
    """Test parsing wildcard import."""
    parser = JavaParser()

    with tempfile.NamedTemporaryFile(mode="w", suffix=".java", delete=False) as f:
        f.write(
            """package com.example;

import java.util.*;

public class Main {}"""
        )
        f.flush()

        imports = parser.parse_file(Path(f.name))

    assert len(imports) == 1
    assert imports[0].imported_module == "java.util.*"


def test_java_parser_static_import():
    """Test parsing static import."""
    parser = JavaParser()

    with tempfile.NamedTemporaryFile(mode="w", suffix=".java", delete=False) as f:
        f.write(
            """package com.example;

import static java.lang.Math.PI;

public class Main {
    double circle = 2 * PI;
}"""
        )
        f.flush()

        imports = parser.parse_file(Path(f.name))

    assert len(imports) == 1
    assert imports[0].imported_module == "java.lang.Math.PI"
    assert imports[0].import_type == "from"


def test_java_parser_static_wildcard_import():
    """Test parsing static wildcard import."""
    parser = JavaParser()

    with tempfile.NamedTemporaryFile(mode="w", suffix=".java", delete=False) as f:
        f.write(
            """package com.example;

import static java.lang.Math.*;

public class Main {}"""
        )
        f.flush()

        imports = parser.parse_file(Path(f.name))

    assert len(imports) == 1
    assert imports[0].imported_module == "java.lang.Math.*"
    assert imports[0].import_type == "from"


def test_java_parser_ignores_line_comments():
    """Test that parser ignores single-line comments."""
    parser = JavaParser()

    with tempfile.NamedTemporaryFile(mode="w", suffix=".java", delete=False) as f:
        f.write(
            """package com.example;

// import java.util.HashMap;
import java.util.ArrayList;
// import java.io.IOException;

public class Main {}"""
        )
        f.flush()

        imports = parser.parse_file(Path(f.name))

    assert len(imports) == 1
    assert imports[0].imported_module == "java.util.ArrayList"


def test_java_parser_ignores_multiline_comments():
    """Test that parser ignores multi-line comments."""
    parser = JavaParser()

    with tempfile.NamedTemporaryFile(mode="w", suffix=".java", delete=False) as f:
        f.write(
            """package com.example;

/*
import java.util.HashMap;
import java.io.IOException;
*/
import java.util.ArrayList;

public class Main {}"""
        )
        f.flush()

        imports = parser.parse_file(Path(f.name))

    assert len(imports) == 1
    assert imports[0].imported_module == "java.util.ArrayList"


def test_java_parser_nested_multiline_comments():
    """Test parsing with nested-style comment patterns."""
    parser = JavaParser()

    with tempfile.NamedTemporaryFile(mode="w", suffix=".java", delete=False) as f:
        f.write(
            """package com.example;

import java.util.ArrayList;
/* This is a comment with import java.util.HashMap; inside */
import java.io.IOException;

public class Main {}"""
        )
        f.flush()

        imports = parser.parse_file(Path(f.name))

    assert len(imports) == 2
    modules = {imp.imported_module for imp in imports}
    assert modules == {"java.util.ArrayList", "java.io.IOException"}


def test_java_parser_import_in_string_literal():
    """Test that parser doesn't match imports inside string literals."""
    parser = JavaParser()

    with tempfile.NamedTemporaryFile(mode="w", suffix=".java", delete=False) as f:
        f.write(
            '''package com.example;

import java.util.ArrayList;

public class Main {
    String msg = "import java.util.HashMap;";
}'''
        )
        f.flush()

        imports = parser.parse_file(Path(f.name))

    assert len(imports) == 1
    assert imports[0].imported_module == "java.util.ArrayList"


def test_java_parser_package_statement_ignored():
    """Test that package statement is not parsed as import."""
    parser = JavaParser()

    with tempfile.NamedTemporaryFile(mode="w", suffix=".java", delete=False) as f:
        f.write(
            """package com.example.app;

import java.util.ArrayList;

public class Main {}"""
        )
        f.flush()

        imports = parser.parse_file(Path(f.name))

    assert len(imports) == 1
    assert imports[0].imported_module == "java.util.ArrayList"


def test_java_parser_inner_class_import():
    """Test parsing inner class imports."""
    parser = JavaParser()

    with tempfile.NamedTemporaryFile(mode="w", suffix=".java", delete=False) as f:
        f.write(
            """package com.example;

import com.example.Outer.Inner;

public class Main {}"""
        )
        f.flush()

        imports = parser.parse_file(Path(f.name))

    assert len(imports) == 1
    assert imports[0].imported_module == "com.example.Outer.Inner"


def test_java_parser_deep_package_import():
    """Test parsing deeply nested package imports."""
    parser = JavaParser()

    with tempfile.NamedTemporaryFile(mode="w", suffix=".java", delete=False) as f:
        f.write(
            """package com.example;

import org.springframework.boot.SpringApplication;
import com.google.common.collect.Lists;

public class Main {}"""
        )
        f.flush()

        imports = parser.parse_file(Path(f.name))

    assert len(imports) == 2
    modules = {imp.imported_module for imp in imports}
    assert modules == {
        "org.springframework.boot.SpringApplication",
        "com.google.common.collect.Lists",
    }


def test_java_parser_mixed_imports():
    """Test parsing mixed regular and static imports."""
    parser = JavaParser()

    with tempfile.NamedTemporaryFile(mode="w", suffix=".java", delete=False) as f:
        f.write(
            """package com.example;

import java.util.ArrayList;
import static java.lang.Math.PI;
import java.util.*;
import static java.lang.System.*;

public class Main {}"""
        )
        f.flush()

        imports = parser.parse_file(Path(f.name))

    assert len(imports) == 4
    # Check import types
    static_imports = [imp for imp in imports if imp.import_type == "from"]
    regular_imports = [imp for imp in imports if imp.import_type == "module"]
    assert len(static_imports) == 2
    assert len(regular_imports) == 2


def test_java_parser_empty_file():
    """Test parsing an empty Java file."""
    parser = JavaParser()

    with tempfile.NamedTemporaryFile(mode="w", suffix=".java", delete=False) as f:
        f.write("")
        f.flush()

        imports = parser.parse_file(Path(f.name))

    assert len(imports) == 0


def test_java_parser_no_imports():
    """Test parsing Java file with no imports."""
    parser = JavaParser()

    with tempfile.NamedTemporaryFile(mode="w", suffix=".java", delete=False) as f:
        f.write(
            """package com.example;

public class Main {}"""
        )
        f.flush()

        imports = parser.parse_file(Path(f.name))

    assert len(imports) == 0


def test_java_parser_whitespace_handling():
    """Test that parser handles extra whitespace correctly."""
    parser = JavaParser()

    with tempfile.NamedTemporaryFile(mode="w", suffix=".java", delete=False) as f:
        f.write(
            """package com.example;

import   java.util.ArrayList  ;
import	java.io.IOException;
import static   java.lang.Math.PI ;

public class Main {}"""
        )
        f.flush()

        imports = parser.parse_file(Path(f.name))

    assert len(imports) == 3
    modules = {imp.imported_module for imp in imports}
    assert modules == {"java.util.ArrayList", "java.io.IOException", "java.lang.Math.PI"}


def test_java_parser_invalid_syntax():
    """Test that parser handles invalid Java syntax gracefully."""
    parser = JavaParser()

    with tempfile.NamedTemporaryFile(mode="w", suffix=".java", delete=False) as f:
        f.write(
            """package com.example;

import java.util.ArrayList;
import this is invalid;
import;

public class Main {}"""
        )
        f.flush()

        imports = parser.parse_file(Path(f.name))

    # Should only find the valid import
    assert len(imports) == 1
    assert imports[0].imported_module == "java.util.ArrayList"


def test_java_parser_supported_extensions():
    """Test that parser returns correct supported extensions."""
    parser = JavaParser()
    extensions = parser.get_supported_extensions()
    assert extensions == [".java"]
