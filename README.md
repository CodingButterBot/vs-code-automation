# VS Code MCP WebSocket Server

A Visual Studio Code extension that exposes a WebSocket server for Model Context Protocol (MCP) to control VS Code programmatically. This lets AI agents and other external tools automate VS Code operations through a simple JSON-RPC style API.

## Features

- **WebSocket Server:** Run a WebSocket server inside VS Code on a configurable port
- **Status Bar Toggle:** Easily enable/disable the server with connection status indicator
- **Token-based Authentication:** Secure your connections with authentication tokens
- **File Operations:** Open, create, save, and close files programmatically
- **Content Manipulation:** Get file content and simulate typing with animation
- **VS Code Command Execution:** Run any VS Code command with parameters

## Configuration

The extension can be configured through VS Code's settings:

- `mcp-server.port`: Port number for the WebSocket server (default: 3000)
- `mcp-server.autoStart`: Automatically start the server on VS Code startup (default: false)
- `mcp-server.defaultTypingSpeed`: Default typing speed in milliseconds per character (default: 50)
- `mcp-server.auth.enabled`: Enable authentication for WebSocket connections (default: false)
- `mcp-server.auth.token`: Authentication token for securing WebSocket connections (required if auth is enabled)
- `mcp-server.auth.generateRandomToken`: Generate a random token on startup if no token is provided (default: true)

## Security

When authentication is enabled:

1. Enable authentication in settings with `mcp-server.auth.enabled`
2. Either:
   - Set a specific token with `mcp-server.auth.token`
   - Let the extension generate a random token (if `mcp-server.auth.generateRandomToken` is true)
3. The generated token will be shown in a notification with an option to copy it
4. Clients must include this token with their connection

## Usage

### Starting the Server

1. Click the MCP status bar item (shows "MCP: Off" initially)
2. The server will start and the status bar will update to "MCP: On"
3. Connect clients to `ws://localhost:3000` (or your configured port)
4. If authentication is enabled, connect with token: `ws://localhost:3000?token=YOUR_TOKEN` or use an Authorization header

### Client Commands

Send commands as JSON objects with this format:

```json
{
  "id": 1,           // Optional request ID for correlating responses
  "action": "openFile",  // Or "method" - the action to perform
  "params": {        // Parameters for the action
    // Action-specific parameters
  }
}
```

Responses will be in this format:

```json
{
  "id": 1,           // Same ID as the request (if provided)
  "result": "..."    // Success result
}
```

Or for errors:

```json
{
  "id": 1,           // Same ID as the request (if provided)
  "error": "Error message"  // Error description
}
```

### Available Commands

#### openFile

Opens an existing file in the editor.

```json
{
  "id": 1,
  "action": "openFile",
  "params": {
    "path": "/path/to/file.txt"
  }
}
```

#### createFile

Creates a new file with optional content.

```json
{
  "id": 2,
  "action": "createFile",
  "params": {
    "path": "/path/to/new-file.txt",
    "content": "Initial content here"
  }
}
```

#### saveFile

Saves the currently active file.

```json
{
  "id": 3,
  "action": "saveFile"
}
```

#### closeFile

Closes a file by path or the currently active file.

```json
{
  "id": 4,
  "action": "closeFile",
  "params": {
    "path": "/path/to/file.txt"  // Optional, closes active file if omitted
  }
}
```

#### getFileContent

Gets the content of a file by path or the currently active file.

```json
{
  "id": 5,
  "action": "getFileContent",
  "params": {
    "path": "/path/to/file.txt"  // Optional, uses active file if omitted
  }
}
```

#### type

Types text into the active editor with optional animation parameters.

```json
{
  "id": 6,
  "action": "type",
  "params": {
    "text": "Text to type",
    "speed": 50,          // Optional: ms per character
    "variation": 0.2,     // Optional: randomness (0-1)
    "duration": 5000,     // Optional: total duration in ms (overrides speed)
    "position": {         // Optional: position to place cursor before typing
      "line": 10,
      "character": 5
    },
    "selection": {        // Optional: selection range before typing
      "start": {"line": 1, "character": 0},
      "end": {"line": 2, "character": 10}
    },
    "mode": "insert",     // Optional: "insert" (default), "replace", "append"
    "quick": false        // Optional: true to insert all at once (no animation)
  }
}
```

#### runCommand

Executes any VS Code command with optional arguments.

```json
{
  "id": 7,
  "action": "runCommand",
  "params": {
    "command": "editor.action.formatDocument",
    "args": []  // Optional arguments for the command
  }
}
```

## Example Clients

Check the `client-examples` directory for sample clients in various languages:

- `node-client.js` - Node.js client example
- `python-client.py` - Python client example

To use authentication with the Node.js client:

```bash
node node-client.js --token=YOUR_TOKEN
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT