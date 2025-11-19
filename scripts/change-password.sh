#!/bin/bash

# Change Global Password CLI Script
# Usage: bash scripts/change-password.sh

cd "$(dirname "$0")/.."
npm run cli:change-password
