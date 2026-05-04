# HW5: Gaps to a "Full" CI/CD Pipeline

Currently, the project utilizes GitHub Actions for a **Basic CI/CD Pipeline**. The pipeline successfully runs on every push and pull request, executing `npm ci`, code linting, automated test suites (including our newly added unit tests and security tests), and verifying Docker image builds.

However, to evolve this into a **"Full" Enterprise CI/CD Pipeline**, the following gaps must be addressed:

## 1. Automated Deployments (Continuous Deployment / CD)
**The Gap:** The pipeline successfully builds the `cipherstream-frontend` and `cipherstream-backend` Docker images, but it drops them at the end of the run (`push: false`). 
**The Solution:** Deployment steps should be added to automatically push these images to a container registry (like Docker Hub or AWS ECR) and deploy them to a staging/production environment (like AWS ECS, Kubernetes, or Vercel) after tests pass.

## 2. Advanced Security Scanning (SAST / DAST)
**The Gap:** We rely entirely on own manually written security tests. If we introduce a vulnerability that we didn't write a test for, the pipeline will still pass.
**The Solution:** Static Application Security Testing (SAST) tools, such as GitHub CodeQL or SonarQube should be integrated. These tools automatically scan the source code for known vulnerability patterns (like SQL injection or weak cryptography logic) before the code is even merged.

## 3. Automated Dependency Management
**The Gap:** If our dependencies (like `express`, `socket.io`, or `jsonwebtoken`) discover severe security flaws, our pipeline will not automatically notify us or prevent a build unless the flaws break existing tests.
**The Solution:** Integrate dependency scanners like Dependabot or Snyk. These tools actively monitor our `package.json` against CVE databases and automatically open Pull Requests to bump vulnerable packages to safe versions.

## 4. End-to-End (E2E) Browser Testing
**The Gap:** Our current "Unit" and "API/Integration" tests only hit isolated backend routes. They do not guarantee that the actual React frontend properly communicates with the WebSocket broker in a real browser.
**The Solution:** Introduce an E2E testing framework like Playwright or Cypress into the pipeline. These tests should programmatically open browsers, log in as Alice and Bob, and verify that End-to-End Encrypted messages actually appear on the screen.
