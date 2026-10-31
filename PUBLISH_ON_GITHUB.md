# Publishing / maintaining the public PCS repository

The canonical public PCS distribution is https://github.com/ntdung-tds/pcs-universal.

## For future releases

1. Update source/docs/adapters, including `README.md`, `PROMPT.md` and `START_HERE.md` only as needed.
2. Check that there are **no secrets or private user/project materials**, including in archives and Git history.
3. Run `node --test tests/*.test.mjs`, `node tools/pcs-security-audit.mjs --root=.`, and `python VERIFY_PACKAGE.py`.
4. Update `MANIFEST.sha256` for changed files, and verify the package before publishing.
5. Publish through a reviewed commit or PR; review GitHub Actions and verify direct public URLs for all entrypoints.
6. Keep private intake/state repositories private; do not enable private-intake templates as Actions on this public reference repository.

A published public repo is a **distribution of the PCS toolkit**, not an automatic access grant to GitHub/Drive for any AI.
