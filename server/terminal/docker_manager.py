from typing import Dict, Set
import asyncio
import subprocess
from terminal.terminal_config import TerminalConfig

docker_sessions: Dict[str, "DockerManager"] = {}
# Add a global lock for container startup per user
container_startup_locks: Dict[str, asyncio.Lock] = {}
# Track active WebSocket connections per user
active_connections: Dict[str, Set[str]] = {}


class DockerManager:
    def __init__(self, user_id: str, config: TerminalConfig):
        print(docker_sessions)
        self.user_id = user_id
        self.config = config
        self.container_id = None
        self.image_name = config.DEFAULT_IMAGE_NAME
        self.container_name = f"{config.DEFAULT_CONTAINER_NAME}_{user_id}"
        self.dockerfile_path = config.DEFAULT_DOCKERFILE_PATH
        # Add instance-level startup state tracking
        self._startup_in_progress = False

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

        print("EVA01", existing)
        if existing is not None:
            return existing

        manager = cls(user_id, config)
        docker_sessions[user_id] = manager

        # Create a startup lock for this user if it doesn't exist
        if user_id not in container_startup_locks:
            container_startup_locks[user_id] = asyncio.Lock()

        # Initialize connection tracking for this user
        if user_id not in active_connections:
            active_connections[user_id] = set()

        return manager

    @classmethod
    def register_connection(cls, user_id: str, connection_id: str):
        """Register a new WebSocket connection for this user"""
        if user_id not in active_connections:
            active_connections[user_id] = set()
        active_connections[user_id].add(connection_id)
        print(
            f"Registered connection {connection_id} for user {user_id}. Active: {len(active_connections[user_id])}"
        )

    @classmethod
    def unregister_connection(cls, user_id: str, connection_id: str):
        """Unregister a WebSocket connection for this user"""
        if user_id in active_connections:
            active_connections[user_id].discard(connection_id)
            print(
                f"Unregistered connection {connection_id} for user {user_id}. Active: {len(active_connections[user_id])}"
            )

            # If no more connections, clean up the Docker session
            if len(active_connections[user_id]) == 0:
                print(
                    f"No more active connections for user {user_id}. Scheduling cleanup."
                )
                # Schedule cleanup with a delay to allow for quick reconnections (like refresh)
                asyncio.create_task(cls._delayed_cleanup(user_id))

    @classmethod
    async def _delayed_cleanup(cls, user_id: str):
        """Clean up Docker session after a delay if no connections are re-established"""
        # Wait a bit to see if user reconnects (common during page refresh)
        await asyncio.sleep(5.0)  # 5 second grace period

        # Double-check if there are still no active connections
        if user_id in active_connections and len(active_connections[user_id]) == 0:
            print(f"Performing delayed cleanup for user {user_id}")
            await cls._cleanup_user_session(user_id)

    @classmethod
    async def _cleanup_user_session(cls, user_id: str):
        """Clean up all resources for a user"""
        # Remove from active connections
        if user_id in active_connections:
            del active_connections[user_id]

        # Stop and remove container, then remove from sessions
        if user_id in docker_sessions:
            docker_manager = docker_sessions[user_id]
            try:
                await docker_manager.stop_container()
            except Exception as e:
                print(f"Error stopping container for user {user_id}: {e}")

            # Remove from sessions
            del docker_sessions[user_id]
            print(f"Cleaned up Docker session for user {user_id}")

        # Clean up startup locks
        if user_id in container_startup_locks:
            del container_startup_locks[user_id]

    async def is_image_built(self) -> bool:
        """Check if the Docker image already exists."""
        process = await asyncio.create_subprocess_exec(
            "docker", "images", self.image_name, stdout=asyncio.subprocess.PIPE
        )

        stdout, _ = await process.communicate()
        return self.image_name in stdout.decode()

    async def ensure_container_running(self) -> str:
        """Ensure container is running with proper synchronization to prevent multiple containers."""

        # Get or create the startup lock for this user
        if self.user_id not in container_startup_locks:
            container_startup_locks[self.user_id] = asyncio.Lock()

        startup_lock = container_startup_locks[self.user_id]

        async with startup_lock:
            # Double-check if container is running after acquiring lock
            if self.is_container_running():
                return self.container_id

            # If startup is already in progress, wait for it
            if self._startup_in_progress:
                # Wait a bit and check again
                while self._startup_in_progress:
                    await asyncio.sleep(0.1)
                    if self.is_container_running():
                        return self.container_id

            # Start the container
            self._startup_in_progress = True
            try:
                # Build image first
                await self.build_image()

                # Start container
                container_id = await self.start_container()

                # Wait a moment for container to be fully ready
                await asyncio.sleep(0.2)

                return container_id
            finally:
                self._startup_in_progress = False

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
