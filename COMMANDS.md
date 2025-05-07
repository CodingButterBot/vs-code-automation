# VS Code MCP Extension Commands

This document outlines all available commands supported by the VS Code MCP WebSocket extension, including their parameters and example usage.

## Command Format

All commands follow a JSON-RPC style format:

```json
{
  "id": 123,          // Optional request ID for correlating responses
  "action": "openFile", // The command to execute (also accepts "method" as alias)
  "params": {         // Command-specific parameters
    // Parameters vary by command
  }
}
```

## Available Commands

### 1. openFile

Opens an existing file in VS Code.

**Parameters:**
- `path` (string, required): Absolute path to the file to open

**Example:**
```json
{
  "id": 1,
  "action": "openFile",
  "params": {
    "path": "/path/to/your/file.js"
  }
}
```

### 2. createFile

Creates a new file with optional initial content.

**Parameters:**
- `path` (string, required): Absolute path where the file should be created
- `content` (string, optional): Initial content for the file (defaults to empty string)

**Example:**
```json
{
  "id": 2,
  "action": "createFile",
  "params": {
    "path": "/path/to/new/file.js",
    "content": "// This is a new file\nconsole.log('Hello world');"
  }
}
```

### 3. saveFile

Saves the currently active file.

**Parameters:**
- None required (saves the current active editor document)

**Example:**
```json
{
  "id": 3,
  "action": "saveFile",
  "params": {}
}
```

### 4. closeFile

Closes a file, either the active editor or a specific file by path.

**Parameters:**
- `path` (string, optional): Path to the file to close. If not provided, closes the active editor.

**Example:**
```json
{
  "id": 4,
  "action": "closeFile",
  "params": {
    "path": "/path/to/file/to/close.js"
  }
}
```

### 5. getFileContent

Retrieves the content of a file, either from a specific path or the active editor.

**Parameters:**
- `path` (string, optional): Path to the file to read. If not provided, reads from the active editor.

**Example:**
```json
{
  "id": 5,
  "action": "getFileContent",
  "params": {
    "path": "/path/to/file.js"
  }
}
```

**Response:**
```json
{
  "id": 5,
  "result": {
    "path": "/path/to/file.js",
    "content": "// File content here\nconst x = 42;"
  }
}
```

### 6. type

Simulates typing in the active editor with various options for cursor positioning and typing behavior.

**Parameters:**
- `text` (string, required): The text to type
- `speed` (number, optional): Milliseconds delay between each character (defaults to configured value)
- `variation` (number, optional): Random variation to apply to typing speed (0-1 range, where 0.5 means ±50%)
- `duration` (number, optional): Total duration in milliseconds to distribute across all characters
- `quick` (boolean, optional): When true, inserts all text at once without animation
- `mode` (string, optional): Typing mode - "insert" (default), "replace", or "append"
- `position` (object, optional): Where to position cursor before typing:
  - `line` (number): Zero-based line number
  - `character` (number): Zero-based character position
- `selection` (object, optional): Creates a selection range before typing:
  - `start`: {line, character} - Selection start position
  - `end`: {line, character} - Selection end position
- `afterCursor` (object, optional): Where to position cursor after typing:
  - `line` (number): Zero-based line number
  - `character` (number): Zero-based character position

**Example:**
```json
{
  "id": 6,
  "action": "type",
  "params": {
    "text": "function helloWorld() {\n  console.log('Hello, world!');\n}",
    "speed": 50,
    "variation": 0.3,
    "position": {
      "line": 5,
      "character": 0
    }
  }
}
```

### 7. runCommand

Executes any VS Code command directly with optional arguments.

**Parameters:**
- `command` (string, required): The VS Code command ID to execute
- `args` (array, optional): Array of arguments to pass to the command

**Example:**
```json
{
  "id": 7,
  "action": "runCommand",
  "params": {
    "command": "editor.action.formatDocument"
  }
}
```

**Example with arguments:**
```json
{
  "id": 8,
  "action": "runCommand",
  "params": {
    "command": "workbench.action.findInFiles",
    "args": [
      {
        "query": "searchTerm",
        "isRegex": true
      }
    ]
  }
}
```

## Response Format

All commands return responses with the following format:

**Success Response:**
```json
{
  "id": 123,
  "result": "Operation result or success message"
}
```

**Error Response:**
```json
{
  "id": 123,
  "error": "Error message describing what went wrong"
}
```