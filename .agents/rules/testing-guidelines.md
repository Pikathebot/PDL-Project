# Testing & Test Runner Guidelines

## Vitest & Playwright Separation
When both Vitest and Playwright co-exist in a frontend codebase:
- Vitest configuration (`vite.config.js` or `vitest.config.js`) MUST include an explicit `test.include` filter (e.g., `['src/tests/**/*.{test,spec}.{js,jsx}']`).
- Never allow Vitest default globs to scan `tests/e2e/` or Playwright `*.spec.js` files.

## Windows PowerShell Test Execution
- When executing Python tests in Windows PowerShell, set `PYTHONPATH` and use the virtual environment executable:
  `$env:PYTHONPATH="."; .\.venv\Scripts\python.exe -m pytest`
