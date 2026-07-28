# Lieflat Charts Audit

- Audited and installed on 2026-07-26 from
  `larashero3-dotcom/lieflat-charts` commit
  `e5b369de1d0d32637093ee62d60bd556cf2c1af4`.
- Installed project-locally at `.agents/skills/lieflat-charts/`.
- Verdict: acceptable for this personal digital-garden workflow, with the
  restrictions below.
- Static review found no credential access, environment-variable access,
  command execution, data exfiltration, browser storage access, obfuscated
  code, symlinks, executable files, or git submodules.
- The repository validator passed before and after installation:
  7 HTML files and 9 text/source files.
- Installed contents were compared with the audited checkout and matched.

## Restrictions

- The repository uses the PolyForm Noncommercial License 1.0.0. Do not use or
  redistribute it for commercial work without separately confirming permission.
- Some templates load ECharts or Chart.js from jsDelivr and Inter from Google
  Fonts. The CDN URLs pin only a major version and do not use Subresource
  Integrity. Do not place sensitive data in a network-dependent chart, and
  prefer vendored/pinned dependencies for trusted or offline deliverables.
- `big-threads.html` assigns an internally generated label to `innerHTML`.
  Current labels are template-controlled, but future adaptations should use
  `textContent` or escaping if labels can contain untrusted user data.

