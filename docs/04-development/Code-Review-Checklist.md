# Code Review Checklist

## 8 areas to check
- [ ] **Design** — Is the code well designed and a good fit for the system? Do the components interact sensibly? Does it belong in the right place in the codebase?
- [ ] **Functionality** — Does the code do what the author intended? Is the behavior good for the end user (including edge cases and concurrency)?
- [ ] **Complexity** — Could it be made simpler? Is it not over-engineered for a future that may not happen?
- [ ] **Tests** — Are there appropriate and sensible unit/integration/e2e tests? Do the tests fail when the code is broken?
- [ ] **Naming** — Are variable/function/class names clear, meaningful, and not overly long?
- [ ] **Comments** — Are comments clear, useful, and do they explain *why* (rather than restating the code)?
- [ ] **Style** — Does it follow the team's style guide?
- [ ] **Documentation** — Has the relevant documentation (README, API docs) been updated?

## Review principles
- Review promptly (within 1 business day).
- Keep comments constructive; explain your reasoning.
- Distinguish **must-fix** from **suggestions** (e.g., prefix with `Nit:`).
- Approve when the codebase is improved — don't block on perfectionism.

## Reviewer sign-off
- [ ] Checked all 8 areas above
- [ ] CI / automated checks pass
- Decision: `Approve / Request changes / Comment`
