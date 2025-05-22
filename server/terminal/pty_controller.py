# pty_controller.py - Handles PTY-specific operations
import os
import pty
import fcntl
import signal
import select
import termios
import struct
import re
import asyncio
import tty
from typing import Dict, Tuple

from terminal.terminal_config import TerminalConfig


class PtyController:
    def __init__(self, config: TerminalConfig):
        self.config = config
        self.fd = None
        self.pid = None
        self.rows = config.DEFAULT_ROWS
        self.cols = config.DEFAULT_COLS
        self.in_alternate_screen = False

    def set_raw_mode(self):
        """Set the PTY to raw mode."""
        if self.fd is not None:
            tty.setraw(self.fd)

    async def create_pty(self, container_id: str) -> None:
        """Create a new PTY connected to the container."""
        self.pid, self.fd = pty.fork()

        if self.pid == 0:  # Child process
            # Execute docker exec to connect to the container
            os.execvp("docker", ["docker", "exec", "-it", container_id, "bash"])
        else:  # Parent process
            # Make the PTY non-blocking
            flags = fcntl.fcntl(self.fd, fcntl.F_GETFL)
            fcntl.fcntl(self.fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)
            self.set_raw_mode()

            # Give the shell a moment to initialize
            await asyncio.sleep(0.1)

    async def configure_terminal(self) -> None:
        """Configure terminal settings."""
        prompt_template = f'export PS1="{self.config.PROMPT_PREFIX}\\u@\\h:\\w{self.config.PROMPT_SUFFIX} "\n'
        await self.write(prompt_template)
        await self.write("export TERM=xterm-256color\n")

        await self.write("stty sane\n")  # Reset to sane defaults
        await self.write("stty -icanon -echo\n")  # Enable raw input mode
        await self.write("stty opost onlcr\n")  # Enable output processing

        await self.write("reset\n")
        await self.write("\x1b[H\x1b[2J")

        await self.resize(self.rows, self.cols)

    # [TODO] This should be avoiding writing it down at the os level
    async def write(self, data: str) -> None:
        """Write raw data to the PTY."""
        # [TO-DO]: We should use is_process_alive for that
        if self.fd is not None:
            os.write(self.fd, data.encode())

    async def read_until_prompt(self, timeout: float = 2.0) -> str:
        """Read from the PTY until the prompt appears."""
        output = ""
        end_time = asyncio.get_event_loop().time() + timeout

        while asyncio.get_event_loop().time() < end_time:
            r, _, _ = select.select([self.fd], [], [], 0.1)

            if r:
                chunk = os.read(self.fd, 4096).decode(errors="replace")
                output += chunk

                if self.config.PROMPT_SUFFIX in chunk:
                    break

            await asyncio.sleep(0.05)

        return output

    # This value must be tested to determine a good approach when deploying as well =')
    async def read_immediate_output(self, timeout: float = 0.03) -> str:
        """Quickly read available output from PTY."""
        output = ""
        end_time = asyncio.get_event_loop().time() + timeout

        while asyncio.get_event_loop().time() < end_time:
            r, _, _ = select.select([self.fd], [], [], 0.04)
            if r:
                chunk = os.read(self.fd, 4096).decode(errors="replace")
                output += chunk
            await asyncio.sleep(0.01)

        return output

    async def get_terminal_dimensions(self) -> Tuple[int, int]:
        """Get the current terminal width (columns) and height (rows)."""
        # [TO-DO]: We should use is_process_alive for that
        if self.fd is None:
            return self.cols, self.rows  # Fallback to defaults if no pty

        try:
            # Use TIOCGWINSZ to get window size
            winsize = fcntl.ioctl(
                self.fd, termios.TIOCGWINSZ, struct.pack("HHHH", 0, 0, 0, 0)
            )
            rows, cols, _, _ = struct.unpack("HHHH", winsize)
            return cols, rows
        except (OSError, IOError) as e:
            print(f"Error getting terminal dimensions: {e}")
            return self.cols, self.rows  # Fallback to stored values

    async def resize(self, rows: int, cols: int, capture_output: bool = True) -> str:
        """Resize the terminal, optionally capturing any immediate response."""
        if self.fd is not None:
            self.rows = rows
            self.cols = cols

            # Create the window size structure
            winsize = struct.pack("HHHH", rows, cols, 0, 0)
            fcntl.ioctl(self.fd, termios.TIOCSWINSZ, winsize)

            if self.pid is not None and self.is_process_alive():
                try:
                    # Send SIGWINCH to notify the shell
                    os.kill(self.pid, signal.SIGWINCH)

                    if capture_output:
                        # Small wait to let shell react
                        await asyncio.sleep(0.05)

                        # Read available output after resize
                        output = await self.read_immediate_output(timeout=0.1)
                        return output
                    else:
                        # If not capturing output, just wait a bit for safety
                        await asyncio.sleep(0.05)

                except ProcessLookupError:
                    pass

        return ""

    def is_process_alive(self) -> bool:
        """Check if the PTY process is still alive."""
        if self.pid is None:
            return False

        try:
            os.kill(self.pid, 0)
            return True
        except ProcessLookupError:
            return False
        except PermissionError:
            return True  # Process exists but we don't have permission

    def parse_prompt_info(self, output: str) -> Dict[str, str]:
        """Extract user and working directory from the prompt."""
        match = re.search(
            f"{self.config.PROMPT_PREFIX}(.+?){self.config.PROMPT_SUFFIX[:-1]}", output
        )
        if match:
            prompt_content = match.group(1)
            try:
                user_host, cwd = prompt_content.split(":", 1)
                user, host = user_host.split("@")
                return {"user": user, "host": host, "cwd": cwd}
            except ValueError:
                return {}
        return {}

    def check_alternate_screen(self, data: str) -> bool:
        """Check if alternate screen mode is entered or exited."""
        if "\x1b[?1049h" in data:
            self.in_alternate_screen = True
            return True
        elif "\x1b[?1049l" in data:
            self.in_alternate_screen = False

            return False
        return self.in_alternate_screen

    def close(self) -> None:
        """Close the PTY."""
        if self.pid and self.is_process_alive():
            try:
                os.kill(self.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass

        if self.fd:
            os.close(self.fd)

        self.pid = None
        self.fd = None
