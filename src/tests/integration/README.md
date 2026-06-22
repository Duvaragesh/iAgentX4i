# Integration Tests

These tests run against a **live IBM i system**. They are skipped by default.

## How to run

Set the environment variable `IBMI_INTEGRATION=1` before running the test suite:

```bash
# Windows PowerShell
$env:IBMI_INTEGRATION="1"; npm run test:int

# Windows cmd
set IBMI_INTEGRATION=1 && npm run test:int

# macOS/Linux
IBMI_INTEGRATION=1 npm run test:int
```

## Prerequisites

- **Code for IBM i** VS Code extension installed and active
- An IBM i connection already established in VS Code
- The test user must have `*USE` authority to QSYS2 catalog views

## What they test

Each test file connects to the real system and validates that:
- `runSql` can execute a simple SELECT against QSYS2
- `connectionStatus` returns a live host/user/osVersion
- `listSourceMembers`, `listObjects`, `getLibraryList` return real rows
- `searchSourceMembers` queries SYSTOOLS (or falls back gracefully)

Integration tests **do not write or modify** any IBM i objects.
