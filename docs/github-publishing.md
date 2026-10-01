# GitHub publishing on this Mac

Verified on 2026-10-01: branch `codex/sms-three-hour-retry` was pushed from Codex,
then a fresh `git push` succeeded without requesting a username or password.

This checkout uses the installed Git Credential Manager bundled with GitHub
Desktop. Its GitHub login is stored in macOS Keychain. The helper and username
are configured in this repository's local Git configuration, not committed.
No token is stored in the repository, remote URL or documentation.

Routine publishing:

```sh
git status --short
git fetch origin
git push
```

For a new local branch, use `git push -u origin HEAD`. Using HEAD avoids a
misspelled or nonexistent branch ref. Fetch and reconcile divergent branches;
do not force push to resolve a normal remote update.

If publishing fails:

- `Could not resolve host`: first check this chat's network permissions. The
  Settings toggle only exposes permission modes; select a mode beneath the
  composer. Do not change credentials to fix a sandbox network denial.
- `could not read Username/Password`: check the repository's credential helper
  and sign in again through Git Credential Manager if necessary. GitHub account
  passwords do not authenticate HTTPS Git pushes.
- On a different Mac or new clone, repeat local credential-manager setup and
  login. Git intentionally does not transfer authentication through a clone.
- Removing GitHub Desktop, revoking its bundled credential manager's OAuth
  authorization, or a locked Keychain can require renewed login/configuration.

GitHub publishing is distinct from production deployment. Verify the merged
main commit and Vercel production readiness before reporting a change as live.
