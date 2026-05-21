#!/usr/bin/env bash
# once.sh — Concatenate every issue file in issues/ into a single string and emit it.
#
# Usage:
#   ./scripts/once.sh                 # prints the full backlog to stdout
#   ./scripts/once.sh > backlog.txt   # save to a file
#   BACKLOG="$(./scripts/once.sh)"    # capture into a variable for prompt injection
#
# The output is wrapped in clear delimiters so an agent can identify each issue.
# Completed issues should be DELETED from issues/ (or moved to issues/done/) so
# this script only ever emits outstanding work. See docs/ARCHITECTURE.md
# "Doc-Rot Prevention".

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ISSUES_DIR="${REPO_ROOT}/issues"

if [[ ! -d "${ISSUES_DIR}" ]]; then
  echo "No issues/ directory found at ${ISSUES_DIR}." >&2
  exit 1
fi

# Find every .md file directly under issues/ISSUE-*/ (one level deep).
# Exclude anything under issues/done/.
shopt -s nullglob

found_any=0
for plan in "${ISSUES_DIR}"/ISSUE-*/implementation-plan.md; do
  found_any=1
  issue_id="$(basename "$(dirname "${plan}")")"
  printf '===== BEGIN %s =====\n' "${issue_id}"
  cat "${plan}"
  printf '\n===== END %s =====\n\n' "${issue_id}"
done

if [[ "${found_any}" -eq 0 ]]; then
  echo "Backlog is empty. Nothing to do." >&2
  exit 0
fi
