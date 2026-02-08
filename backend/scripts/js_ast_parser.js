#!/usr/bin/env node
/**
 * JavaScript/TypeScript AST Parser using Acorn
 * 
 * This script parses JavaScript/TypeScript files and extracts import statements
 * using AST parsing for accurate detection of all import patterns.
 * 
 * Usage: node js_ast_parser.js <file_path>
 * Output: JSON array of imports with line numbers
 */

import * as acorn from 'acorn';
import * as acornLoose from 'acorn-loose';
import jsx from 'acorn-jsx';
import * as walk from 'acorn-walk';
import { readFileSync } from 'fs';
import { extname } from 'path';

// Extend acorn with JSX support
const jsxParser = acorn.Parser.extend(jsx());

/**
 * Parse a file and extract all imports
 * @param {string} filePath - Path to the file
 * @returns {Array} Array of import objects
 */
function parseFile(filePath) {
    const imports = [];

    try {
        const content = readFileSync(filePath, 'utf-8');
        const ext = extname(filePath).toLowerCase();

        // Try strict parsing first, fall back to loose parsing
        let ast;
        try {
            ast = jsxParser.parse(content, {
                ecmaVersion: 'latest',
                sourceType: 'module',
                locations: true,
                allowHashBang: true,
                allowImportExportEverywhere: true,
                allowAwaitOutsideFunction: true,
            });
        } catch (e) {
            // Fall back to loose parsing for files with syntax errors
            ast = acornLoose.parse(content, {
                ecmaVersion: 'latest',
                sourceType: 'module',
                locations: true,
            });
        }

        // Walk the AST to find imports
        walk.simple(ast, {
            // ES6 import statements
            ImportDeclaration(node) {
                imports.push({
                    source_file: filePath,
                    imported_module: node.source.value,
                    import_type: 'module',
                    line_number: node.loc.start.line,
                    is_type_import: node.importKind === 'type',
                });
            },

            // Dynamic imports: import('module')
            ImportExpression(node) {
                if (node.source && node.source.type === 'Literal') {
                    imports.push({
                        source_file: filePath,
                        imported_module: node.source.value,
                        import_type: 'dynamic',
                        line_number: node.loc.start.line,
                        is_type_import: false,
                    });
                }
            },

            // CommonJS require: require('module')
            CallExpression(node) {
                if (
                    node.callee.type === 'Identifier' &&
                    node.callee.name === 'require' &&
                    node.arguments.length > 0 &&
                    node.arguments[0].type === 'Literal'
                ) {
                    imports.push({
                        source_file: filePath,
                        imported_module: node.arguments[0].value,
                        import_type: 'require',
                        line_number: node.loc.start.line,
                        is_type_import: false,
                    });
                }
            },

            // Export from: export { x } from 'module'
            ExportNamedDeclaration(node) {
                if (node.source) {
                    imports.push({
                        source_file: filePath,
                        imported_module: node.source.value,
                        import_type: 'export-from',
                        line_number: node.loc.start.line,
                        is_type_import: node.exportKind === 'type',
                    });
                }
            },

            // Export all: export * from 'module'
            ExportAllDeclaration(node) {
                if (node.source) {
                    imports.push({
                        source_file: filePath,
                        imported_module: node.source.value,
                        import_type: 'export-all',
                        line_number: node.loc.start.line,
                        is_type_import: false,
                    });
                }
            },
        });

    } catch (error) {
        // Return error info if parsing fails completely
        return {
            error: true,
            message: error.message,
            file: filePath,
        };
    }

    return imports;
}

// Main execution
const filePath = process.argv[2];

if (!filePath) {
    console.error(JSON.stringify({ error: true, message: 'No file path provided' }));
    process.exit(1);
}

const result = parseFile(filePath);
console.log(JSON.stringify(result, null, 2));
