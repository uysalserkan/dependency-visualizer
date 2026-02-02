"""Plugin system for extensible parsers and analyzers."""

import importlib
import inspect
from pathlib import Path
from typing import Any, Callable, Dict, List, Type

from app.core.parser.base import LanguageParser


class Plugin:
    """Base class for plugins."""

    def __init__(self):
        """Initialize plugin."""
        self.name = self.__class__.__name__
        self.version = "1.0.0"

    def initialize(self) -> None:
        """Initialize the plugin."""
        pass

    def cleanup(self) -> None:
        """Cleanup plugin resources."""
        pass


class ParserPlugin(Plugin):
    """Base class for parser plugins."""

    def get_parser(self) -> LanguageParser:
        """Get the parser instance.

        Returns:
            Parser instance
        """
        raise NotImplementedError


class PluginManager:
    """Manage plugins for the application."""

    def __init__(self):
        """Initialize plugin manager."""
        self._plugins: Dict[str, Plugin] = {}
        self._parsers: Dict[str, ParserPlugin] = {}
        self._hooks: Dict[str, List[Callable]] = {}

    def register_plugin(self, plugin: Plugin) -> None:
        """Register a plugin.

        Args:
            plugin: Plugin instance to register
        """
        plugin.initialize()
        self._plugins[plugin.name] = plugin

        # If it's a parser plugin, register it
        if isinstance(plugin, ParserPlugin):
            self._parsers[plugin.name] = plugin

    def unregister_plugin(self, name: str) -> None:
        """Unregister a plugin.

        Args:
            name: Name of the plugin to unregister
        """
        if name in self._plugins:
            plugin = self._plugins[name]
            plugin.cleanup()
            del self._plugins[name]

            if name in self._parsers:
                del self._parsers[name]

    def get_plugin(self, name: str) -> Plugin | None:
        """Get a plugin by name.

        Args:
            name: Name of the plugin

        Returns:
            Plugin instance if found
        """
        return self._plugins.get(name)

    def get_parser_plugins(self) -> List[ParserPlugin]:
        """Get all registered parser plugins.

        Returns:
            List of parser plugins
        """
        return list(self._parsers.values())

    def register_hook(self, event: str, callback: Callable) -> None:
        """Register a hook for an event.

        Args:
            event: Event name
            callback: Callback function
        """
        if event not in self._hooks:
            self._hooks[event] = []
        self._hooks[event].append(callback)

    def trigger_hook(self, event: str, *args, **kwargs) -> List[Any]:
        """Trigger all hooks for an event.

        Args:
            event: Event name
            *args: Positional arguments
            **kwargs: Keyword arguments

        Returns:
            List of results from all callbacks
        """
        if event not in self._hooks:
            return []

        results = []
        for callback in self._hooks[event]:
            try:
                result = callback(*args, **kwargs)
                results.append(result)
            except Exception as e:
                # Log error but continue with other hooks
                print(f"Hook error for {event}: {e}")

        return results

    def load_plugin_from_file(self, file_path: Path) -> None:
        """Load a plugin from a Python file.

        Args:
            file_path: Path to the plugin file
        """
        try:
            # Import the module
            spec = importlib.util.spec_from_file_location("plugin", file_path)
            if spec and spec.loader:
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)

                # Find Plugin classes in the module
                for name, obj in inspect.getmembers(module):
                    if (
                        inspect.isclass(obj)
                        and issubclass(obj, Plugin)
                        and obj != Plugin
                        and obj != ParserPlugin
                    ):
                        # Instantiate and register
                        plugin = obj()
                        self.register_plugin(plugin)

        except Exception as e:
            print(f"Failed to load plugin from {file_path}: {e}")

    def list_plugins(self) -> List[Dict[str, str]]:
        """List all registered plugins.

        Returns:
            List of plugin info dictionaries
        """
        return [
            {"name": plugin.name, "version": plugin.version, "type": plugin.__class__.__name__}
            for plugin in self._plugins.values()
        ]


# Global plugin manager instance
_plugin_manager: PluginManager | None = None


def get_plugin_manager() -> PluginManager:
    """Get or create global plugin manager instance.

    Returns:
        PluginManager instance
    """
    global _plugin_manager
    if _plugin_manager is None:
        _plugin_manager = PluginManager()
    return _plugin_manager
