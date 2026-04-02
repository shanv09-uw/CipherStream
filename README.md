# Secure Notes Web App (with Auth)

A modern Secure Notes web application built to provide testing scope for Threat Modeling and Incident Runbook creations. Demonstrates a complete DevOps lifecycle including containerization and automated CI/CD.

## Tech Stack & Security
- **Frontend**: React (Vite) + Tailwind CSS (Native `fetch`, no Axios). Configured with JWT LocalStorage management.
- **Backend**: Node.js (Express) + `bcryptjs` + `jsonwebtoken`.
- **Database**: PostgreSQL (Relational `users` and `notes` schemas).
- **Orchestration**: Docker & Docker Compose.
- **CI/CD**: GitHub Actions.

## Installation & Local Development

### Prerequisites
Make sure you have [Docker Desktop](https://docs.docker.com/get-docker/) installed and **Running** on your machine.

### Running with Docker Compose
The easiest way to run the entire application stack locally is via Docker Compose.

1. Clone the repository and navigate to the project root:
   ```bash
   cd task-manager # or the directory containing docker-compose.yml
   ```

2. Start the application stack:
   ```bash
   docker-compose up --build
   ```

3. Access the application:
   - **Frontend UI**: http://localhost
   - **Backend API**: http://localhost/api/notes OR http://localhost:5000/api/notes

### Stopping the Application
To stop the application and remove the containers, press `Ctrl+C` in the terminal or run:
```bash
docker-compose down
```

## CI/CD Pipeline
A GitHub Actions workflow is available in `.github/workflows/main.yml`. 
- **Trigger**: Pushes or pull requests to the `main` branch.
- **Workflow Steps**: Code Linting -> Unit Tests (`vitest` & `jest`) -> Build Docker Images safely.
