run_id: run_20260717_221635
task: Act as a senior full-stack developer. In my monorepo, create a new Cloudflare Workers CORS proxy backend inside a `/backend` directory.

Requirements:
1. Initialize a basic Node/npm setup inside `/backend` with `wrangler` installed as a devDependency.
2. Create a `/backend/src/index.js` containing a secure proxy script that handles OPTIONS preflight requests and forwards all incoming HTTP methods, headers, and bodies to a target URL parsed from a query parameter (?url=...).
3. Lock the `Access-Control-Allow-Origin` header explicitly to "https://andrewratnikov.github.io" (allow http://localhost:3000 and http://localhost:5173 if developing locally).
4. Create a `wrangler.json` config file inside `/backend` pointing to `src/index.js`. Add `dev` and `deploy` scripts to `/backend/package.json`.
5. Create a GitHub Actions workflow at `.github/workflows/deploy-proxy.yml` that uses `cloudflare/wrangler-action@v3` to automatically deploy the worker from the `backend` working directory on pushes to `main` using the `CLOUDFLARE_API_TOKEN` secret.
repo: /Users/andrewratnikov/Projects/req-lab
original_branch: main
target_branch: orchestrator/run_20260717_221635
step: done
status: done
timestamp: 2026-07-17T23:30:00
last_artifact: runs/run_20260717_221635/code/
pause_reason:
retry_count: 2
