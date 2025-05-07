#!/usr/bin/env python3
"""
Example Python client for the VS Code MCP WebSocket Extension

This demonstrates how to connect to the WebSocket server and send commands
to control VS Code programmatically from Python.

Requirements:
    pip install websockets
"""

import asyncio
import json
import sys
import time
import websockets
import argparse

# Default configuration
DEFAULT_PORT = 3000
DEFAULT_HOST = "localhost"

# Command-line arguments
parser = argparse.ArgumentParser(description="VS Code MCP Client")
parser.add_argument("--host", default=DEFAULT_HOST, help=f"Host to connect to (default: {DEFAULT_HOST})")
parser.add_argument("--port", type=int, default=DEFAULT_PORT, help=f"Port to connect to (default: {DEFAULT_PORT})")
args = parser.parse_args()

# Websocket URL
WS_URL = f"ws://{args.host}:{args.port}"

# Map to track pending requests
pending_requests = {}

# Next request ID
next_id = 1

class VSCodeMCPClient:
    def __init__(self, url):
        self.url = url
        self.websocket = None
    
    async def connect(self):
        """Connect to the VS Code MCP Server"""
        try:
            self.websocket = await websockets.connect(self.url)
            print(f"Connected to VS Code MCP Server at {self.url}")
            return True
        except Exception as e:
            print(f"Failed to connect: {e}")
            return False
    
    async def close(self):
        """Close the WebSocket connection"""
        if self.websocket:
            await self.websocket.close()
            print("Disconnected from VS Code MCP Server")
    
    async def send_command(self, action, params=None, description=None):
        """Send a command to the VS Code MCP server"""
        global next_id
        
        if params is None:
            params = {}
        
        if description is None:
            description = action
        
        command_id = next_id
        next_id += 1
        
        command = {
            "id": command_id,
            "action": action,
            "params": params
        }
        
        print(f"Sending {action} command: {json.dumps(params)}")
        
        # Create a future to wait for the response
        future = asyncio.Future()
        pending_requests[command_id] = {
            "future": future,
            "description": description
        }
        
        # Send the command
        await self.websocket.send(json.dumps(command))
        
        # Wait for the response
        try:
            response = await asyncio.wait_for(future, timeout=10)
            return response
        except asyncio.TimeoutError:
            print("Timeout waiting for response")
            del pending_requests[command_id]
            return None
    
    async def receive_messages(self):
        """Listen for messages from the server"""
        while True:
            try:
                message = await self.websocket.recv()
                await self.handle_message(message)
            except websockets.exceptions.ConnectionClosed:
                print("Connection closed")
                break
            except Exception as e:
                print(f"Error receiving message: {e}")
                break
    
    async def handle_message(self, message):
        """Handle incoming messages from the server"""
        try:
            response = json.loads(message)
            
            if "id" in response and response["id"] in pending_requests:
                request = pending_requests[response["id"]]
                description = request["description"]
                future = request["future"]
                
                del pending_requests[response["id"]]
                
                if "error" in response:
                    print(f"❌ Error: {response['error']}")
                    future.set_exception(Exception(response["error"]))
                else:
                    print(f"✅ Success: {description}")
                    if isinstance(response.get("result"), dict):
                        print(json.dumps(response["result"], indent=2))
                    elif response.get("result") is not None:
                        print(response["result"])
                    future.set_result(response.get("result"))
        except json.JSONDecodeError:
            print(f"Failed to parse message: {message}")
        except Exception as e:
            print(f"Error handling message: {e}")


async def show_menu(client):
    """Display the main menu"""
    while True:
        print("\n🔧 VS Code MCP Client - Available Commands:")
        print("1. Open a file")
        print("2. Create a new file")
        print("3. Get file content")
        print("4. Save current file")
        print("5. Close file")
        print("6. Type text at cursor")
        print("7. Type text at specific position")
        print("8. Run VS Code command")
        print("9. Exit")
        
        choice = input("\nEnter command number: ")
        
        try:
            if choice == "1":
                await open_file(client)
            elif choice == "2":
                await create_file(client)
            elif choice == "3":
                await get_file_content(client)
            elif choice == "4":
                await save_file(client)
            elif choice == "5":
                await close_file(client)
            elif choice == "6":
                await type_text(client)
            elif choice == "7":
                await type_text_at_position(client)
            elif choice == "8":
                await run_command(client)
            elif choice == "9":
                print("Exiting...")
                await client.close()
                sys.exit(0)
            else:
                print("Invalid option")
        except Exception as e:
            print(f"Error executing command: {e}")


async def open_file(client):
    """Command to open a file"""
    path = input("Enter file path to open: ")
    await client.send_command("openFile", {"path": path}, f"Open file: {path}")


async def create_file(client):
    """Command to create a new file"""
    path = input("Enter file path to create: ")
    content = input("Enter initial content (or press Enter for empty file): ")
    await client.send_command("createFile", {"path": path, "content": content}, f"Create file: {path}")


async def get_file_content(client):
    """Command to get file content"""
    path = input("Enter file path (or press Enter for active file): ")
    params = {"path": path} if path else {}
    await client.send_command("getFileContent", params, f"Get content of {path or 'active file'}")


async def save_file(client):
    """Command to save the current file"""
    await client.send_command("saveFile", {}, "Save current file")


async def close_file(client):
    """Command to close a file"""
    path = input("Enter file path (or press Enter for active file): ")
    params = {"path": path} if path else {}
    await client.send_command("closeFile", params, f"Close {path or 'active file'}")


async def type_text(client):
    """Command to type text at cursor position"""
    text = input("Enter text to type: ")
    
    try:
        speed = input("Typing speed (ms per char, default: 50): ")
        speed = int(speed) if speed else 50
        
        variation = input("Variation (0-1, default: 0.2): ")
        variation = float(variation) if variation else 0.2
        
        await client.send_command("type", {
            "text": text,
            "speed": speed,
            "variation": variation
        }, "Type text")
    except ValueError:
        print("Invalid input. Using default values.")
        await client.send_command("type", {"text": text}, "Type text")


async def type_text_at_position(client):
    """Command to type text at a specific position"""
    text = input("Enter text to type: ")
    
    try:
        line = int(input("Line number: "))
        character = int(input("Character position: "))
        
        await client.send_command("type", {
            "text": text,
            "position": {"line": line, "character": character},
            "quick": True  # Don't animate for this example
        }, f"Type text at position {line}:{character}")
    except ValueError:
        print("Invalid input. Line and character must be numbers.")


async def run_command(client):
    """Command to run a VS Code command"""
    command = input("Enter VS Code command to run: ")
    args_str = input("Enter arguments as JSON (or press Enter for none): ")
    
    params = {"command": command}
    
    if args_str:
        try:
            args = json.loads(args_str)
            params["args"] = args
        except json.JSONDecodeError:
            print("Invalid JSON arguments. Using command without arguments.")
    
    await client.send_command("runCommand", params, f"Run command: {command}")


async def main():
    """Main entry point"""
    print(f"Connecting to VS Code MCP Server at {WS_URL}...")
    
    client = VSCodeMCPClient(WS_URL)
    if not await client.connect():
        return
    
    # Start listening for messages in the background
    asyncio.create_task(client.receive_messages())
    
    # Show the menu and handle user input
    await show_menu(client)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nExiting...")
    except Exception as e:
        print(f"Error: {e}")