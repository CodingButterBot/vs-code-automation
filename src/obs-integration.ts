import * as vscode from 'vscode';
import * as WebSocket from 'ws';

// OBS WebSocket connection
let obsWebSocket: WebSocket | undefined;
let obsConnected = false;

/**
 * Connects to OBS WebSocket server
 * @param socket The client WebSocket connection to send responses back to
 * @param id The message ID to use in response
 * @param params Connection parameters
 */
export async function connectToOBS(
  socket: WebSocket.WebSocket, 
  id: any, 
  params: { 
    host?: string; 
    port?: number;
    password?: string;
  }
) {
  const host = params.host || 'localhost';
  const port = params.port || 4455;
  const password = params.password || '';
  
  // Already connected? Return current status
  if (obsConnected && obsWebSocket) {
    return sendResponse(socket, id, { connected: true, host, port });
  }
  
  // Close any existing connection
  if (obsWebSocket) {
    obsWebSocket.close();
    obsWebSocket = undefined;
    obsConnected = false;
  }
  
  try {
    // Connect to OBS WebSocket
    obsWebSocket = new WebSocket(`ws://${host}:${port}`);
    
    obsWebSocket.onopen = () => {
      console.log('Connected to OBS WebSocket');
      
      // If password provided, handle authentication
      if (password) {
        // Send authenticate message (v5 protocol)
        const authMessage = {
          op: 1, // Identify operation in OBS WebSocket v5
          d: {
            rpcVersion: 1,
            authentication: password,
            eventSubscriptions: 31 // Subscribe to all events (default)
          }
        };
        
        obsWebSocket?.send(JSON.stringify(authMessage));
      }
      
      obsConnected = true;
      sendResponse(socket, id, { connected: true, host, port });
    };
    
    obsWebSocket.onclose = () => {
      console.log('Disconnected from OBS WebSocket');
      obsConnected = false;
      obsWebSocket = undefined;
    };
    
    obsWebSocket.onerror = (error) => {
      console.error('OBS WebSocket connection error:', error);
      obsConnected = false;
      sendError(socket, id, `OBS WebSocket connection error: ${error.message || 'Unknown error'}`);
    };
    
    obsWebSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data.toString());
        console.log('OBS WebSocket message:', message);
        
        // Handle authentication response
        if (message.op === 2) { // Hello message from OBS
          if (message.d?.authentication) {
            // Authentication required, send auth if we have password
            if (password) {
              const authMessage = {
                op: 1, // Identify operation
                d: {
                  rpcVersion: 1,
                  authentication: password,
                  eventSubscriptions: 31 // All events
                }
              };
              obsWebSocket?.send(JSON.stringify(authMessage));
            } else {
              // No password but auth required
              sendError(socket, id, 'OBS WebSocket requires authentication but no password provided');
              obsWebSocket?.close();
              obsConnected = false;
              obsWebSocket = undefined;
            }
          }
        }
        
        // Handle events and update if needed
        // Event handling would go here
        
      } catch (err) {
        console.error('Error parsing OBS WebSocket message:', err);
      }
    };
    
    // Set timeout for connection
    setTimeout(() => {
      if (!obsConnected && obsWebSocket) {
        obsWebSocket.close();
        obsWebSocket = undefined;
        sendError(socket, id, 'Connection to OBS WebSocket timed out');
      }
    }, 10000);
  } catch (err: any) {
    sendError(socket, id, `Failed to connect to OBS: ${err.message || err}`);
  }
}

/**
 * Disconnects from OBS WebSocket
 */
export function disconnectFromOBS(socket: WebSocket.WebSocket, id: any) {
  if (obsWebSocket) {
    obsWebSocket.close();
    obsWebSocket = undefined;
    obsConnected = false;
    
    sendResponse(socket, id, { disconnected: true });
  } else {
    sendResponse(socket, id, { disconnected: true, message: 'Not connected' });
  }
}

/**
 * Send command to OBS
 * @param command OBS WebSocket command name
 * @param args Command arguments
 * @returns Promise with command response
 */
export async function sendOBSCommand(
  socket: WebSocket.WebSocket,
  id: any,
  params: {
    command: string;
    args?: any;
  }
) {
  if (!obsConnected || !obsWebSocket) {
    return sendError(socket, id, 'Not connected to OBS WebSocket');
  }
  
  try {
    const { command, args = {} } = params;
    
    // Create request message (v5 protocol)
    const requestId = Math.random().toString(36).substring(2, 9);
    const message = {
      op: 6, // Request operation
      d: {
        requestType: command,
        requestId: requestId,
        requestData: args
      }
    };
    
    // Create promise to wait for response
    const responsePromise = new Promise<any>((resolve, reject) => {
      // Set timeout for response
      const timeout = setTimeout(() => {
        reject(new Error(`OBS command timed out: ${command}`));
      }, 5000);
      
      // Set one-time handler for this specific response
      const messageHandler = (event: WebSocket.MessageEvent) => {
        try {
          const response = JSON.parse(event.data.toString());
          
          // Check if this is the response for our request
          if (response.op === 7 && response.d?.requestId === requestId) {
            // Remove listener and clear timeout
            obsWebSocket?.removeEventListener('message', messageHandler);
            clearTimeout(timeout);
            
            // Check for errors
            if (response.d.requestStatus?.result === false) {
              reject(new Error(response.d.requestStatus.comment || 'Command failed'));
            } else {
              resolve(response.d.responseData || { success: true });
            }
          }
        } catch (err) {
          // Just ignore messages we can't parse or aren't for us
        }
      };
      
      // Add temporary listener for this response
      obsWebSocket?.addEventListener('message', messageHandler);
    });
    
    // Send the request
    obsWebSocket.send(JSON.stringify(message));
    
    // Wait for response
    const result = await responsePromise;
    sendResponse(socket, id, result);
  } catch (err: any) {
    sendError(socket, id, `OBS command failed: ${err.message || err}`);
  }
}

/**
 * Get OBS connection status
 */
export function getOBSStatus(socket: WebSocket.WebSocket, id: any) {
  sendResponse(socket, id, { connected: obsConnected });
}

/**
 * Toggle streaming in OBS
 */
export async function toggleStreaming(socket: WebSocket.WebSocket, id: any) {
  if (!obsConnected || !obsWebSocket) {
    return sendError(socket, id, 'Not connected to OBS WebSocket');
  }
  
  try {
    await sendOBSCommand(socket, id, { command: 'StartStopStreaming' });
  } catch (err: any) {
    sendError(socket, id, `Failed to toggle streaming: ${err.message || err}`);
  }
}

/**
 * Helper to send response to client
 */
function sendResponse(socket: WebSocket.WebSocket, id: any, result: any) {
  if (id == null) return; // if no id provided, it's a notification, no response
  const resp = { id, result };
  try {
    // Log outgoing responses for debugging
    console.log('OBS Integration Response:', JSON.stringify(resp, null, 2));
    socket.send(JSON.stringify(resp));
  } catch (e) {
    console.warn('Failed to send response', e);
  }
}

/**
 * Helper to send error to client
 */
function sendError(socket: WebSocket.WebSocket, id: any, errorMsg: string) {
  const resp = { id, error: errorMsg };
  try {
    // Log outgoing errors for debugging
    console.log('OBS Integration Error:', JSON.stringify(resp, null, 2));
    socket.send(JSON.stringify(resp));
  } catch (e) {
    console.warn('Failed to send error response', e);
  }
}