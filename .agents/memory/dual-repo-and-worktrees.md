# Dual Repo and Worktree Behavior

- `content/` is a nested git repo (remote `PinkR1ver/Jude.W-s-Knowledge-Brain`)
  **and** the root repo tracks the same files under `content/`. Both sides must
  eventually receive a note change.
- A root-repo worktree has **no `content/.git`**. Consequences that are easy to
  get wrong:
  - `git status` run from `worktree/content/` reports against the **root** repo,
    not the content repo. Do not assume the nested-repo behavior you see in the
    primary working directory.
  - `git worktree list` from that same directory lists the **root** repo's
    worktrees, which looks like a content-repo answer but is not.
- Verified 2026-09-23: root `v4:content/` and the content repo working tree were
  byte-identical (`git show v4:content/...` diffed clean against the content repo
  copy). Practical consequence: author a note once in a root worktree, then copy
  the same files into a content-repo worktree for the canonical commit.
- 2026-09-23: The private notes repo has **two** branches with different roles,
  and it is easy to conflate them:
  - `encrypted-notes` — the default **local checkout** and the branch note PRs
    merge into. Note work targets this branch.
  - `master` — holds **plaintext** for reading/editing in Obsidian. This is also
    GitHub's *default* branch for that repo, which is a misleading signal.
  - Ordinary notes are byte-identical on both; only `secret: true` notes differ,
    and only in the encrypted envelope. `master` holding plaintext is intended,
    not a leak — the repo is private.
  - `.agents/docs/project-overview.md` previously listed only `master` and said
    to push note work there; corrected on 2026-09-23. `origin/HEAD` still points
    at `master`, so do not infer the working branch from it.
- 2026-10-18: Jude's two standing sync rules for this repo:
  1. **Pull the primary working directory to latest** after note work lands on
     `v4`, so Obsidian sees new notes. Check `git status` first — untracked
     files (e.g. vendored skills) do not block a pull but are easy to forget
     when staging later.
  2. **Keep the content repo's two branches in sync.** `encrypted-notes` and
     `master` must end at the same commit. Verify with
     `git rev-list --left-right --count origin/encrypted-notes...origin/master`
     and expect `0  0`.
- 2026-10-18: Corrected an earlier claim here. I had recorded that `master`
  lagged `encrypted-notes` by 4 commits. Re-checked against the **remote**, both
  were at `84315de` (0/0) — the divergence I saw was stale local data, and
  note PRs do merge plaintext copies forward to `master`. Do not infer branch
  drift from local refs alone; compare against `origin/`.
