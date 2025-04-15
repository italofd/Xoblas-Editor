import os
import pty
import select
import fcntl
import signal
import re
import asyncio


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

            # Set custom prompt
            await self.write('export PS1="__MY_PROMPT__$ "\n')

            # Wait until the new prompt is visible
            self.prompt = "__MY_PROMPT__$"

            self.last_output = await self.read_until_prompt()

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
                chunk_clean = self._strip_ansi_codes(chunk)
                output += chunk_clean

                # Look for our custom prompt
                if "__MY_PROMPT__$" in chunk_clean:
                    break

            await asyncio.sleep(0.05)

        return output

    async def execute(self, command: str) -> str:
        await self.write(command + "\n")

        output = await self.read_until_prompt()

        # Split into lines and clean
        lines = output.splitlines()

        # Remove the first prompt if it's printed before command
        if lines and self.prompt and lines[0].strip().endswith(self.prompt.strip()):
            lines = lines[1:]

        # Remove echoed command
        if lines and lines[0].strip() == command.strip():
            lines = lines[1:]

        # Remove trailing prompt
        if lines and self.prompt and lines[-1].strip().endswith(self.prompt.strip()):
            lines = lines[:-1]

        return "\n".join(lines).strip()

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
