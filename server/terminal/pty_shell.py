import os
import pty
import select
import fcntl
import signal
import re
import asyncio
from typing import Dict


# A class to handle PTY shell
class PtyShell:
    def __init__(self, shell_path: str = "/usr/bin/bash"):
        """Initialize a new PTY shell session."""
        self.shell_path = shell_path
        self.process = None
        self.fd = None
        self.pid = None
        self.current_dir = os.getcwd()
        self.prompt = None
        self.last_output = ""

    async def start(self) -> None:
        """Start the PTY shell session."""
        self.pid, self.fd = pty.fork()

        if self.pid == 0:  # Child process
            # Execute the shell
            os.execv(self.shell_path, [self.shell_path])
        else:  # Parent process

            # Make the PTY non-blocking
            flags = fcntl.fcntl(self.fd, fcntl.F_GETFL)
            fcntl.fcntl(self.fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)

            # Give the shell a moment to initialize
            await asyncio.sleep(0.1)

            await self.write('export PS1="__START__\\u@\\h:\\w__END__$ "\n')
            self.prompt = "__END__$"

            self.last_output = await self.read_until_prompt()

    def parse_prompt_info(self, output: str) -> Dict[str, str]:
        """Extract user and working directory from the prompt."""
        match = re.search(r"__START__(.+?)__END__", output)
        if match:
            prompt_content = match.group(1)  # e.g., "user@host:/home/user"
            try:
                user_host, cwd = prompt_content.split(":", 1)
                user, host = user_host.split("@")
                return {"user": user, "host": host, "cwd": cwd}
            except ValueError:
                return {}
        return {}

    # Currently unused, XTerm handles ANSI characters automatically =)
    # Striping would only cause it to be unreliable on the UI Outputs
    def _strip_ansi_codes(self, text: str) -> str:
        """Remove ANSI escape sequences from text."""

        # This pattern matches ANSI escape sequences
        ansi_pattern = re.compile(r"\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])")
        return ansi_pattern.sub("", text)

    async def write(self, data: str) -> None:
        """Write raw data to the PTY."""
        os.write(self.fd, data.encode())

    async def read_until_prompt(self, timeout: float = 2.0) -> str:
        output = ""
        end_time = asyncio.get_event_loop().time() + timeout

        while asyncio.get_event_loop().time() < end_time:
            r, _, _ = select.select([self.fd], [], [], 0.1)
            if r:
                chunk = os.read(self.fd, 4096).decode()
                output += chunk

                # Look for our custom prompt
                if "__MY_PROMPT__$" in chunk:
                    break

            await asyncio.sleep(0.05)

        return output

    async def execute(self, command: str) -> Dict[str, str]:
        await self.write(command + "\n")
        output = await self.read_until_prompt()

        # Extract and remove prompt and echoed command
        lines = output.splitlines()

        # Detect prompt line
        prompt_info = self.parse_prompt_info(output)

        # Remove the prompt lines from output
        lines = [
            line for line in lines if "__START__" not in line and "__END__" not in line
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

    def is_alive(self) -> bool:
        """Check if the shell process is still alive."""
        if self.pid is None:
            return False

        try:
            # Send signal 0 to check if process exists
            os.kill(self.pid, 0)
            return True
        except ProcessLookupError:
            return False
        except PermissionError:
            return True  # Process exists but we don't have permission

    async def close(self) -> None:
        """Close the PTY shell session."""
        if self.pid and self.is_alive():
            try:
                os.kill(self.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass  # Process already terminated

        if self.fd:
            os.close(self.fd)

        self.pid = None
        self.fd = None
