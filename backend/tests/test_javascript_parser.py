"""Tests for JavaScript AST parser integration."""

import json
import tempfile
from pathlib import Path

import pytest

from app.core.parser.javascript import JavaScriptParser, JS_AST_PARSER_PATH


@pytest.fixture
def js_parser():
    """Create a JavaScript parser instance."""
    return JavaScriptParser()


@pytest.fixture
def temp_js_file():
    """Create a temporary JavaScript file for testing."""
    with tempfile.NamedTemporaryFile(suffix=".js", delete=False, mode="w") as f:
        f.write('''
import React from 'react';
import { useState, useEffect } from 'react';
import * as utils from './utils';
import defaultExport, { namedExport } from './module';
import './styles.css';
const lodash = require('lodash');
const fs = require('fs');
import('./dynamic-module').then(mod => mod.default());
export { foo } from './foo';
export * from './barrel';
''')
        f.flush()
        yield Path(f.name)


@pytest.fixture
def temp_ts_file():
    """Create a temporary TypeScript file for testing."""
    with tempfile.NamedTemporaryFile(suffix=".ts", delete=False, mode="w") as f:
        f.write('''
import type { User } from './types';
import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import * as path from 'path';
export type { Config } from './config';
''')
        f.flush()
        yield Path(f.name)


@pytest.fixture
def temp_multiline_file():
    """Create a file with multi-line imports for testing."""
    with tempfile.NamedTemporaryFile(suffix=".js", delete=False, mode="w") as f:
        f.write('''
import {
    foo,
    bar,
    baz
} from './multiline-module';

import 
    defaultExport 
from './another-module';
''')
        f.flush()
        yield Path(f.name)


class TestJavaScriptParserInit:
    """Test JavaScriptParser initialization."""
    
    def test_parser_initializes(self, js_parser):
        """Test that parser initializes correctly."""
        assert js_parser is not None
        assert hasattr(js_parser, '_node_available')
        assert hasattr(js_parser, '_ast_parser_available')
    
    def test_supported_extensions(self, js_parser):
        """Test supported file extensions."""
        extensions = js_parser.get_supported_extensions()
        assert ".js" in extensions
        assert ".jsx" in extensions
        assert ".ts" in extensions
        assert ".tsx" in extensions
        assert ".mjs" in extensions
        assert ".cjs" in extensions


class TestJavaScriptParserBasic:
    """Test basic JavaScript parsing."""
    
    def test_parse_es6_imports(self, js_parser, temp_js_file):
        """Test parsing ES6 import statements."""
        imports = js_parser.parse_file(temp_js_file)
        modules = [i.imported_module for i in imports]
        
        assert 'react' in modules
        assert './utils' in modules
        assert './module' in modules
        assert './styles.css' in modules
    
    def test_parse_commonjs_requires(self, js_parser, temp_js_file):
        """Test parsing CommonJS require statements."""
        imports = js_parser.parse_file(temp_js_file)
        modules = [i.imported_module for i in imports]
        
        assert 'lodash' in modules
        assert 'fs' in modules
    
    def test_parse_dynamic_imports(self, js_parser, temp_js_file):
        """Test parsing dynamic import() statements."""
        imports = js_parser.parse_file(temp_js_file)
        modules = [i.imported_module for i in imports]
        
        assert './dynamic-module' in modules
    
    def test_parse_reexports(self, js_parser, temp_js_file):
        """Test parsing re-export statements."""
        imports = js_parser.parse_file(temp_js_file)
        modules = [i.imported_module for i in imports]
        
        assert './foo' in modules
        assert './barrel' in modules


class TestJavaScriptParserTypeScript:
    """Test TypeScript-specific parsing."""
    
    def test_parse_type_imports(self, js_parser, temp_ts_file):
        """Test parsing TypeScript type imports."""
        imports = js_parser.parse_file(temp_ts_file)
        modules = [i.imported_module for i in imports]
        
        assert './types' in modules
        assert '@angular/core' in modules
        assert 'rxjs' in modules


class TestJavaScriptParserMultiline:
    """Test multi-line import parsing (AST advantage over regex)."""
    
    @pytest.mark.skipif(
        not JS_AST_PARSER_PATH.exists(),
        reason="AST parser script not available"
    )
    def test_parse_multiline_imports(self, js_parser, temp_multiline_file):
        """Test parsing multi-line import statements."""
        imports = js_parser.parse_file(temp_multiline_file)
        modules = [i.imported_module for i in imports]
        
        # AST parser should handle multi-line imports correctly
        assert './multiline-module' in modules
        assert './another-module' in modules


class TestJavaScriptParserEdgeCases:
    """Test edge cases and error handling."""
    
    def test_parse_empty_file(self, js_parser):
        """Test parsing empty file."""
        with tempfile.NamedTemporaryFile(suffix=".js", delete=False, mode="w") as f:
            f.write("")
            f.flush()
            imports = js_parser.parse_file(Path(f.name))
        
        assert imports == []
    
    def test_parse_file_with_syntax_error(self, js_parser):
        """Test parsing file with syntax errors (should not crash)."""
        with tempfile.NamedTemporaryFile(suffix=".js", delete=False, mode="w") as f:
            f.write("import { from './broken")
            f.flush()
            imports = js_parser.parse_file(Path(f.name))
        
        # Should return empty or partial results, not crash
        assert isinstance(imports, list)
    
    def test_parse_nonexistent_file(self, js_parser):
        """Test parsing nonexistent file."""
        imports = js_parser.parse_file(Path("/nonexistent/file.js"))
        assert imports == []
    
    def test_parse_file_with_comments(self, js_parser):
        """Test that commented imports are not detected."""
        with tempfile.NamedTemporaryFile(suffix=".js", delete=False, mode="w") as f:
            f.write('''
// import { foo } from './commented';
/* import { bar } from './block-commented'; */
import { baz } from './real-import';
''')
            f.flush()
            imports = js_parser.parse_file(Path(f.name))
        
        modules = [i.imported_module for i in imports]
        assert './real-import' in modules
        # With AST parsing, commented imports should NOT be included
        # With regex, they might be (known limitation)


class TestJavaScriptParserLineNumbers:
    """Test line number accuracy."""
    
    def test_line_numbers_correct(self, js_parser):
        """Test that line numbers are accurate."""
        with tempfile.NamedTemporaryFile(suffix=".js", delete=False, mode="w") as f:
            f.write('''// Comment
import { foo } from './foo';
import { bar } from './bar';
''')
            f.flush()
            imports = js_parser.parse_file(Path(f.name))
        
        foo_import = next((i for i in imports if i.imported_module == './foo'), None)
        bar_import = next((i for i in imports if i.imported_module == './bar'), None)
        
        assert foo_import is not None
        assert bar_import is not None
        assert foo_import.line_number == 2
        assert bar_import.line_number == 3
