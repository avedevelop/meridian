---
name: run-tests-for-file
description: Run Vitest tests for a specific component or file in Meridian. Usage: /run-tests-for-file <ComponentName>
---

Run the Vitest test suite filtered to the component or file name provided.

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run test -- --reporter=verbose "$ARGUMENTS" 2>&1
```

If no argument is given, run the full test suite:
```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run test -- --reporter=verbose 2>&1
```

Show the test results clearly — pass/fail counts and any failure details.

Arguments: $ARGUMENTS
