import os


class TerminalConfig:
    DEFAULT_DOCKERFILE_PATH = os.getcwd() + "/terminal_env.Dockerfile"
    DEFAULT_CONTAINER_NAME = "pty_shell_container"
    DEFAULT_IMAGE_NAME = "pty-shell-image"
    DEFAULT_ROWS = 24
    DEFAULT_COLS = 80
    PROMPT_PREFIX = "__START__"
    PROMPT_SUFFIX = "__END__$"
    # This will be used to create a file structure to be rendered in the future
    CURRENT_WORKDIR = "/home/termuser/root/"
