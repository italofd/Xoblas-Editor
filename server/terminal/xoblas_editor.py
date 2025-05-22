from typing import Dict, Optional, AsyncGenerator
from terminal.docker_manager import DockerManager
from terminal.pty_controller import PtyController
from terminal.file_manager import FileManager
from terminal.terminal_config import TerminalConfig
import json


import re


class XoblasEditor:
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

        # NOT BEING USED
        self.last_output = ""

    async def start(self) -> None:
        """Start the PTY shell session in a Docker container."""
        # Build the Docker image
        await self.docker.build_image()

        # Start the container
        container_id = await self.docker.start_container()

        # Clean vim file listeners (lockers)
        await self.docker.cleanup_vim_locks()

        # Initialize the file manager now that we have a container
        self.file_manager = FileManager(self.docker)

        # Create and configure the PTY
        await self.pty.create_pty(container_id)
        await self.pty.configure_terminal()

        # Read initial output
        self.last_output = await self.pty.read_until_prompt()

    async def execute(self, command: str) -> Dict[str, str]:
        """Execute a command in the shell"""

        await self.pty.write(
            command if self.pty.in_alternate_screen else command + "\n"
        )

        if self.pty.in_alternate_screen:
            output = await self.pty.read_immediate_output()

            # We can return here and skip a ot of unnecessary calc we are doing
            # In that way making the raw input take longer to process without a real need
        else:
            output = await self.pty.read_until_prompt_or_partial()

        # Parse prompt info
        prompt_info = self.pty.parse_prompt_info(output)

        # Find the prompt inside the output (even if glued)
        prompt_pattern = (
            re.escape(self.config.PROMPT_PREFIX)
            + r".+?"
            + re.escape(self.config.PROMPT_SUFFIX)
        )
        match = re.search(prompt_pattern, output)

        if match:
            prompt_start = match.start()
            output_before_prompt = output[:prompt_start]
        else:
            # Fallback, no prompt found
            output_before_prompt = output

        # Remove echoed command
        if output_before_prompt.strip().startswith(command.strip()):
            output_before_prompt = output_before_prompt.strip()[
                len(command.strip()) :
            ].lstrip()

        cleaned_output = output_before_prompt.strip()

        cwd = prompt_info.get("cwd", "")

        self.config.CURRENT_WORKDIR = cwd

        # Grab the value before check alternate screen
        previously_in_raw = self.pty.in_alternate_screen

        is_raw_mode = self.pty.check_alternate_screen(cleaned_output)

        is_exiting_raw = previously_in_raw and not is_raw_mode

        return {
            "type": "command",
            "output": output if self.pty.in_alternate_screen else cleaned_output,
            "cwd": cwd,
            "user": prompt_info.get("user", ""),
            "host": prompt_info.get("host", ""),
            "raw_mode": is_raw_mode,
            "is_exiting_raw": is_exiting_raw,
        }

    async def execute_streaming(
        self, command: str
    ) -> AsyncGenerator[Dict[str, str], None]:
        """Execute a command and stream output chunks as they arrive."""
        await self.pty.write(
            command if self.pty.in_alternate_screen else command + "\n"
        )

        if self.pty.in_alternate_screen:
            output = await self.pty.read_immediate_output()
            yield self._build_result(
                output, "", "", "", self.pty.in_alternate_screen, False, False
            )
            return

        complete_output = ""

        async for chunk in self.pty.read_continuous_until_prompt():
            complete_output += chunk

            # Filter out prompt patterns and command echo from this chunk
            filtered_chunk = self._filter_chunk(chunk, command)

            # Send filtered chunk immediately if it has content
            if filtered_chunk.strip():
                yield self._build_result(
                    filtered_chunk, "", "", "", False, False, False
                )

        # Final message with prompt info after command completes
        prompt_info = self.pty.parse_prompt_info(complete_output)
        cwd = prompt_info.get("cwd", "")
        self.config.CURRENT_WORKDIR = cwd

        previously_in_raw = self.pty.in_alternate_screen
        is_raw_mode = self.pty.check_alternate_screen(complete_output)
        is_exiting_raw = previously_in_raw and not is_raw_mode

        yield self._build_result(
            "",
            cwd,
            prompt_info.get("user", ""),
            prompt_info.get("host", ""),
            is_raw_mode,
            True,
            is_exiting_raw,
        )

    def _filter_chunk(self, chunk: str, command: str) -> str:
        """Filter out prompt patterns and command echo from a chunk."""
        # Remove prompt patterns
        prompt_pattern = (
            re.escape(self.config.PROMPT_PREFIX)
            + r".+?"
            + re.escape(self.config.PROMPT_SUFFIX)
        )
        chunk = re.sub(prompt_pattern, "", chunk)

        # Remove command echo (exact command match)
        if command.strip() in chunk:
            chunk = chunk.replace(
                command.strip(), "", 1
            )  # Remove only first occurrence

        # Clean up extra newlines that might be left
        chunk = re.sub(r"\n\s*\n", "\n", chunk)

        return chunk

    def _build_result(
        self,
        output: str,
        cwd: str,
        user: str,
        host: str,
        raw_mode: bool,
        is_complete: bool,
        is_exiting_raw: bool,
    ) -> Dict[str, str]:
        """Build standardized result dictionary."""
        return {
            "type": "command",
            "output": output,
            "cwd": cwd,
            "user": user,
            "host": host,
            "raw_mode": raw_mode,
            "is_complete": is_complete,
            "is_exiting_raw": is_exiting_raw,
        }

    def _clean_command_output(self, output: str, command: str) -> str:
        """Extract and clean the command output from the raw PTY output."""
        prompt_pattern = (
            re.escape(self.config.PROMPT_PREFIX)
            + r".+?"
            + re.escape(self.config.PROMPT_SUFFIX)
        )
        match = re.search(prompt_pattern, output)

        if match:
            prompt_start = match.start()
            output_before_prompt = output[:prompt_start]
        else:
            output_before_prompt = output

        # Remove echoed command
        if output_before_prompt.strip().startswith(command.strip()):
            output_before_prompt = output_before_prompt.strip()[
                len(command.strip()) :
            ].lstrip()

        return output_before_prompt.strip()

    # Very poor solution, we actually dont want to have to strip out characters since that can break unexpectedly
    # The ideal solution is to stop using PTY inside the main python code and just invoke the pty inside of the container
    async def xoblas_editor_command(self, command: str):
        result = await self.execute(f"NO_COLOR=1 TERM=dumb {command}")

        output = result.get("output")

        clean_pattern = re.compile(r"\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])|\r|\n")

        cleaned = clean_pattern.sub("", output)

        return json.loads(cleaned)

    def is_xoblas_command(self, command: str) -> bool:
        # Strip leading whitespace and split by whitespace
        words = command.strip().split()

        # Check if there are words and if the first one is "xoblas"
        if words and words[0].lower() == "xoblas":
            return True
        else:
            return False

    async def resize(self, rows: int, cols: int) -> None:
        """Resize the terminal."""
        if self.pty.in_alternate_screen:
            result = await self.pty.resize(rows, cols, capture_output=True)

            # [TO-DO]: Please do a better approach this is wild LOL
            return {
                "type": "command",
                "output": result,
                "cwd": "",
                "user": "",
                "host": "",
                "raw_mode": self.pty.in_alternate_screen,
                # Not used
                "is_exiting_raw": "",
            }

        await self.pty.resize(rows, cols)

    async def write_to_file(self, code_content: str) -> Dict[str, str]:
        """Write content to a file in the container."""
        return await self.file_manager.write_file(code_content)

    async def read_from_file(
        self, file_path: str = "/home/termuser/root/main.py"
    ) -> str:
        """Read content from a file in the container."""
        return await self.file_manager.read_file(file_path)

    # Helper function to debug raw mode
    def log_terminal_input(self, input_str: str):
        escaped = ""
        for char in input_str:
            if ord(char) < 32 or ord(char) == 127:
                escaped += f"\\x{ord(char):02x}"
            else:
                escaped += char
        print(f"Terminal input: {escaped}")

    def is_alive(self) -> bool:
        """Check if the shell is still alive."""
        return self.pty.is_process_alive() and self.docker.is_container_running()

    async def close(self) -> None:
        """Close the PTY shell session and clean up Docker resources."""
        # Close the PTY
        self.pty.close()

        # Stop and remove the Docker container
        await self.docker.stop_container()
