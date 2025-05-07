/**
 * Example Node.js client for the VS Code MCP WebSocket Extension
 * 
 * This demonstrates how to connect to the WebSocket server and send commands
 * to control VS Code programmatically.
 * 
 * Usage:
 *   node node-client.js
 */

const WebSocket = require('ws');
const readline = require('readline');

// Configuration
const PORT = 3000;
const DEFAULT_SERVER_URL = `ws://localhost:${PORT}`;
let authToken; // Will be set from command line args or prompted

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Parse command line arguments for token
const args = process.argv.slice(2);
const tokenArg = args.find(arg => arg.startsWith('--token='));
if (tokenArg) {
  authToken = tokenArg.split('=')[1];
}

// Function to connect to the WebSocket server
async function connectToServer() {
  // If token is not provided via command line, prompt for it
  if (!authToken) {
    // We can't use rl.question here because we're not in the event loop yet
    // So we'll just provide instructions
    console.log('No authentication token provided.');
    console.log('To use authentication, restart with --token=YOUR_TOKEN');
    console.log('Attempting to connect without authentication...');
  }
  
  // Add token to URL if provided
  const serverUrl = authToken 
    ? `${DEFAULT_SERVER_URL}?token=${encodeURIComponent(authToken)}`
    : DEFAULT_SERVER_URL;
  
  console.log(`Connecting to VS Code MCP Server at ${DEFAULT_SERVER_URL}${authToken ? ' with authentication' : ''}...`);
  
  // Create WebSocket connection
  return new WebSocket(serverUrl);
}

// Create a connection to the VS Code MCP Server
let ws;

// Map to track pending requests
const pendingRequests = new Map();

// Next request ID
let nextId = 1;

// Initialize connection and set up event handlers
async function init() {
  try {
    ws = await connectToServer();
    
    // Connect event
    ws.on('open', () => {
      console.log('Connected to VS Code MCP Server');
      showMenu();
    });
    
    // Message event
    ws.on('message', (data) => {
  try {
    const response = JSON.parse(data.toString());
    
    // Check if this is a response to a pending request
    if (response.id && pendingRequests.has(response.id)) {
      const { resolve, reject, description } = pendingRequests.get(response.id);
      pendingRequests.delete(response.id);
      
      if (response.error) {
        console.log(`❌ Error: ${response.error}`);
        reject(new Error(response.error));
      } else {
        console.log(`✅ Success: ${description}`);
        if (typeof response.result === 'object') {
          console.log(JSON.stringify(response.result, null, 2));
        } else {
          console.log(response.result);
        }
        resolve(response.result);
      }
      
      // Show menu again after response is handled
      showMenu();
    }
  } catch (err) {
    console.error('Failed to parse message:', err);
  }
});

// Error event
ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Close event
ws.on('close', (code, reason) => {
  console.log(`Disconnected from VS Code MCP Server: ${code} ${reason || ''}`);
  
  // If we disconnected due to auth failures, provide more helpful message
  if (code === 1001 || code === 1002) {
    console.log('Authentication may have failed. Check your token and try again.');
  }
  
  process.exit(0);
});
  } catch (err) {
    console.error('Failed to connect:', err);
    process.exit(1);
  }
}

// Start the client
init();

/**
 * Shows the main menu of available commands
 */
function showMenu() {
  console.log('\n🔧 VS Code MCP Client - Available Commands:');
  console.log('1. Open a file');
  console.log('2. Create a new file');
  console.log('3. Get file content');
  console.log('4. Save current file');
  console.log('5. Close file');
  console.log('6. Type text at cursor');
  console.log('7. Type text at specific position');
  console.log('8. Run VS Code command');
  console.log('9. Exit');
  
  rl.question('\nEnter command number: ', (answer) => {
    switch (answer) {
      case '1':
        promptOpenFile();
        break;
      case '2':
        promptCreateFile();
        break;
      case '3':
        promptGetFileContent();
        break;
      case '4':
        saveCurrentFile();
        break;
      case '5':
        promptCloseFile();
        break;
      case '6':
        promptTypeText();
        break;
      case '7':
        promptTypeTextAtPosition();
        break;
      case '8':
        promptRunCommand();
        break;
      case '9':
        exit();
        break;
      default:
        console.log('Invalid option');
        showMenu();
    }
  });
}

/**
 * Sends a command to the VS Code MCP server
 * @param {string} action - The command action
 * @param {object} params - The command parameters
 * @param {string} description - Description of the command for logging
 * @returns {Promise} - A promise that resolves with the command result
 */
function sendCommand(action, params = {}, description = action) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const command = { id, action, params };
    
    console.log(`Sending ${action} command:`, JSON.stringify(params));
    
    // Store the pending request with resolve/reject handlers
    pendingRequests.set(id, { resolve, reject, description });
    
    // Send the command
    ws.send(JSON.stringify(command));
  });
}

// Command implementations

function promptOpenFile() {
  rl.question('Enter file path to open: ', (path) => {
    sendCommand('openFile', { path }, `Open file: ${path}`)
      .catch(() => {
        // Error already logged, just show menu again
        setTimeout(showMenu, 1000);
      });
  });
}

function promptCreateFile() {
  rl.question('Enter file path to create: ', (path) => {
    rl.question('Enter initial content (or press Enter for empty file): ', (content) => {
      sendCommand('createFile', { path, content }, `Create file: ${path}`)
        .catch(() => {
          setTimeout(showMenu, 1000);
        });
    });
  });
}

function promptGetFileContent() {
  rl.question('Enter file path (or press Enter for active file): ', (path) => {
    const params = path ? { path } : {};
    sendCommand('getFileContent', params, `Get content of ${path || 'active file'}`)
      .catch(() => {
        setTimeout(showMenu, 1000);
      });
  });
}

function saveCurrentFile() {
  sendCommand('saveFile', {}, 'Save current file')
    .catch(() => {
      setTimeout(showMenu, 1000);
    });
}

function promptCloseFile() {
  rl.question('Enter file path (or press Enter for active file): ', (path) => {
    const params = path ? { path } : {};
    sendCommand('closeFile', params, `Close ${path || 'active file'}`)
      .catch(() => {
        setTimeout(showMenu, 1000);
      });
  });
}

function promptTypeText() {
  rl.question('Enter text to type: ', (text) => {
    rl.question('Typing speed (ms per char, default: 50): ', (speedStr) => {
      rl.question('Variation (0-1, default: 0.2): ', (variationStr) => {
        const speed = speedStr ? parseInt(speedStr, 10) : 50;
        const variation = variationStr ? parseFloat(variationStr) : 0.2;
        
        sendCommand('type', { 
          text, 
          speed, 
          variation 
        }, 'Type text')
          .catch(() => {
            setTimeout(showMenu, 1000);
          });
      });
    });
  });
}

function promptTypeTextAtPosition() {
  rl.question('Enter text to type: ', (text) => {
    rl.question('Line number: ', (lineStr) => {
      rl.question('Character position: ', (charStr) => {
        const line = parseInt(lineStr, 10);
        const character = parseInt(charStr, 10);
        
        sendCommand('type', { 
          text, 
          position: { line, character },
          quick: true // Don't animate for this example
        }, `Type text at position ${line}:${character}`)
          .catch(() => {
            setTimeout(showMenu, 1000);
          });
      });
    });
  });
}

function promptRunCommand() {
  rl.question('Enter VS Code command to run: ', (command) => {
    rl.question('Enter arguments as JSON (or press Enter for none): ', (argsStr) => {
      let args = undefined;
      
      if (argsStr) {
        try {
          args = JSON.parse(argsStr);
        } catch (e) {
          console.error('Invalid JSON arguments:', e);
          return showMenu();
        }
      }
      
      sendCommand('runCommand', { 
        command,
        args
      }, `Run command: ${command}`)
        .catch(() => {
          setTimeout(showMenu, 1000);
        });
    });
  });
}

function exit() {
  console.log('Exiting...');
  ws.close();
  rl.close();
  process.exit(0);
}

// Handle process termination
process.on('SIGINT', exit);
process.on('SIGTERM', exit);