#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

# name              dev api-docs URL                                                                             output path
APIS="
adjustmentsApi            https://adjustments-api-dev.hmpps.service.justice.gov.uk/v3/api-docs                   server/@types/adjustmentsApi/index.d.ts
calculateReleaseDatesApi  https://calculate-release-dates-api-dev.hmpps.service.justice.gov.uk/v3/api-docs       server/@types/calculateReleaseDatesApi/index.d.ts
courtCasesReleaseDatesApi https://court-cases-release-dates-api-dev.hmpps.service.justice.gov.uk/v3/api-docs     server/@types/courtCasesReleaseDatesApi/index.d.ts
courtDataIngestionApi     https://court-data-ingestion-api-dev.hmpps.service.justice.gov.uk/v3/api-docs          server/@types/courtDataIngestionApi/index.d.ts
courtRegisterApi          https://court-register-api-dev.hmpps.service.justice.gov.uk/v3/api-docs                server/@types/courtRegisterApi/index.d.ts
documentManagementApi     https://document-api-dev.hmpps.service.justice.gov.uk/v3/api-docs                      server/@types/documentManagementApi/index.d.ts
manageOffencesApi         https://manage-offences-api-dev.hmpps.service.justice.gov.uk/v3/api-docs               server/@types/manageOffencesApi/index.d.ts
prisonRegisterApi         https://prison-register-dev.hmpps.service.justice.gov.uk/v3/api-docs                   server/@types/prisonRegisterApi/index.d.ts
prisonerSearchApi         https://prisoner-search-dev.prison.service.justice.gov.uk/v3/api-docs                  server/@types/prisonerSearchApi/index.d.ts
remandAndSentencingApi    https://remand-and-sentencing-api-dev.hmpps.service.justice.gov.uk/v3/api-docs         server/@types/remandAndSentencingApi/index.d.ts
"

usage() {
  cat <<EOF
Usage: $(basename "$0") [--all | <api-name>]

Regenerates server/@types/*/index.d.ts from each service's live dev OpenAPI docs.

  --all           regenerate every API listed below
  <api-name>      regenerate just one, e.g. courtDataIngestionApi
  -h, --help      show this help

Known API names:
EOF
  awk '{print "  " $1}' <<< "$APIS" | grep -v '^  $'
}

if [ "$#" -eq 0 ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
  usage
  exit 0
fi

if [ "$1" = "--all" ]; then
  target=""
else
  target="$1"
fi

found=false
failed=""

while read -r name url out; do
  [ -z "${name:-}" ] && continue
  if [ -n "$target" ] && [ "$target" != "$name" ]; then
    continue
  fi
  found=true

  echo "==> $name"
  mkdir -p "$(dirname "$out")"

  npx openapi-typescript "$url" \
    | sed "s/\"/'/g" \
    | sed "s/;//g" \
    > "$out"

  if ! npx prettier --write --ignore-path /dev/null "$out"; then
    echo "    ! prettier --write failed on $out, formatting may be wrong" >&2
    failed="$failed $name"
    continue
  fi

  if grep -q "$(printf '\t')" "$out"; then
    echo "    ! tab characters found in $out after eslint --fix, check manually" >&2
    failed="$failed $name"
    continue
  fi

  echo "    written to $out"
done <<< "$APIS"

if [ -n "$target" ] && [ "$found" = false ]; then
  echo "No API named '$target'." >&2
  usage >&2
  exit 1
fi

if [ -n "$failed" ]; then
  echo "" >&2
  echo "Failed or suspect:$failed" >&2
  exit 1
fi