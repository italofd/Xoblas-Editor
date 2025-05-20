# file_manager.py - Handles file operations within the container
import base64
from typing import Dict
from terminal.docker_manager import DockerManager


class FileManager:
    def __init__(self, docker_manager: DockerManager):
        self.docker_manager = docker_manager

    async def write_file(
        self, content: str, file_path: str = "/home/termuser/root/main.py"
    ) -> Dict[str, str]:
        """Write content to a file in the container."""
        # Base64 encode to handle special characters
        encoded_content = base64.b64encode(content.encode()).decode()
        bash_command = f"echo '{encoded_content}' | base64 -d > {file_path}"

        _, stderr = await self.docker_manager.exec_command(bash_command)

        if not stderr:
            return {"status": "success", "message": "File updated successfully"}
        else:
            return {
                "status": "error",
                "message": f"Failed to update file: {stderr.decode()}",
            }

    async def read_file(self, file_path: str = "/home/termuser/root/main.py") -> str:
        """Read content from a file in the container."""
        stdout, stderr = await self.docker_manager.exec_command(f"cat {file_path}")

        if stderr:
            raise Exception(f"Error reading file: {stderr.decode()}")

        return stdout.decode()
