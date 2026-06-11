# Load-test results

Put your committed run write-ups here.

- **Raw dumps** (`*.json` from `--summary-export` / `--out json`, `*.csv`) are
  **git-ignored** — they're large and machine-only.
- **Run write-ups** — copy `RESULT_TEMPLATE.md` to a dated file, paste the k6
  summary into it, and **commit it**. These are what feed thesis Chapter 5.

Example:
```bash
cp results/RESULT_TEMPLATE.md results/2026-06-12-public-read-load.md
# ...fill it in from your k6 output...
git add results/2026-06-12-public-read-load.md && git commit -m "load-tests: public-read load run 2026-06-12"
```
