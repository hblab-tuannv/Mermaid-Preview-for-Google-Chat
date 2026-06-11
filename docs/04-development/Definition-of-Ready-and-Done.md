---
version: "1.0"
date: "2026-06-11T10:12:59Z"
owner: "<Team>"
applies_to: "<Story / PBI>"
---

# Definition of Ready (DoR) & Definition of Done (DoD)

## Definition of Ready (DoR)
A backlog item is **clear enough to bring into a sprint** when:
- [ ] Clearly described (user story / acceptance criteria)
- [ ] Acceptance criteria are testable (Given/When/Then)
- [ ] Estimated by the team
- [ ] Not blocked by any unresolved dependency
- [ ] Small enough to complete within 1 sprint
- [ ] UX/design (if needed) is ready
- [ ] Has a way to test/accept it

## Definition of Done (DoD)
An item is **done** when:
- [ ] Code is complete, following the Coding Standards
- [ ] Unit/integration tests written & passing
- [ ] Code review completed (per the Code Review Checklist) and merged
- [ ] Minimum coverage threshold met (80%)
- [ ] Acceptance criteria satisfied
- [ ] Documentation / ADR updated (if needed)
- [ ] No known serious defects
- [ ] Extension loads as unpacked in Chrome and verified manually on chat.google.com
- [ ] Accepted by the Product Owner

> _The DoD can have multiple levels: per-story, per-sprint, per-release._
