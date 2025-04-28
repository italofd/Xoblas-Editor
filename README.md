# AQ-Take-Home

## How to Get Started

- We are considering, for all examples below, that you are in the main directory "aq-take-home"

#### web-app

- Open your terminal and execute the following `cd web-app`
- Run `yarn` to install all dependencies
- Run `yarn dev` and you should see your UI populated =)

#### server

- **Requirements**: Docker Daemon must be up and running!
    - This may not be compatible if you run on a Windows host. If you encounter any issues, please run it inside a Docker container, as it is provided already as the main Dockerfile
- Open another terminal and execute the following `cd server`
- Run your virtualenv or other similar tool
- We recommend for this simple project going with **pip**
    - Run `pip install -r requirements.tx`
- Execute the following to start your local server `fastapi dev main.py` and your server should be started and ready to use

## Technology Choice / Why

#### Web-app

- **NextJS**: We are exclusively using NextJS for the deployment experience they offer, it's much easier, with that said, we are not gonna use it to its full potential since the UI requirements of this project are not elaborated enough to create a boilerplate or unnecessary improvements.
- **Monaco-React**: The most reliable and robust option for the Code Editor component, includes support for LSP and many languages, and is highly customizable if you want to keep adding new stuff. Also works out of the box with React, and the package maintainers for both of them are from Microsoft itself and are not third-party libraries.
- **Axios**: The common fetching API from the JS std library is not good, I prefer a solution that has already better error management out of the box instead of having to create boilerplate. Axios have a humongous community and is usually the way to go for this kinda task.

#### Server

:construction: OBS: I have never used Python for a real project before, I tried my best to research while doing the coding with that in mind; this section is much more opinion-based than the web app where I have most of my experience.

- **FastAPI**: For a basic project, it offers everything you want, also, the documentation goes a long way for people like me that were learning as well as they talk about Python itself, cors, and other core things that are easy to set up and I appreciate the OpenAPI standards and pre-built documentation and docs page.
- **PostgreSQL / psycopg**: The most available relational database to freely deploy, easy to use, and has a good library to manage it in Python.
- **...Others**: All the other tools that are requirements have come by default or were highly recommended by the documentation of FastAPI or/RestrictedPython
- ~~RestrictedPython: It's the implemented way in the project right now, RestrictedPython makes it easier to compile and exec Python code in a safe way with its pre-built functions and functionality, but limits a lot the client code that can be sent (see discussions below for more).~~
- ~~SQLite: For the MVP and concept, using a SQL already implemented as a std library looks good, even if it is too simple and we are not deploying anywhere, meaning that is part of the bundle of the project, it has a lot of downsides that will be a pushing factor for me to refactor in favor of MySQL or PostgreSQL in the final version of it.~~

## Deploy

#### web-app

The NextJS app is hosted at _Vercel_

#### server

The FastAPI server is deployed in a Docker container inside a Droplet on _DigitalOcean_, this was necessary to use DinD (Docker inside Docker) pattern, alongside another separate project hosting the PostgreSQL database (on _Render_)

## Main Discussions

### Being the safest X Use the most tools

There is a tradeoff to be considered here, if you want to be using the most std libraries and let the client send it over, there are major concerns of being exposed to malicious code that can: Exhaust Resources, Tweak the systemcalls and systemfiles directly (oh boy, here is the `rm -rf`), privilege escalation and many more, that is **not** a problem with python, that is a computer science issue that is sending code from the client to a server.

Exhaust Resources can be mitigated a lot by using a `subprocess` on Python or any tools in any language that helps you instantiate a new separated process with limited resources to things like CPU, RAM, and Network usage without affecting directly the primary thread resources and having to downsize your whole application just to run a single external code.

Running the application inside a docker container also helps with some topics mentioned, still, you are exposing your application to malicious code that can interact at the level of your code (EG: your FastAPI instance or SQL DB).

In terms of the rest of the issues, a subprocess won't do much, it will make it harder for sure but it's still not safe enough, the only way to mitigate at the maximum would be not exposing a lot of std libraries (UntrustedPython is key in that point), that is bad if you want more flexibility in your client code editor, in that way a must considered thing here is: Who gonna use this?

- The code editor is open for everyone: it's impossible to provide every library or module without exposure to serious server risk.
- The code editor is closed, and people are majorly trustworthy: you can provide some libraries that are going to be utility ones, but it is still not safe to provide an entire code editor unless you are the only one using it, or if every client runs its OWN SERVER locally.

**Conclusion:** Exposing every library into a client code editor it's NEVER safe enough, we must choose between usability and safeness here, for this project, the first version was a fully striped version of Python with just pandas and Scipy (because it was a requirement, it's not safe as well introducing the whole library to the client).

**Future**: As we are considering that this is not gonna be used by anyone publically and the main focus of the product we gonna develop is for trusted contractors, I will try in the remaining days to give a more complete feel and better developer experience trough the client by exposing some useful libraries. Also, the first version does not control for resource exhaustion and that is as well gonna be implemented in the next versions after MVP.

## Author

- [@Italo Ferreira](https://www.github.com/italofd)
