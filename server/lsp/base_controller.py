import asyncio
import json
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from terminal.docker_manager import DockerManager
from terminal.terminal_config import TerminalConfig


class BaseLSPController(ABC):
    def __init__(self, user_id: str, language: str):
        self.user_id = user_id
        self.language = language
        self.config = TerminalConfig()
        self.docker = DockerManager.get_or_create(user_id, self.config)
        self.open_documents = {}  # Track open documents and their versions
        self.document_versions = {}  # Track version numbers
        self.process = None
        self.request_id = 0

    @abstractmethod
    async def install_lsp_server(self) -> bool:
        """Install the LSP server in the container"""
        pass

    @abstractmethod
    def get_lsp_command(self) -> List[str]:
        """Get the command to start the LSP server"""
        pass

    @abstractmethod
    def get_initialization_options(self) -> Dict[str, Any]:
        """Get LSP initialization options specific to the language"""
        pass

    async def start(self) -> bool:
        """Start the LSP server"""
        try:
            # Ensure container is running with proper synchronization
            await self.docker.ensure_container_running()

            # Install LSP server if needed
            if not await self.install_lsp_server():
                return False

            # Start LSP process
            cmd = self.get_lsp_command()

            self.process = await asyncio.create_subprocess_exec(
                "docker",
                "exec",
                "-i",
                self.docker.container_id,
                *cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            # Initialize LSP
            await self._initialize()
            return True

        except Exception as e:
            print(f"Failed to start LSP server: {e}")
            return False

    async def _initialize(self):
        # [TO-DO]: Confirm if this is still available after implementing vscode-api, i think this is already done by default on the protocol
        """Send LSP initialize request"""
        # In your _initialize method
        init_request = {
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": "initialize",
            "params": {
                "processId": self.process.pid,
                "rootUri": f"file:///home/termuser/root",
                "capabilities": {
                    "textDocument": {
                        "completion": {
                            "completionItem": {
                                "snippetSupport": True,
                                "documentationFormat": ["markdown", "plaintext"],
                                "resolveSupport": {
                                    "properties": [
                                        "detail",
                                        "documentation",
                                        "additionalTextEdits",
                                    ]
                                },
                                "insertTextModeSupport": {"valueSet": [1, 2]},
                                "labelDetailsSupport": True,
                            },
                            "completionItemKind": {
                                "valueSet": list(
                                    range(1, 26)
                                )  # Support all completion kinds
                            },
                        }
                    }
                },
                "initializationOptions": self.get_initialization_options(),
            },
        }

        await self._send_request(init_request)
        await self._read_response()

        # Send initialized notification
        initialized = {"jsonrpc": "2.0", "method": "initialized", "params": {}}
        await self._send_request(initialized)

    async def _send_request(self, request: Dict[str, Any]):
        """Send LSP request"""
        if not self.process or not self.process.stdin:
            raise Exception("LSP process not available")

        content = json.dumps(request)
        message = f"Content-Length: {len(content)}\r\n\r\n{content}"

        self.process.stdin.write(message.encode())
        await self.process.stdin.drain()

    async def _read_response(self) -> Optional[Dict[str, Any]]:
        """Read LSP response"""
        if not self.process or not self.process.stdout:
            return None

        # Read headers
        headers = {}
        while True:
            line = await self.process.stdout.readline()
            line = line.decode().strip()

            if not line:
                break

            if ":" in line:
                key, value = line.split(":", 1)
                headers[key.strip()] = value.strip()

        # Read content
        content_length = int(headers.get("Content-Length", 0))
        if content_length == 0:
            return None

        content = await self.process.stdout.read(content_length)

        return json.loads(content.decode())

    def _next_id(self) -> int:
        """Get next request ID"""
        self.request_id += 1
        return self.request_id

    async def _did_open(self, file_path: str, text: str):
        """Send textDocument/didOpen notification"""
        request = {
            "jsonrpc": "2.0",
            "method": "textDocument/didOpen",
            "params": {
                "textDocument": {
                    "uri": f"file://{file_path}",
                    "languageId": self.language,
                    "version": 1,
                    "text": text,
                }
            },
        }
        await self._send_request(request)

    async def close(self):
        """Close LSP server"""
        if self.process:
            # Send shutdown request
            shutdown = {
                "jsonrpc": "2.0",
                "id": self._next_id(),
                "method": "shutdown",
                "params": None,
            }

            try:
                await self._send_request(shutdown)
                await self._read_response()

                # Send exit notification
                exit_notif = {"jsonrpc": "2.0", "method": "exit", "params": None}
                await self._send_request(exit_notif)

                # Terminate process
                self.process.terminate()
                await self.process.wait()

            except Exception as e:
                print(f"Error closing LSP: {e}")

            self.process = None
