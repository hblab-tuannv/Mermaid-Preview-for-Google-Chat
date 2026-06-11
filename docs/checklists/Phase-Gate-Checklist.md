# Phase-Gate / Rollout Checklist

> Tailored for **small mode** (1 human + 1 agent, solo Chrome extension). Gates kept lightweight; items not applicable to a browser-loaded extension have been dropped. Automate via CI where possible.

## A. Quality Gates by Phase
> Pass a gate only when all "exit" criteria are met.

### Gate 1 — End of Planning
- [ ] Project Charter / Brief approved (self-approval acceptable in small mode)
- [ ] Scope and timeline are clear

### Gate 2 — End of Requirements
- [ ] Backlog has testable acceptance criteria and has been reviewed
- [ ] Requirement traceability established

### Gate 3 — End of Design
- [ ] ADR recorded for every significant architecture decision (e.g. Mermaid render strategy, content-script injection approach)
- [ ] NFRs resolved (security: CSP/sanitization; performance: render time per diagram)

### Gate 4 — End of Development
- [ ] Code follows the Coding Standards
- [ ] PR follows the template; reviewed against the 8-area checklist
- [ ] Tests pass and meet the minimum coverage (80%); DoD satisfied

### Gate 5 — End of Testing
- [ ] Test cases executed; summary recorded
- [ ] No open critical/major defects remain
- [ ] Manual verification on chat.google.com passes

### Gate 6 — Release (Go/No-Go)
- [ ] Build artifact (`dist/`) produced and loads as unpacked extension
- [ ] Release Notes complete
- [ ] Go-live approval (publish to Chrome Web Store or distribute unpacked)

### Gate 7 — Operations
- [ ] Incident / Change process noted
- [ ] Basic error monitoring (console diagnostics) in place

## B. Process-Suite Rollout Checklist for the Team
- [ ] **Choose the minimum set** of templates suited to the team (avoid imposing the entire suite at once)
- [ ] **Tailoring**: define variants for small vs. large projects
- [ ] **Docs-as-code**: store templates & documents in the repo, reviewed via PR
- [ ] **Single source of truth** for each type of information
- [ ] Define **DoR & DoD** consistently
- [ ] Put **quality gates into CI/CD** (lint, test, coverage, security scan)
- [ ] Train the team & assign an owner for each process

## C. Living Documents
- [ ] Every document has a version, owner, and update date
- [ ] Reviewed/updated periodically; obsolete documents removed
