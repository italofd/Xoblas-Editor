FROM ubuntu:latest

# Update and install basic utilities
RUN apt-get update && apt-get install -y \
    bash \
    curl \
    wget \
    vim \
    nano \
    git \
    sudo \
    python3 \
    python3-pip \
    procps \
    tree \
    && apt-get clean

# Create a restricted user
RUN useradd -m -s /bin/bash termuser
RUN echo "termuser ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Set the working directory
WORKDIR /home/termuser

# Copy the xoblas script
COPY ./scripts/xoblas.sh /usr/local/bin/xoblas
RUN chmod +x /usr/local/bin/xoblas

# Copy and append bashrc additions
COPY ./scripts/bashrc_addition.sh /tmp/
RUN cat /tmp/bashrc_addition.sh >> /home/termuser/.bashrc && rm /tmp/bashrc_addition.sh

# Create file that will hold code editor text (python code)
RUN mkdir root
RUN touch root/main.py 

# Create a welcome message
RUN echo '\necho "Welcome to your isolated terminal environment!"' >> /home/termuser/.bashrc

# Set ownership
RUN chown -R termuser:termuser /home/termuser

# Switch to user
USER termuser

CMD ["/bin/bash"]