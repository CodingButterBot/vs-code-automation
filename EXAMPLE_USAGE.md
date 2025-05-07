# VS Code MCP Extension: Example Usage

This document provides practical examples of how to use the VS Code MCP WebSocket extension with different programming languages and scenarios.

## Setting Up a Connection

Before sending commands, you need to establish a WebSocket connection to the server running in VS Code.

### JavaScript/Node.js

```javascript
const WebSocket = require('ws');

// Connect to the VS Code MCP WebSocket server
const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
  console.log('Connected to VS Code MCP Server');
  
  // Now you can send commands
  // ...
});

ws.on('message', (data) => {
  // Handle responses
  const response = JSON.parse(data);
  console.log('Received response:', response);
});

ws.on('close', () => {
  console.log('Disconnected from VS Code MCP Server');
});

// Function to send a command
function sendCommand(action, params = {}) {
  const id = Date.now(); // Simple ID generation
  const command = { id, action, params };
  ws.send(JSON.stringify(command));
  return id;
}
```

### Python

```python
import asyncio
import websockets
import json
import time

async def connect_to_vscode():
    async with websockets.connect('ws://localhost:3000') as websocket:
        print("Connected to VS Code MCP Server")
        
        # Function to send a command
        async def send_command(action, params={}):
            command_id = int(time.time() * 1000)  # Simple ID generation
            command = {
                "id": command_id,
                "action": action,
                "params": params
            }
            await websocket.send(json.dumps(command))
            return command_id
        
        # Now you can send commands
        # ...
        
        # Wait for responses
        while True:
            response = await websocket.recv()
            print(f"Received: {response}")

asyncio.get_event_loop().run_until_complete(connect_to_vscode())
```

## Example Scenarios

### 1. Open, Edit, and Save a File

This example shows how to open a file, insert some text at a specific position, and save it.

```javascript
// Open a file
sendCommand('openFile', { path: '/path/to/file.js' });

// Wait a moment for the file to open
setTimeout(() => {
  // Insert text at line 5, character 0
  sendCommand('type', {
    text: 'console.log("Hello from MCP!");\n',
    position: { line: 5, character: 0 },
    speed: 50,
    variation: 0.2
  });
  
  // Save the file after typing
  setTimeout(() => {
    sendCommand('saveFile');
  }, 2000);
}, 1000);
```

### 2. Create a New File with Templated Content

```javascript
// Template string for a React component
const reactComponentTemplate = `import React from 'react';

const ${componentName} = () => {
  return (
    <div>
      <h1>${componentName}</h1>
    </div>
  );
};

export default ${componentName};`;

// Create a new React component file
const componentName = 'MyNewComponent';
const filePath = `/path/to/src/components/${componentName}.jsx`;

sendCommand('createFile', {
  path: filePath,
  content: reactComponentTemplate.replace(/\${componentName}/g, componentName)
});
```

### 3. Run VS Code Commands for Code Formatting

```javascript
// Open a file first
sendCommand('openFile', { path: '/path/to/file.js' });

// Wait for file to open
setTimeout(() => {
  // Format the document using VS Code's built-in formatter
  sendCommand('runCommand', {
    command: 'editor.action.formatDocument'
  });
  
  // After formatting, save the file
  setTimeout(() => {
    sendCommand('saveFile');
  }, 1000);
}, 1000);
```

### 4. Interactive Coding Assistant Integration

This example shows how you might integrate the extension with an LLM-based coding assistant:

```javascript
async function askAIToImplementFunction(functionSpec) {
  // Call to an AI service (placeholder)
  const aiResponse = await callAIService({
    prompt: `Please implement a JavaScript function with this specification: ${functionSpec}`,
    // other parameters...
  });
  
  // Get the AI's code response
  const generatedCode = aiResponse.code;
  
  // Insert the code with typing animation
  sendCommand('type', {
    text: generatedCode,
    // Simulate realistic typing
    speed: 30,
    variation: 0.4,
    // Or use quick mode for large code blocks
    // quick: true
  });
}

// Example usage
askAIToImplementFunction(
  "A function that takes an array of numbers and returns the sum of all even numbers"
);
```

### 5. Mass File Operations

```javascript
// Get all JavaScript files in a directory
const fs = require('fs');
const path = require('path');

const directoryPath = '/path/to/project/src';
const filesInDir = fs.readdirSync(directoryPath)
  .filter(file => file.endsWith('.js'));

// Open each file, add a comment at the top, and save
filesInDir.forEach((file, index) => {
  setTimeout(() => {
    const filePath = path.join(directoryPath, file);
    
    // Open the file
    sendCommand('openFile', { path: filePath });
    
    // Wait for file to open
    setTimeout(() => {
      // Add comment at top
      sendCommand('type', {
        text: '// File updated by MCP automation\n',
        position: { line: 0, character: 0 }
      });
      
      // Save the file
      setTimeout(() => {
        sendCommand('saveFile');
      }, 500);
    }, 500);
  }, index * 2000); // Stagger operations
});
```

### 6. Advanced Cursor Manipulation

This example shows how to position the cursor in multiple locations to perform edits:

```javascript
// Open a file
sendCommand('openFile', { path: '/path/to/file.js' });

// Wait for file to open
setTimeout(async () => {
  // First, type at line 10
  sendCommand('type', {
    text: 'const newVariable = 42;\n',
    position: { line: 10, character: 0 },
    // After typing, move cursor to a different location
    afterCursor: { line: 15, character: 0 }
  });
  
  // Wait for first typing to complete
  setTimeout(() => {
    // Now type at the new cursor position (line 15)
    sendCommand('type', {
      text: 'console.log(newVariable);\n'
    });
  }, 1500);
}, 1000);
```

### 7. Create a Selection and Replace Text

```javascript
// Open file
sendCommand('openFile', { path: '/path/to/file.js' });

// Wait for file to open
setTimeout(() => {
  // Create a selection from line 5-10
  sendCommand('type', {
    text: '// This replaces the selected text\n// with these comments\n',
    selection: {
      start: { line: 5, character: 0 },
      end: { line: 10, character: 0 }
    },
    mode: 'replace', // Replace the selected text
    quick: true // Don't animate typing for this operation
  });
}, 1000);
```

## Tips for Effective Use

1. **Use IDs to track responses**: Always include unique IDs with your commands so you can match responses to their originating requests.

2. **Error handling**: Always check for error responses from the server.

3. **Timing considerations**: When chaining multiple commands, use appropriate timing delays to ensure operations complete sequentially.

4. **Cursor positioning**: Use the position and afterCursor parameters to precisely control where text is inserted.

5. **Animation vs. Speed**: For user demonstrations, use typing animations with variation for a natural feel. For batch operations, use the quick mode.

6. **Combine with runCommand**: Leverage VS Code's built-in commands through the runCommand action to tap into the full power of VS Code.