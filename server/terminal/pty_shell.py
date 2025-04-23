from typing import Dict, Optional
from terminal.docker_manager import DockerManager
from terminal.pty_controller import PtyController
from terminal.file_manager import FileManager
from terminal.terminal_config import TerminalConfig


class PtyShell:
    def __init__(
        self,
        user_id: str,
        dockerfile_path: Optional[str] = None,
        container_name: Optional[str] = None,
    ):
        """Initialize a new PTY shell session with Docker container."""
        self.user_id = user_id

        # Initialize configuration
        self.config = TerminalConfig()
        if dockerfile_path:
            self.config.DEFAULT_DOCKERFILE_PATH = dockerfile_path
        if container_name:
            self.config.DEFAULT_CONTAINER_NAME = container_name

        # Initialize components
        self.docker = DockerManager(user_id, self.config)
        self.pty = PtyController(self.config)
        self.file_manager = None  # Will be initialized after container starts

        self.last_output = ""

    async def start(self) -> None:
        """Start the PTY shell session in a Docker container."""
        # Build the Docker image
        await self.docker.build_image()

        # Start the container
        container_id = await self.docker.start_container()

        # Initialize the file manager now that we have a container
        self.file_manager = FileManager(self.docker)

        # Create and configure the PTY
        await self.pty.create_pty(container_id)
        await self.pty.configure_terminal()

        # Read initial output
        self.last_output = await self.pty.read_until_prompt()

    async def write_to_file(self, code_content: str) -> Dict[str, str]:
        """Write content to a file in the container."""
        return await self.file_manager.write_file(code_content)

    async def read_from_file(self, file_path: str = "/home/termuser/main.py") -> str:
        """Read content from a file in the container."""
        return await self.file_manager.read_file(file_path)

    async def execute(self, command: str) -> Dict[str, str]:
        """Execute a command in the shell."""
        await self.pty.write(command + "\n")
        output = await self.pty.read_until_prompt()

        # Extract and remove prompt and echoed command
        lines = output.splitlines()

        # Parse prompt info
        prompt_info = self.pty.parse_prompt_info(output)

        print(prompt_info)

        # Remove the prompt lines from output
        lines = [
            line
            for line in lines
            if self.config.PROMPT_PREFIX not in line
            and self.config.PROMPT_SUFFIX not in line
        ]

        # Remove echoed command
        if lines and lines[0].strip() == command.strip():
            lines = lines[1:]

        cleaned_output = "\n".join(lines).strip()

        return {
            "output": cleaned_output,
            "cwd": prompt_info.get("cwd", ""),
            "user": prompt_info.get("user", ""),
            "host": prompt_info.get("host", ""),
        }

    async def resize(self, rows: int, cols: int) -> None:
        """Resize the terminal."""
        await self.pty.resize(rows, cols)

    def is_alive(self) -> bool:
        """Check if the shell is still alive."""
        return self.pty.is_process_alive() and self.docker.is_container_running()

    async def close(self) -> None:
        """Close the PTY shell session and clean up Docker resources."""
        # Close the PTY
        self.pty.close()

        # Stop and remove the Docker container
        await self.docker.stop_container()
