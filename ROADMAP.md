# VS Code MCP Extension: Development Roadmap

This document outlines the future development plans for the VS Code MCP WebSocket extension, organized by release milestones.

## Current Release (v0.1.0)

The initial release provides core functionality:

- WebSocket server with configurable port
- Status bar toggle for server on/off
- Basic file operations:
  - openFile
  - createFile
  - saveFile
  - closeFile
  - getFileContent
- Enhanced typing with cursor positioning and selection
- Command execution API
- Improved error handling and logging

## Short-Term Roadmap (v0.2.0)

Features planned for the next release:

### File System Enhancements
- **Directory Operations**: Create, delete, and list directories
- **Bulk File Operations**: Operate on multiple files with a single command
- **Path Utilities**: Resolve relative paths, get workspace root, etc.
- **File Watching**: Subscribe to file change notifications

### Editor Enhancements
- **Multi-Cursor Support**: Place multiple cursors programmatically
- **Text Selection API**: Enhanced selection capabilities (word, line, block)
- **Find and Replace**: Search and replace text across files
- **Language-aware Operations**: Format code, organize imports

### WebSocket Server Improvements
- **Authentication**: Basic auth for secure server access
- **Reconnection Logic**: Automatic reconnection on disconnection
- **Multiple Connection Management**: Better handling of multiple clients
- **Request Batching**: Execute multiple commands in a single request

## Mid-Term Roadmap (v0.3.0 - v0.5.0)

### Terminal Integration
- **Terminal Management**: Create, close terminals
- **Command Execution**: Run commands in integrated terminal
- **Output Streaming**: Stream command output to clients

### Source Control Integration
- **Git Operations**: Basic git operations (commit, push, pull)
- **Status Reporting**: Get git repository status
- **Diff Viewing**: Get file diffs programmatically

### Debugging API
- **Debug Session Control**: Start, stop, and control debug sessions
- **Breakpoint Management**: Set, clear, and toggle breakpoints
- **Variable Inspection**: Examine variables during debugging

### Workspace Management
- **Project Navigation**: Navigate between workspaces and projects
- **Settings Management**: View and modify workspace settings
- **Task Execution**: Run tasks defined in tasks.json

## Long-Term Vision (v1.0.0+)

### Advanced Integrations
- **Language Server Protocol**: Access LSP features programmatically
- **Custom Extension API**: Interact with other VS Code extensions
- **Workspace Analytics**: Gather stats about the codebase
- **AI Integration**: Connect with AI services for code suggestions

### Performance and Reliability
- **Request Throttling**: Prevent resource exhaustion
- **Enhanced Error Recovery**: Better handling of VS Code's state
- **Web Extension Support**: Support for VS Code running in a browser

### User Experience
- **UI Customization**: Control VS Code's UI layout
- **Command Chaining**: Define sequences of operations
- **Event-driven Automation**: React to VS Code events
- **Snippets Management**: Create and use code snippets

## Feature Wishlist

Community-suggested features that may be incorporated:

- **Code Generation Helpers**: Tools to scaffold code structures
- **Refactoring API**: Access built-in refactoring tools
- **External Tool Integration**: Launch and interact with external tools
- **VS Code Extension Management**: Install/enable/disable extensions
- **Synchronization**: Keep multiple VS Code instances in sync
- **Custom UI Components**: Add custom UI elements to VS Code
- **Workspace Templates**: Quick-start project templates
- **Collaborative Editing Support**: Multi-user editing capabilities

## Contributing

We welcome contributions to help realize this roadmap sooner! Here's how you can help:

1. **Submit Feature Requests**: Open issues for new feature ideas
2. **Report Bugs**: Help us identify and fix issues
3. **Contribute Code**: Submit pull requests for features or fixes
4. **Documentation**: Improve existing docs or add examples
5. **Testing**: Test new features across different platforms

To contribute, please follow our contribution guidelines in the CONTRIBUTING.md file.

---

This roadmap is subject to change based on community feedback and emerging priorities. Last updated: May 7, 2025.