# Operational Runbook: Addressing Failed Security Tests

This runbook outlines the standard operating procedure (SOP) for engineers when an automated security test (e.g., the Authentication Boundary test in `api.test.js`) fails in the CI/CD pipeline or local environment. 

Our primary goal is to assume any security test failure is a critical vulnerability attempting to reach production.

## 1. Investigate (Find the Root Cause)
When a security test fails, the pipeline is immediately halted. The on-call developer must determine *why* the test failed:
*   **Check the Pipeline Logs:** Open the CI/CD runner logs (e.g., GitHub Actions) to see the exact assertion error. Did it expect a `401 Unauthorized` but received a `200 OK`? 
*   **Run Locally:** Pull the failing branch to your local machine and run `npm test` inside the `server` directory to reproduce the failure.
*   **Code Review:** Look at the recent commits in the Pull Request. Did someone accidentally remove the `authenticateToken` middleware from the `/api/messages` route while refactoring?

## 2. Mitigate (Stop the Bleeding)
If the failure occurred on a feature branch (Pull Request), the mitigation is already handled because the CI/CD pipeline blocked the merge. However, if this was a regression that somehow made it to the `main` branch or production:
*   **Revert the Commit:** Immediately revert the Git commit that introduced the vulnerability to restore the codebase to the last known secure state.
*   **Feature Flagging / Routing:** If a revert isn't instantly possible, update the NGINX/Frontend routing to temporarily block traffic to the vulnerable endpoint (e.g., returning a `503 Service Unavailable` for `/api/messages`) until the fix is ready.
*   **Lock Down:** If data was potentially exposed, temporarily pause the Gatus endpoints and alert the incident response team.

## 3. Recover (Fix and Prevent)
Once the immediate threat is mitigated, the system must be properly repaired:
*   **Apply the Fix:** Correct the broken logic in the codebase (e.g., re-adding the missing JWT verification middleware).
*   **Verify Locally:** Run the automated security test suite locally (`npm test`) and ensure the tests now pass with a green exit code.
*   **Push and Unblock:** Push the hotfix commit. Watch the CI/CD pipeline run the automated security tests again. Once it turns green, merge the fix into `main`.
*   **Post-Mortem:** Document *why* the security check broke in the first place (e.g., "Developer bypassed middleware for testing and forgot to remove it"). Add a new, even more specific security test if necessary to prevent the exact same mistake in the future.
