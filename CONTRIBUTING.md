# Group workflow (GitHub)

## Branches
- `main` – always deployable. Vercel/Netlify and Render deploy from it. **Nobody pushes directly to `main`.**
- `feature/<short-name>` – one branch per task, e.g. `feature/cart-ui`, `feature/orders-api`, `fix/price-rounding`.

## Day-to-day
1. Create an Issue for the task and assign it to one member.
2. `git switch -c feature/<name>` from an up-to-date `main`.
3. Commit small and often, using clear messages: `feat: add quantity buttons to cart`, `fix: reject negative prices`, `docs: explain deployment`.
4. Push the branch and open a Pull Request using the template.
5. **At least one other member reviews** (comments, requests changes, approves). The author merges after approval.
6. Delete the merged branch.

## Recording contributions
- Every member commits under **their own GitHub account** (`git config user.name` / `user.email`).
- Link each PR to an Issue. The GitHub *Insights → Contributors* page and `git shortlog -sn` are evidence for the contribution report.
- Fill in `docs/Contribution-Report.docx` from the real PR/commit history.

## Code quality rules
- Backend: validate all input in `validators.js`, throw `HttpError` for known problems, keep routes thin.
- Frontend: all HTTP calls live in `src/api.js`; components never call `fetch` directly.
- Never commit `.env`; add new variables to `.env.example`.
