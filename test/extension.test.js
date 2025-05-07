const assert = require('assert');
const WebSocket = require('ws');
const vscode = require('vscode');

// Mock for testing
const mockVSCode = {
  window: {
    activeTextEditor: {
      document: {
        save: () => Promise.resolve(),
        fileName: '/test/file.js',
        getText: () => 'Test content'
      },
      selection: {
        active: { line: 0, character: 0 },
        isEmpty: true
      }
    },
    showTextDocument: () => Promise.resolve(mockVSCode.window.activeTextEditor)
  },
  workspace: {
    openTextDocument: () => Promise.resolve({
      getText: () => 'Test content',
      fileName: '/test/file.js'
    }),
    fs: {
      stat: () => Promise.resolve(),
      readFile: () => Promise.resolve(Buffer.from('Test content')),
      writeFile: () => Promise.resolve()
    }
  },
  Uri: {
    file: (path) => ({ fsPath: path, scheme: 'file' })
  },
  Position: class {
    constructor(line, character) {
      this.line = line;
      this.character = character;
    }
  },
  Selection: class {
    constructor(anchor, active) {
      this.anchor = anchor;
      this.active = active;
      this.isEmpty = anchor.line === active.line && anchor.character === active.character;
    }
  },
  commands: {
    executeCommand: () => Promise.resolve()
  }
};

/**
 * Basic test suite for the VS Code MCP WebSocket Extension
 */
describe('VS Code MCP WebSocket Extension', function() {
  let ws;
  let responsePromise;
  
  // Setup WebSocket connection before tests
  before(async function() {
    this.timeout(10000); // Allow time for extension to activate
    
    // Ensure extension is activated
    await vscode.extensions.getExtension('your-publisher.vscode-mcp-websocket').activate();
    
    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Connect to server
    ws = new WebSocket('ws://localhost:3000');
    
    // Setup promise factory for responses
    function createResponsePromise() {
      return new Promise((resolve) => {
        ws.once('message', (data) => {
          const response = JSON.parse(data.toString());
          resolve(response);
        });
      });
    }
    
    // Wait for connection
    await new Promise((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
    });
    
    // Setup response promise
    responsePromise = createResponsePromise;
  });
  
  // Close connection after tests
  after(function() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });
  
  describe('File Operations', function() {
    it('should open a file', async function() {
      const promise = responsePromise();
      
      // Send openFile command
      ws.send(JSON.stringify({
        id: 1,
        action: 'openFile',
        params: {
          path: '/test/file.js'
        }
      }));
      
      const response = await promise;
      assert.strictEqual(response.id, 1);
      assert.ok(response.result);
      assert.ok(response.result.includes('Opened file'));
    });
    
    it('should create a file', async function() {
      const promise = responsePromise();
      
      // Send createFile command
      ws.send(JSON.stringify({
        id: 2,
        action: 'createFile',
        params: {
          path: '/test/newfile.js',
          content: 'console.log("Hello world");'
        }
      }));
      
      const response = await promise;
      assert.strictEqual(response.id, 2);
      assert.ok(response.result);
      assert.ok(response.result.includes('Created file'));
    });
    
    it('should save a file', async function() {
      const promise = responsePromise();
      
      // Send saveFile command
      ws.send(JSON.stringify({
        id: 3,
        action: 'saveFile',
        params: {}
      }));
      
      const response = await promise;
      assert.strictEqual(response.id, 3);
      assert.ok(response.result);
      assert.ok(response.result.includes('Saved file'));
    });
    
    it('should get file content', async function() {
      const promise = responsePromise();
      
      // Send getFileContent command
      ws.send(JSON.stringify({
        id: 4,
        action: 'getFileContent',
        params: {
          path: '/test/file.js'
        }
      }));
      
      const response = await promise;
      assert.strictEqual(response.id, 4);
      assert.ok(response.result);
      assert.strictEqual(response.result.path, '/test/file.js');
      assert.strictEqual(response.result.content, 'Test content');
    });
    
    it('should close a file', async function() {
      const promise = responsePromise();
      
      // Send closeFile command
      ws.send(JSON.stringify({
        id: 5,
        action: 'closeFile',
        params: {
          path: '/test/file.js'
        }
      }));
      
      const response = await promise;
      assert.strictEqual(response.id, 5);
      assert.ok(response.result);
      assert.ok(response.result.includes('Closed file'));
    });
  });
  
  describe('Typing Operations', function() {
    it('should type text', async function() {
      const promise = responsePromise();
      
      // Send type command
      ws.send(JSON.stringify({
        id: 6,
        action: 'type',
        params: {
          text: 'Hello, world!',
          speed: 10, // Fast for testing
          quick: true // Don't animate, just insert
        }
      }));
      
      const response = await promise;
      assert.strictEqual(response.id, 6);
      assert.ok(response.result);
      assert.ok(response.result.includes('characters'));
    });
    
    it('should type with cursor positioning', async function() {
      const promise = responsePromise();
      
      // Send type command with position
      ws.send(JSON.stringify({
        id: 7,
        action: 'type',
        params: {
          text: 'Positioned text',
          position: {
            line: 5,
            character: 10
          },
          quick: true
        }
      }));
      
      const response = await promise;
      assert.strictEqual(response.id, 7);
      assert.ok(response.result);
      assert.ok(response.result.includes('characters'));
    });
    
    it('should type in replace mode', async function() {
      const promise = responsePromise();
      
      // Send type command with selection and replace mode
      ws.send(JSON.stringify({
        id: 8,
        action: 'type',
        params: {
          text: 'Replacement text',
          selection: {
            start: { line: 1, character: 0 },
            end: { line: 2, character: 10 }
          },
          mode: 'replace',
          quick: true
        }
      }));
      
      const response = await promise;
      assert.strictEqual(response.id, 8);
      assert.ok(response.result);
      assert.ok(response.result.includes('characters'));
    });
  });
  
  describe('Command Execution', function() {
    it('should execute VS Code commands', async function() {
      const promise = responsePromise();
      
      // Send runCommand command
      ws.send(JSON.stringify({
        id: 9,
        action: 'runCommand',
        params: {
          command: 'editor.action.formatDocument'
        }
      }));
      
      const response = await promise;
      assert.strictEqual(response.id, 9);
      assert.ok(response.result);
      assert.strictEqual(response.result.command, 'editor.action.formatDocument');
      assert.strictEqual(response.result.success, true);
    });
    
    it('should execute commands with arguments', async function() {
      const promise = responsePromise();
      
      // Send runCommand command with args
      ws.send(JSON.stringify({
        id: 10,
        action: 'runCommand',
        params: {
          command: 'editor.action.insertSnippet',
          args: [{ snippet: 'console.log($1);' }]
        }
      }));
      
      const response = await promise;
      assert.strictEqual(response.id, 10);
      assert.ok(response.result);
      assert.strictEqual(response.result.command, 'editor.action.insertSnippet');
      assert.strictEqual(response.result.success, true);
    });
  });
  
  describe('Error Handling', function() {
    it('should handle invalid commands', async function() {
      const promise = responsePromise();
      
      // Send invalid command
      ws.send(JSON.stringify({
        id: 11,
        action: 'invalidCommand',
        params: {}
      }));
      
      const response = await promise;
      assert.strictEqual(response.id, 11);
      assert.ok(response.error);
      assert.ok(response.error.includes('Unknown action'));
    });
    
    it('should handle missing parameters', async function() {
      const promise = responsePromise();
      
      // Send openFile without path
      ws.send(JSON.stringify({
        id: 12,
        action: 'openFile',
        params: {}
      }));
      
      const response = await promise;
      assert.strictEqual(response.id, 12);
      assert.ok(response.error);
      assert.ok(response.error.includes('Missing "path" parameter'));
    });
    
    it('should handle invalid JSON', async function() {
      const promise = responsePromise();
      
      // Send invalid JSON
      ws.send('This is not valid JSON{');
      
      const response = await promise;
      assert.ok(response.error);
      assert.ok(response.error.includes('Invalid JSON'));
    });
  });
});