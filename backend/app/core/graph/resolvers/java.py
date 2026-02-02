"""Java import resolver."""

import re
from pathlib import Path
from typing import Optional

from app.core.graph.resolvers.base import ImportResolver
from app.core.logging import get_logger

logger = get_logger(__name__)

# Java standard library packages (JDK)
# Top-level packages like java.*, javax.*, jdk.*
JAVA_STDLIB_PACKAGES = frozenset({
    # Core java packages
    "java.applet",
    "java.awt",
    "java.beans",
    "java.beans.beancontext",
    "java.io",
    "java.lang",
    "java.lang.annotation",
    "java.lang.instrument",
    "java.lang.invoke",
    "java.lang.management",
    "java.lang.module",
    "java.lang.reflect",
    "java.math",
    "java.net",
    "java.net.http",
    "java.nio",
    "java.nio.channels",
    "java.nio.charset",
    "java.nio.file",
    "java.nio.file.attribute",
    "java.nio.file.spi",
    "java.rmi",
    "java.rmi.activation",
    "java.rmi.dgc",
    "java.rmi.registry",
    "java.rmi.server",
    "java.security",
    "java.security.acl",
    "java.security.cert",
    "java.security.interfaces",
    "java.security.spec",
    "java.sql",
    "java.text",
    "java.text.spi",
    "java.time",
    "java.time.chrono",
    "java.time.format",
    "java.time.temporal",
    "java.time.zone",
    "java.util",
    "java.util.concurrent",
    "java.util.concurrent.atomic",
    "java.util.concurrent.locks",
    "java.util.function",
    "java.util.jar",
    "java.util.logging",
    "java.util.prefs",
    "java.util.regex",
    "java.util.spi",
    "java.util.stream",
    "java.util.zip",
    # javax packages
    "javax.accessibility",
    "javax.annotation",
    "javax.annotation.processing",
    "javax.imageio",
    "javax.imageio.event",
    "javax.imageio.metadata",
    "javax.imageio.plugins.bmp",
    "javax.imageio.plugins.jpeg",
    "javax.imageio.spi",
    "javax.imageio.stream",
    "javax.jws",
    "javax.jws.soap",
    "javax.lang.model",
    "javax.lang.model.element",
    "javax.lang.model.type",
    "javax.lang.model.util",
    "javax.management",
    "javax.management.loading",
    "javax.management.modelmbean",
    "javax.management.monitor",
    "javax.management.openmbean",
    "javax.management.relation",
    "javax.management.remote",
    "javax.management.remote.rmi",
    "javax.management.timer",
    "javax.naming",
    "javax.naming.directory",
    "javax.naming.event",
    "javax.naming.ldap",
    "javax.naming.spi",
    "javax.net",
    "javax.net.ssl",
    "javax.print",
    "javax.print.attribute",
    "javax.print.attribute.standard",
    "javax.print.event",
    "javax.script",
    "javax.security.auth",
    "javax.security.auth.callback",
    "javax.security.auth.kerberos",
    "javax.security.auth.login",
    "javax.security.auth.spi",
    "javax.security.auth.x500",
    "javax.security.cert",
    "javax.security.sasl",
    "javax.smartcardio",
    "javax.sound.midi",
    "javax.sound.midi.spi",
    "javax.sound.sampled",
    "javax.sound.sampled.spi",
    "javax.sql",
    "javax.sql.rowset",
    "javax.sql.rowset.serial",
    "javax.sql.rowset.spi",
    "javax.swing",
    "javax.swing.border",
    "javax.swing.colorchooser",
    "javax.swing.event",
    "javax.swing.filechooser",
    "javax.swing.plaf",
    "javax.swing.plaf.basic",
    "javax.swing.plaf.metal",
    "javax.swing.plaf.multi",
    "javax.swing.plaf.nimbus",
    "javax.swing.plaf.synth",
    "javax.swing.table",
    "javax.swing.text",
    "javax.swing.text.html",
    "javax.swing.text.html.parser",
    "javax.swing.text.rtf",
    "javax.swing.tree",
    "javax.swing.undo",
    "javax.tools",
    "javax.transaction",
    "javax.transaction.xa",
    "javax.xml",
    "javax.xml.catalog",
    "javax.xml.crypto",
    "javax.xml.crypto.dom",
    "javax.xml.crypto.dsig",
    "javax.xml.crypto.dsig.dom",
    "javax.xml.crypto.dsig.keyinfo",
    "javax.xml.crypto.dsig.spec",
    "javax.xml.datatype",
    "javax.xml.namespace",
    "javax.xml.parsers",
    "javax.xml.stream",
    "javax.xml.stream.events",
    "javax.xml.stream.util",
    "javax.xml.transform",
    "javax.xml.transform.dom",
    "javax.xml.transform.sax",
    "javax.xml.transform.stax",
    "javax.xml.transform.stream",
    "javax.xml.validation",
    "javax.xml.xpath",
    # jdk packages
    "jdk.dynalink",
    "jdk.dynalink.beans",
    "jdk.dynalink.linker",
    "jdk.dynalink.linker.support",
    "jdk.dynalink.support",
    "jdk.incubator.concurrent",
    "jdk.incubator.vector",
    "jdk.javadoc.doclet",
    "jdk.jshell",
    "jdk.jshell.execution",
    "jdk.jshell.spi",
    "jdk.jshell.tool",
    "jdk.management",
    "jdk.management.jfr",
    "jdk.net",
    "jdk.nio.mapmode",
    "jdk.security.auth.module",
})


class JavaImportResolver(ImportResolver):
    """Resolve Java imports (stdlib, local packages, third-party)."""

    def __init__(self, project_root: Path):
        """Initialize Java resolver.

        Args:
            project_root: Root directory of the Java project
        """
        super().__init__(project_root)
        self._source_roots = self._find_source_roots()
        logger.debug(f"Java source roots: {self._source_roots}")

    def get_supported_extensions(self) -> list[str]:
        """Get supported Java file extensions."""
        return [".java"]

    def resolve_import(self, source_file: str, import_module: str) -> Optional[str]:
        """Resolve a Java import to a file path.

        Java import resolution:
        1. Standard library packages -> external (None)
        2. Wildcard imports -> external (None, can't determine which classes)
        3. Check in source roots -> internal file
        4. Third-party imports -> external (None)

        Args:
            source_file: Absolute path to Java file containing import
            import_module: Imported module (e.g., "java.util.ArrayList", "com.example.Helper")

        Returns:
            Absolute path to resolved .java file (for internal), or None (external)
        """
        # Wildcard imports can't be resolved
        if import_module.endswith(".*"):
            return None

        # Standard library packages are external
        if self._is_stdlib(import_module):
            return None

        # Try to resolve in source roots
        for source_root in self._source_roots:
            resolved = self._try_resolve_java_path(source_root, import_module)
            if resolved:
                return resolved

        # Third-party imports (not found in project)
        return None

    def is_stdlib(self, source_file: str, import_module: str) -> bool:
        """True if the import is Java standard library (not third-party)."""
        return self._is_stdlib(import_module)

    def _is_stdlib(self, import_module: str) -> bool:
        """Check if import is from Java standard library.

        Args:
            import_module: Import path to check

        Returns:
            True if stdlib package
        """
        # Remove wildcard if present
        module = import_module.rstrip("*").rstrip(".")

        # Check exact match
        if module in JAVA_STDLIB_PACKAGES:
            return True

        # Check if it's under a stdlib package
        # e.g., java.util.ArrayList matches java.util
        parts = module.split(".")
        for i in range(1, len(parts) + 1):
            potential_pkg = ".".join(parts[:i])
            if potential_pkg in JAVA_STDLIB_PACKAGES:
                return True

        return False

    def _find_source_roots(self) -> list[Path]:
        """Find source root directories in the project.

        Supports:
        1. Maven projects (src/main/java, src/test/java)
        2. Gradle projects (src/main/java, src/test/java)
        3. Plain Java projects (infer from directory structure)

        Returns:
            List of source root directories
        """
        source_roots = []

        # Check for Maven project
        pom_path = self.project_root / "pom.xml"
        if pom_path.exists():
            maven_roots = self._parse_maven_source_roots(pom_path)
            source_roots.extend(maven_roots)

        # Check for Gradle project
        gradle_paths = [
            self.project_root / "build.gradle",
            self.project_root / "build.gradle.kts",
        ]
        for gradle_path in gradle_paths:
            if gradle_path.exists():
                gradle_roots = self._parse_gradle_source_roots(gradle_path)
                source_roots.extend(gradle_roots)

        # If no build files found, use common default paths
        if not source_roots:
            default_roots = [
                self.project_root / "src" / "main" / "java",
                self.project_root / "src" / "java",
                self.project_root / "src",
                self.project_root,
            ]
            for root in default_roots:
                if root.exists() and root.is_dir():
                    source_roots.append(root)

        # Remove duplicates and non-existent paths
        unique_roots = []
        seen = set()
        for root in source_roots:
            try:
                resolved = root.resolve()
                if resolved not in seen and resolved.exists():
                    unique_roots.append(resolved)
                    seen.add(resolved)
            except Exception:
                pass

        return unique_roots if unique_roots else [self.project_root]

    def _parse_maven_source_roots(self, pom_path: Path) -> list[Path]:
        """Parse Maven pom.xml to find source directories.

        Args:
            pom_path: Path to pom.xml

        Returns:
            List of source root directories
        """
        roots = []
        try:
            with open(pom_path, "r", encoding="utf-8") as f:
                content = f.read()

            # Look for <sourceDirectory> tag
            # Pattern: <sourceDirectory>src/main/java</sourceDirectory>
            pattern = r"<sourceDirectory>\s*([^<]+)\s*</sourceDirectory>"
            matches = re.findall(pattern, content)

            if matches:
                for match in matches:
                    root = self.project_root / match.strip()
                    if root.exists():
                        roots.append(root)

            # If no custom sourceDirectory, use defaults
            if not roots:
                default_roots = [
                    self.project_root / "src" / "main" / "java",
                    self.project_root / "src" / "test" / "java",
                ]
                for root in default_roots:
                    if root.exists():
                        roots.append(root)

        except Exception as e:
            logger.warning(f"Failed to parse pom.xml: {e}")

        return roots

    def _parse_gradle_source_roots(self, gradle_path: Path) -> list[Path]:
        """Parse Gradle build.gradle to find source directories.

        Args:
            gradle_path: Path to build.gradle or build.gradle.kts

        Returns:
            List of source root directories
        """
        roots = []
        try:
            with open(gradle_path, "r", encoding="utf-8") as f:
                content = f.read()

            # Look for sourceSets configuration
            # Very simple pattern: look for java { srcDirs = [...] }
            # Pattern: java\s*\{\s*srcDirs\s*=\s*\[\s*[^]]+\]\s*\}
            pattern = r"java\s*\{\s*srcDirs\s*=\s*\[\s*([^\]]+)\]\s*\}"
            matches = re.findall(pattern, content)

            if matches:
                for match in matches:
                    # Parse the srcDirs list
                    # Format: 'src/main/java', 'src/test/java', ...
                    dirs = re.findall(r"['\"]([^'\"]+)['\"]", match)
                    for dir_path in dirs:
                        root = self.project_root / dir_path
                        if root.exists():
                            roots.append(root)

            # If no custom srcDirs, use defaults
            if not roots:
                default_roots = [
                    self.project_root / "src" / "main" / "java",
                    self.project_root / "src" / "test" / "java",
                ]
                for root in default_roots:
                    if root.exists():
                        roots.append(root)

        except Exception as e:
            logger.warning(f"Failed to parse build.gradle: {e}")

        return roots

    def _try_resolve_java_path(
        self, source_root: Path, import_module: str
    ) -> Optional[str]:
        """Try to resolve a Java import to a file in the source root.

        Converts: com.example.MyClass -> com/example/MyClass.java

        Args:
            source_root: Source root directory to search in
            import_module: Imported module name (e.g., "com.example.MyClass")

        Returns:
            Absolute path to .java file, or None if not found
        """
        # Convert package.Class notation to path
        # com.example.MyClass -> com/example/MyClass.java
        path_components = import_module.replace(".", "/")
        java_file = source_root / f"{path_components}.java"

        # Check if file exists and is in project
        if java_file.exists() and self._is_in_project(java_file):
            return str(java_file.resolve())

        return None
