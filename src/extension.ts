import * as vscode from 'vscode';
import * as WebSocket from 'ws';
import * as crypto from 'crypto';

let wss: WebSocket.Server | undefined;
let clientCount = 0;
let authToken: string | undefined;

/**
 * Generates a cryptographically secure random token
 * @param length Length of the token to generate
 * @returns A secure random token string
 */
function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

export async function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('mcp-server');
  const port = config.get<number>('port') ?? 3000;
  const autoStart = config.get<boolean>('autoStart') ?? false;
  const defaultSpeed = config.get<number>('defaultTypingSpeed') ?? 50;
  
  // Authentication settings
  const authEnabled = config.get<boolean>('auth.enabled') ?? false;
  const configToken = config.get<string>('auth.token') ?? '';
  const generateRandomToken = config.get<boolean>('auth.generateRandomToken') ?? true;

  // Process authentication settings
  if (authEnabled) {
    // Use explicitly configured token or generate a random one
    if (configToken) {
      authToken = configToken;
      console.log('MCP server using configured authentication token (token value hidden)');
    } else if (generateRandomToken) {
      authToken = generateSecureToken();
      console.log('MCP server generated random authentication token (token value hidden)');
      // Show notification with secure option to copy token
      vscode.window.showInformationMessage(
        'MCP server generated authentication token',
        { modal: false },
        'Copy Token'
      ).then(selection => {
        if (selection === 'Copy Token') {
          vscode.env.clipboard.writeText(authToken || '');
          vscode.window.showInformationMessage('Authentication token copied to clipboard');
        }
      });
    } else {
      // Auth enabled but no token provided and no random generation
      authToken = undefined;
      vscode.window.showWarningMessage(
        'MCP server authentication is enabled but no token is configured. ' +
        'Server will reject all connections until a token is provided.'
      );
    }
  } else {
    // Auth not enabled
    authToken = undefined;
  }

  // Create status bar item
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.command = 'mcpServer.toggle';
  statusBar.tooltip = 'Toggle MCP WebSocket Server';
  statusBar.text = '$(debug-disconnect) MCP: Off';  // initial state: Off
  statusBar.show();
  context.subscriptions.push(statusBar);

  // Command to toggle the server
  const toggleCommand = vscode.commands.registerCommand('mcpServer.toggle', async () => {
    if (wss) {
      // Server currently running, stop it
      stopServer();
      vscode.window.showInformationMessage('MCP server stopped.');
      statusBar.text = '$(debug-disconnect) MCP: Off';
    } else {
      // Start the server
      try {
        await startServer();
        vscode.window.showInformationMessage(`MCP server running on ws://localhost:${port}`);
        // Update status bar to On (and show client count if any)
        statusBar.text = clientCount > 0 
          ? `$(debug-connect) MCP: On (${clientCount})` 
          : `$(debug-connect) MCP: On`;
      } catch (err: any) {
        console.error('Failed to start MCP server:', err);
        vscode.window.showErrorMessage(`Failed to start MCP server: ${err.message || err}`);
        stopServer(); // ensure cleanup
        statusBar.text = '$(debug-disconnect) MCP: Off';
      }
    }
  });
  context.subscriptions.push(toggleCommand);

  // Auto-start server if configured
  if (autoStart) {
    try {
      await startServer();
      statusBar.text = `$(debug-connect) MCP: On`;
      vscode.window.showInformationMessage(`MCP server auto-started on ws://localhost:${port}`);
    } catch (err: any) {
      console.error('Auto-start failed:', err);
      vscode.window.showErrorMessage(`MCP server failed to start: ${err.message || err}`);
      statusBar.text = '$(debug-disconnect) MCP: Off';
    }
  }

  // Start server helper
  async function startServer() {
    const portNum = config.get<number>('port') ?? 3000;
    const authEnabled = config.get<boolean>('auth.enabled') ?? false;
    
    // Create WebSocket server
    wss = new WebSocket.Server({ 
      port: portNum, 
      host: '127.0.0.1',
      // Add verifyClient handler if authentication is enabled
      ...(authEnabled && {
        verifyClient: (info, callback) => {
          // If auth is enabled but no token set, reject all connections
          if (authEnabled && !authToken) {
            console.log('MCP server rejecting connection: auth enabled but no token configured');
            callback(false, 401, 'Authentication token not configured on server');
            return;
          }
          
          // Check for token in URL query parameters
          const url = new URL(info.req.url || '', 'ws://localhost');
          const clientToken = url.searchParams.get('token');
          
          // Check for token in headers (some clients might use a custom header)
          const authHeader = info.req.headers['authorization'];
          const headerToken = authHeader ? authHeader.replace('Bearer ', '') : null;
          
          // Accept if token matches either from URL param or header
          const tokenMatches = (clientToken && clientToken === authToken) || 
                              (headerToken && headerToken === authToken);
          
          if (tokenMatches) {
            console.log('MCP server accepted authenticated connection (token validated)');
            callback(true);
          } else {
            console.log('MCP server rejected connection: invalid token');
            callback(false, 401, 'Invalid authentication token');
          }
        }
      })
    });
    
    clientCount = 0;
    // Handle new connections
    wss.on('connection', (socket: WebSocket.WebSocket, request) => {
      clientCount++;
      // Update status bar with new client count
      statusBar.text = `$(debug-connect) MCP: On (${clientCount})`;
      
      // Log connection details - include auth status if enabled
      if (authEnabled) {
        console.log('Authenticated client connected to MCP server. Total clients:', clientCount);
      } else {
        console.log('Client connected to MCP server. Total clients:', clientCount);
      }
      
      socket.on('close', () => {
        clientCount--;
        console.log('Client disconnected. Total clients:', clientCount);
        statusBar.text = clientCount > 0 
          ? `$(debug-connect) MCP: On (${clientCount})` 
          : `$(debug-connect) MCP: On`;
      });
      socket.on('message', async (data) => {
        try {
          const msg = JSON.parse(data.toString());
          const id = msg.id || null;
          const action = msg.action || msg.method;  // allow "method" as alias
          const params = msg.params || {};
          
          // Log incoming requests for debugging
          console.log(`MCP Request: ${action}`, JSON.stringify(params, null, 2));
          
          // Validate common requirements
          if (!action) {
            return sendError(socket, id, 'Missing required "action" or "method" field');
          }
          
          // Route the action
          if (action === 'openFile') {
            if (!params.path) {
              return sendError(socket, id, 'Missing "path" parameter');
            }
            const fileUri = vscode.Uri.file(params.path);
            try {
              const doc = await vscode.workspace.openTextDocument(fileUri);
              await vscode.window.showTextDocument(doc);
              sendResponse(socket, id, `Opened file: ${params.path}`);
            } catch (err) {
              sendError(socket, id, `Could not open file (not found or inaccessible): ${params.path}`);
            }
          }
          else if (action === 'createFile') {
            if (!params.path) {
              return sendError(socket, id, 'Missing "path" parameter');
            }
            const fileUri = vscode.Uri.file(params.path);
            // Check if file exists
            let fileExists = false;
            try {
              await vscode.workspace.fs.stat(fileUri);
              fileExists = true;
            } catch {
              fileExists = false;
            }
            if (fileExists) {
              sendError(socket, id, `File already exists: ${params.path}`);
            } else {
              const contentText = params.content || "";
              const contentBytes = Buffer.from(contentText, 'utf8');
              try {
                await vscode.workspace.fs.writeFile(fileUri, contentBytes);
                const doc = await vscode.workspace.openTextDocument(fileUri);
                await vscode.window.showTextDocument(doc);
                sendResponse(socket, id, `Created file: ${params.path}`);
              } catch (err: any) {
                sendError(socket, id, `Failed to create file: ${err.message || err}`);
              }
            }
          }
          else if (action === 'saveFile') {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
              return sendError(socket, id, 'No active editor to save');
            }
            try {
              // Save the current document
              await editor.document.save();
              sendResponse(socket, id, `Saved file: ${editor.document.fileName}`);
            } catch (err: any) {
              sendError(socket, id, `Failed to save file: ${err.message || err}`);
            }
          }
          else if (action === 'closeFile') {
            // Check if path is provided or we close current editor
            if (params.path) {
              // Close a specific file by path
              const fileUri = vscode.Uri.file(params.path);
              
              // Find all editors with this document
              const editorsToClose = vscode.window.visibleTextEditors.filter(
                editor => editor.document.uri.fsPath === fileUri.fsPath
              );
              
              if (editorsToClose.length === 0) {
                return sendError(socket, id, `File not open: ${params.path}`);
              }
              
              try {
                // Close all tabs with this document
                await vscode.window.tabGroups.close(
                  ...editorsToClose.map(editor => { return { editor }; })
                );
                sendResponse(socket, id, `Closed file: ${params.path}`);
              } catch (err: any) {
                sendError(socket, id, `Failed to close file: ${err.message || err}`);
              }
            } else {
              // Close current active editor if no path specified
              const editor = vscode.window.activeTextEditor;
              if (!editor) {
                return sendError(socket, id, 'No active editor to close');
              }
              
              const filePath = editor.document.fileName;
              try {
                await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
                sendResponse(socket, id, `Closed active file: ${filePath}`);
              } catch (err: any) {
                sendError(socket, id, `Failed to close file: ${err.message || err}`);
              }
            }
          }
          else if (action === 'getFileContent') {
            // Get content from either a specified path or the active editor
            if (params.path) {
              // Read content from the specified file path
              const fileUri = vscode.Uri.file(params.path);
              
              try {
                // Attempt to read the file content
                const fileContent = await vscode.workspace.fs.readFile(fileUri);
                // Convert Uint8Array to string
                const textContent = Buffer.from(fileContent).toString('utf-8');
                
                // Send the content back to the client
                sendResponse(socket, id, {
                  path: params.path,
                  content: textContent
                });
              } catch (err: any) {
                sendError(socket, id, `Could not read file (not found or inaccessible): ${params.path}`);
              }
            } else {
              // Get content from the active editor
              const editor = vscode.window.activeTextEditor;
              if (!editor) {
                return sendError(socket, id, 'No active editor to get content from');
              }
              
              // Get the full document text
              const content = editor.document.getText();
              const filePath = editor.document.fileName;
              
              sendResponse(socket, id, {
                path: filePath,
                content: content
              });
            }
          }
          else if (action === 'runCommand') {
            if (!params.command) {
              return sendError(socket, id, 'Missing "command" parameter');
            }
            
            try {
              // Execute the VS Code command with optional arguments
              const result = await vscode.commands.executeCommand(
                params.command, 
                ...(params.args || [])
              );
              
              // Return the result (if any)
              sendResponse(socket, id, {
                command: params.command,
                result: result !== undefined ? result : null,
                success: true
              });
            } catch (err: any) {
              // If command execution fails, send back error
              sendError(socket, id, `Command execution failed: ${err.message || err}`);
            }
          }
          else if (action === 'type') {
            if (!params.text) {
              return sendError(socket, id, 'Missing "text" to type');
            }
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
              return sendError(socket, id, 'No active editor to type into');
            }

            try {
              // Handle position/selection before typing if specified
              if (params.position || params.selection) {
                // Position cursor at specific location
                if (params.position) {
                  const position = new vscode.Position(
                    params.position.line || 0,
                    params.position.character || 0
                  );
                  
                  // Make sure position is valid
                  const docLine = Math.min(position.line, editor.document.lineCount - 1);
                  const lineLength = editor.document.lineAt(docLine).text.length;
                  const docChar = Math.min(position.character, lineLength);
                  
                  const validPosition = new vscode.Position(docLine, docChar);
                  editor.selection = new vscode.Selection(validPosition, validPosition);
                }
                
                // Create a selection range
                if (params.selection) {
                  const start = new vscode.Position(
                    params.selection.start.line || 0,
                    params.selection.start.character || 0
                  );
                  const end = new vscode.Position(
                    params.selection.end.line || 0,
                    params.selection.end.character || 0
                  );
                  
                  // Make sure positions are valid
                  const startLine = Math.min(start.line, editor.document.lineCount - 1);
                  const startLineLength = editor.document.lineAt(startLine).text.length;
                  const startChar = Math.min(start.character, startLineLength);
                  
                  const endLine = Math.min(end.line, editor.document.lineCount - 1);
                  const endLineLength = editor.document.lineAt(endLine).text.length;
                  const endChar = Math.min(end.character, endLineLength);
                  
                  const validStart = new vscode.Position(startLine, startChar);
                  const validEnd = new vscode.Position(endLine, endChar);
                  
                  editor.selection = new vscode.Selection(validStart, validEnd);
                }
              }

              // Support typing mode options
              const mode = params.mode || 'insert'; // default to insert
              
              // For replace mode, if there's a selection, delete it first
              if (mode === 'replace' && !editor.selection.isEmpty) {
                await editor.edit(editBuilder => {
                  editBuilder.delete(editor.selection);
                });
              }
              
              // Determine typing speed and variation
              let speed = params.speed != null ? params.speed : defaultSpeed;
              const variation = params.variation || 0;
              if (params.duration != null) {
                // If total duration is given, override speed to distribute over text length
                const totalMs = params.duration;
                speed = totalMs / Math.max(params.text.length, 1);
              }
              
              // Quick mode - insert all text at once without typing animation
              if (params.quick === true) {
                if (mode === 'append') {
                  // Move to end of file first
                  const lastLine = editor.document.lineCount - 1;
                  const lastChar = editor.document.lineAt(lastLine).text.length;
                  const endPos = new vscode.Position(lastLine, lastChar);
                  editor.selection = new vscode.Selection(endPos, endPos);
                }
                
                // Insert all text at once
                await editor.edit(editBuilder => {
                  editBuilder.insert(editor.selection.active, params.text);
                });
                
                sendResponse(socket, id, `Inserted ${params.text.length} characters (quick mode)`);
                return;
              }
              
              // Handle special typing modes
              if (mode === 'append') {
                // Move to end of file first
                const lastLine = editor.document.lineCount - 1;
                const lastChar = editor.document.lineAt(lastLine).text.length;
                const endPos = new vscode.Position(lastLine, lastChar);
                editor.selection = new vscode.Selection(endPos, endPos);
              }
              
              // Character-by-character typing with animation
              for (const ch of params.text) {
                // delay before typing each char
                const effectiveDelay = variation ? 
                  speed * (1 + (Math.random()*2 - 1) * variation) : 
                  speed;
                await new Promise(res => setTimeout(res, effectiveDelay));
                // type the character
                await vscode.commands.executeCommand('default:type', { text: ch });
              }
              
              // If requested, move cursor to specific position after typing
              if (params.afterCursor) {
                const afterPos = new vscode.Position(
                  params.afterCursor.line || 0,
                  params.afterCursor.character || 0
                );
                editor.selection = new vscode.Selection(afterPos, afterPos);
              }
              
              sendResponse(socket, id, `Typed ${params.text.length} characters`);
            } catch (err: any) {
              sendError(socket, id, `Typing failed: ${err.message || err}`);
            }
          }
          else {
            // Unknown action
            sendError(socket, id, `Unknown action: ${action}`);
          }
        } catch (e) {
          console.error('Failed to handle message', e);
          // If parsing fails or other error outside above, we cannot get an id to respond
          if (e instanceof SyntaxError) {
            // send a generic error if JSON was invalid
            try { socket.send(JSON.stringify({ error: "Invalid JSON message" })); } catch {}
          }
        }
      });
    });
    // Once server is listening, set initial client count to 0 (no clients yet)
    console.log(`MCP WebSocket server listening on port ${portNum}`);
  }

  function stopServer() {
    if (wss) {
      wss.close();
      wss = undefined;
      clientCount = 0;
    }
  }

  function sendResponse(socket: WebSocket.WebSocket, id: any, result: any) {
    if (id == null) return; // if no id provided, it's a notification, no response
    const resp = { id, result };
    try {
      // Log outgoing responses for debugging
      console.log('MCP Response:', JSON.stringify(resp, null, 2));
      socket.send(JSON.stringify(resp));
    } catch (e) {
      console.warn('Failed to send response', e);
    }
  }

  function sendError(socket: WebSocket.WebSocket, id: any, errorMsg: string) {
    const resp = { id, error: errorMsg };
    try {
      // Log outgoing errors for debugging
      console.log('MCP Error:', JSON.stringify(resp, null, 2));
      socket.send(JSON.stringify(resp));
    } catch (e) {
      console.warn('Failed to send error response', e);
    }
  }
  
  // Global error handler to catch and log unhandled errors
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled promise rejection in MCP server:', reason);
  });
  
  // Handle VS Code extension errors
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    // Safe access to editor properties to avoid null reference errors
    if (editor) {
      try {
        console.log(`MCP: Active editor changed to ${editor.document.fileName}`);
      } catch (err) {
        console.warn('MCP: Error accessing editor properties', err);
      }
    }
  });
}

export function deactivate() {
  if (wss) {
    wss.close();
    wss = undefined;
  }
}