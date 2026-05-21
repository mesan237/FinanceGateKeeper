---
description: Approval checkpoint. Signals that the plan (or the implementation under review) has been accepted and Claude may proceed to the next phase.
---

The user has reviewed and approved the most recent plan or implementation phase.

Behavior:

1. Locate the active full-workflow run (the most recent `/workflows:full:implement` invocation that paused for approval).
2. Resume from the next phase:
   - If paused after **Phase 2 — Plan**, proceed to **Phase 3 — Implement**.
   - If paused after **Phase 3 — Implement** with reviewer findings, proceed to address the findings, then **Phase 4 — Close**.
3. If no full-workflow run is paused, tell the user there's nothing to approve and exit.

This command takes no arguments. It is purely a green light.
