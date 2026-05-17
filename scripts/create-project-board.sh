#!/usr/bin/env bash
# Run this locally with `gh` CLI authenticated to sneha210990.
# Creates the "Pactora Roadmap" GitHub Projects v2 board and populates all issues.
#
# Prerequisites:
#   brew install gh jq
#   gh auth login
#
# Usage:
#   chmod +x scripts/create-project-board.sh
#   ./scripts/create-project-board.sh

set -euo pipefail

OWNER="sneha210990"
REPO="Pactora"
PROJECT_TITLE="Pactora Roadmap"

# ── Helpers ──────────────────────────────────────────────────────────────────

die() { echo "ERROR: $*" >&2; exit 1; }

require() {
  command -v "$1" &>/dev/null || die "'$1' not found. Install it and re-run."
}

gql() {
  # Thin wrapper: gh api graphql -f query='...' [extra args]
  gh api graphql "$@"
}

# ── Pre-flight ────────────────────────────────────────────────────────────────

require gh
require jq
gh auth status &>/dev/null || die "Not authenticated. Run: gh auth login"

echo "=== Pactora Roadmap — project board setup ==="
echo ""

# ── 1. Create the project ────────────────────────────────────────────────────

echo "[1/5] Creating project..."

PROJECT_NUM=$(gh project create \
  --owner "$OWNER" \
  --title "$PROJECT_TITLE" \
  --format json | jq -r '.number')

echo "      Project #$PROJECT_NUM created."

# Fetch the node ID needed for GraphQL mutations
PROJECT_ID=$(gh project view "$PROJECT_NUM" \
  --owner "$OWNER" \
  --format json | jq -r '.id')

echo "      Node ID: $PROJECT_ID"

# ── 2. Create the Phase field ─────────────────────────────────────────────────

echo ""
echo "[2/5] Creating 'Phase' single-select field..."

# em dash: U+2014
PHASE_FIELD_RESPONSE=$(gql -f query='
  mutation($pid: ID!) {
    createProjectV2Field(input: {
      projectId: $pid
      dataType: SINGLE_SELECT
      name: "Phase"
      singleSelectOptions: [
        { name: "Phase 0 — Ship",      color: RED,    description: "MVP — must ship before any users" }
        { name: "Phase 1 — First 20",  color: ORANGE, description: "Features for first 20 customers" }
        { name: "Phase 2 — Growth",    color: YELLOW, description: "Scale features" }
        { name: "Phase 3 — Team",      color: GREEN,  description: "Team / collaboration features" }
        { name: "Phase 4 — Platform",  color: BLUE,   description: "Platform & API layer" }
      ]
    }) {
      projectV2Field {
        ... on ProjectV2SingleSelectField {
          id
          options { id name }
        }
      }
    }
  }
' -f pid="$PROJECT_ID")

PHASE_FIELD_ID=$(echo "$PHASE_FIELD_RESPONSE" | \
  jq -r '.data.createProjectV2Field.projectV2Field.id')

echo "      Field ID: $PHASE_FIELD_ID"

# Cache option IDs
get_opt() {
  local name="$1"
  echo "$PHASE_FIELD_RESPONSE" | \
    jq -r --arg n "$name" \
    '.data.createProjectV2Field.projectV2Field.options[] | select(.name==$n) | .id'
}

OPT_P0=$(get_opt "Phase 0 — Ship")
OPT_P1=$(get_opt "Phase 1 — First 20")
OPT_P2=$(get_opt "Phase 2 — Growth")
OPT_P3=$(get_opt "Phase 3 — Team")

# Verify we got the option IDs (fallback: re-fetch)
if [[ -z "$OPT_P0" ]]; then
  echo "      Fetching option IDs via field-list..."
  FIELD_LIST=$(gh project field-list "$PROJECT_NUM" --owner "$OWNER" --format json)
  OPT_P0=$(echo "$FIELD_LIST" | jq -r '.fields[] | select(.name=="Phase") | .options[] | select(.name | startswith("Phase 0")) | .id')
  OPT_P1=$(echo "$FIELD_LIST" | jq -r '.fields[] | select(.name=="Phase") | .options[] | select(.name | startswith("Phase 1")) | .id')
  OPT_P2=$(echo "$FIELD_LIST" | jq -r '.fields[] | select(.name=="Phase") | .options[] | select(.name | startswith("Phase 2")) | .id')
  OPT_P3=$(echo "$FIELD_LIST" | jq -r '.fields[] | select(.name=="Phase") | .options[] | select(.name | startswith("Phase 3")) | .id')
fi

# ── 3. Find the Status field and its "Done" option ────────────────────────────

echo ""
echo "[3/5] Locating 'Status' field..."

FIELD_LIST=$(gh project field-list "$PROJECT_NUM" --owner "$OWNER" --format json)
STATUS_FIELD_ID=$(echo "$FIELD_LIST" | jq -r '.fields[] | select(.name=="Status") | .id')
DONE_OPT_ID=$(echo "$FIELD_LIST" | \
  jq -r '.fields[] | select(.name=="Status") | .options[] | select(.name=="Done") | .id')

echo "      Status field: $STATUS_FIELD_ID  |  Done option: $DONE_OPT_ID"

# ── 4. Add issues and set Phase ───────────────────────────────────────────────

echo ""
echo "[4/5] Adding issues..."

ISSUE_URL_BASE="https://github.com/$OWNER/$REPO/issues"

add_issue() {
  local num="$1"
  local phase_opt="$2"
  local extra_label="${3:-}"

  echo -n "      #$num → adding..."

  ITEM_ID=$(gh project item-add "$PROJECT_NUM" \
    --owner "$OWNER" \
    --url "$ISSUE_URL_BASE/$num" \
    --format json | jq -r '.id')

  # Set Phase
  gh project item-edit \
    --project-id "$PROJECT_ID" \
    --id "$ITEM_ID" \
    --field-id "$PHASE_FIELD_ID" \
    --single-select-option-id "$phase_opt" &>/dev/null

  # Optionally mark Done
  if [[ "$extra_label" == "done" && -n "$STATUS_FIELD_ID" && -n "$DONE_OPT_ID" ]]; then
    gh project item-edit \
      --project-id "$PROJECT_ID" \
      --id "$ITEM_ID" \
      --field-id "$STATUS_FIELD_ID" \
      --single-select-option-id "$DONE_OPT_ID" &>/dev/null
    echo " done ✓"
  else
    echo " done"
  fi
}

echo "      --- Phase 0 — Ship ---"
add_issue 1  "$OPT_P0" "done"   # MVP-01 (mark Done)
add_issue 2  "$OPT_P0" "done"   # MVP-02 (mark Done)
add_issue 6  "$OPT_P0"          # MVP-06 Deploy to Vercel (already closed)
add_issue 3  "$OPT_P0"          # MVP-03 Cross-Clause Engine

echo "      --- Phase 1 — First 20 ---"
add_issue 76 "$OPT_P1"          # AI-02 Multi-turn chat
add_issue 77 "$OPT_P1"          # AI-03 Redline generation

echo "      --- Phase 2 — Growth ---"
add_issue 78 "$OPT_P2"          # AI-04 Vision / scanned PDFs
add_issue 79 "$OPT_P2"          # AI-05 Batch API

echo "      --- Phase 3 — Team ---"
add_issue 80 "$OPT_P3"          # AI-06 Haiku pre-classification

# ── 5. Summary ────────────────────────────────────────────────────────────────

echo ""
echo "[5/5] All done!"
echo ""
echo "  Project board URL:"
echo "  https://github.com/users/$OWNER/projects/$PROJECT_NUM"
echo ""
echo "  Board view tip: open the project, click + Add view → Board,"
echo "  then group by 'Phase' to see the 5 columns."
