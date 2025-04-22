import os
import pty
import select
import fcntl
import signal
import re
import asyncio
from typing import Dict
import termios
import struct
import subprocess


# A class to handle PTY shell
class PtyShell:
    def __init__(
        self,
        dockerfile_path: str = os.getcwd() + "/terminal_env.Dockerfile",
        container_name: str = "pty_shell_container",
    ):
        """Initialize a new PTY shell session with Docker container."""
        self.dockerfile_path = dockerfile_path
        self.container_name = container_name
        self.image_name = "pty-shell-image"
        self.process = None
        self.fd = None
        self.pid = None
        self.container_id = None
        self.prompt = None
        self.last_output = ""
        self.rows = 24
        self.cols = 80

    async def _build_docker_image(self) -> str:
        """Build Docker image from Dockerfile."""
        # Create a temporary tag for our image
        image_tag = f"{self.image_name}:latest"

        is_built = await self._is_image_built()

        if is_built:
            return image_tag

        # Build the Docker image
        process = await asyncio.create_subprocess_exec(
            "docker",
            "build",
            "-t",
            image_tag,
            "-f",
            self.dockerfile_path,
            ".",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        await process.communicate()

        if process.returncode != 0:
            raise Exception("Failed to build Docker image")

        return image_tag

    async def _is_image_built(self) -> bool:
        process = await asyncio.create_subprocess_exec(
            "docker", "images", self.image_name, stdout=asyncio.subprocess.PIPE
        )

        stdout, _ = await process.communicate()

        output = stdout.decode()

        if self.image_name in output:
            return True
        return False

    async def start(self) -> None:
        """Start the PTY shell session in a Docker container."""
        # Build the Docker image
        image_tag = await self._build_docker_image()

        # Start a Docker container and get its ID
        process = await asyncio.create_subprocess_exec(
            "docker",
            "run",
            "-d",
            "-i",
            "--rm",
            image_tag,
            "tail",
            "-f",
            "/dev/null",
            stdout=asyncio.subprocess.PIPE,
        )

        stdout, _ = await process.communicate()
        self.container_id = stdout.decode().strip()

        if not self.container_id:
            raise Exception("Failed to start Docker container")

        # Now fork a PTY to connect to the docker exec process
        self.pid, self.fd = pty.fork()

        if self.pid == 0:  # Child process
            # Execute docker exec to connect to the container
            os.execvp("docker", ["docker", "exec", "-it", self.container_id, "bash"])
        else:  # Parent process
            # Make the PTY non-blocking
            flags = fcntl.fcntl(self.fd, fcntl.F_GETFL)
            fcntl.fcntl(self.fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)

            # Give the shell a moment to initialize
            await asyncio.sleep(0.1)

            # Configure the prompt
            await self.write('export PS1="__START__\\u@\\h:\\w__END__$ "\n')
            await self.write("export TERM=xterm-256color\n")

            # Set initial terminal size
            await self.resize(self.rows, self.cols)

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

    async def resize(self, rows: int, cols: int) -> None:
        if self.fd is not None:
            self.rows = rows
            self.cols = cols

            # Create the window size structure
            winsize = struct.pack("HHHH", rows, cols, 0, 0)
            fcntl.ioctl(self.fd, termios.TIOCSWINSZ, winsize)

            if self.pid is not None and self.is_alive():
                try:
                    os.kill(self.pid, signal.SIGWINCH)

                    # Send the stty command
                    await self.write(f"stty columns {cols} rows {rows}\n")

                    # Important: Add a small delay
                    await asyncio.sleep(0.1)

                    # Clear the buffer by reading all pending output
                    try:
                        while True:
                            r, _, _ = select.select([self.fd], [], [], 0.05)
                            if not r:
                                break
                            os.read(self.fd, 4096)
                    except (OSError, BlockingIOError):
                        pass

                except ProcessLookupError:
                    pass

    async def write(self, data: str) -> None:
        """Write raw data to the PTY."""
        os.write(self.fd, data.encode())

    async def read_until_prompt(self, timeout: float = 2.0) -> str:
        output = ""
        end_time = asyncio.get_event_loop().time() + timeout

        while asyncio.get_event_loop().time() < end_time:
            r, _, _ = select.select([self.fd], [], [], 0.1)

            if r:
                chunk = os.read(self.fd, 4096).decode(errors="replace")
                output += chunk

                # Look for our custom prompt
                if "__END__$" in chunk:
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
            # Check if the docker container is running
            if self.container_id:
                result = subprocess.run(
                    [
                        "docker",
                        "inspect",
                        "-f",
                        "{{.State.Running}}",
                        self.container_id,
                    ],
                    capture_output=True,
                    text=True,
                )
                if result.stdout.strip() != "true":
                    return False

            # Check if the PTY process is alive
            os.kill(self.pid, 0)
            return True
        except ProcessLookupError:
            return False
        except PermissionError:
            return True  # Process exists but we don't have permission

    async def close(self) -> None:
        """Close the PTY shell session and clean up Docker resources."""
        # Close the PTY
        if self.pid and self.is_alive():
            try:
                os.kill(self.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass  # Process already terminated

        if self.fd:
            os.close(self.fd)

        # Stop and remove the Docker container
        if self.container_id:
            try:
                proc = await asyncio.create_subprocess_exec(
                    "docker",
                    "container",
                    "stop",
                    self.container_id,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                await proc.communicate()

                proc = await asyncio.create_subprocess_exec(
                    "docker",
                    "rm",
                    self.container_name,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                await proc.communicate()
            except Exception:
                pass

        self.pid = None
        self.fd = None
        self.container_id = None
