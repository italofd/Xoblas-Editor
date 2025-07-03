from typing import Dict
import asyncio
import subprocess
from terminal.terminal_config import TerminalConfig

docker_sessions: Dict[str, "DockerManager"] = {}


class DockerManager:
    def __init__(self, user_id: str, config: TerminalConfig):
        print(docker_sessions)
        self.user_id = user_id
        self.config = config
        self.container_id = None
        self.image_name = config.DEFAULT_IMAGE_NAME
        self.container_name = f"{config.DEFAULT_CONTAINER_NAME}_{user_id}"
        self.dockerfile_path = config.DEFAULT_DOCKERFILE_PATH

    async def build_image(self) -> str:
        """Build Docker image from Dockerfile if not already built."""
        image_tag = f"{self.image_name}:latest"

        if await self.is_image_built():
            return image_tag

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

    @classmethod
    def get_or_create(cls, user_id: str, config: TerminalConfig) -> "DockerManager":
        existing = docker_sessions.get(user_id)
        if existing and existing.is_container_running():
            return existing

        manager = cls(user_id, config)
        docker_sessions[user_id] = manager
        return manager

    async def is_image_built(self) -> bool:
        """Check if the Docker image already exists."""
        process = await asyncio.create_subprocess_exec(
            "docker", "images", self.image_name, stdout=asyncio.subprocess.PIPE
        )

        stdout, _ = await process.communicate()
        return self.image_name in stdout.decode()

    async def start_container(self) -> str:
        """Start the Docker container and return its ID."""
        # Create volume for user data persistence
        await asyncio.create_subprocess_exec("docker", "volume", "create", self.user_id)

        # Start container
        process = await asyncio.create_subprocess_exec(
            "docker",
            "run",
            "-d",
            "-i",
            "--rm",
            "-v",
            f"{self.user_id}:/home/termuser",
            f"{self.image_name}:latest",
            "tail",
            "-f",
            "/dev/null",
            stdout=asyncio.subprocess.PIPE,
        )

        stdout, _ = await process.communicate()
        container_id = stdout.decode().strip()

        if not container_id:
            raise Exception("Failed to start Docker container")

        self.container_id = container_id
        return container_id

    async def exec_command(self, command: str) -> tuple:
        """Execute a command in the container."""
        process = await asyncio.create_subprocess_exec(
            "docker",
            "exec",
            self.container_id,
            "bash",
            "-c",
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        return await process.communicate()

    def is_container_running(self) -> bool:
        """Check if the container is still running."""
        if not self.container_id:
            return False

        result = subprocess.run(
            ["docker", "inspect", "-f", "{{.State.Running}}", self.container_id],
            capture_output=True,
            text=True,
        )
        return result.stdout.strip() == "true"

    async def cleanup_vim_locks(self) -> None:
        """Clean up any vim swap files that might be left."""
        if self.container_id:
            try:
                # Find and remove vim swap files
                await asyncio.create_subprocess_exec(
                    "docker",
                    "exec",
                    self.container_id,
                    "bash",
                    "-c",
                    "find /home/termuser -name '*.sw[a-p]' -delete",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
            except Exception as e:
                print(f"Error cleaning up vim locks: {e}")

    async def stop_container(self) -> None:
        """Stop and remove the container."""
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

            self.container_id = None
