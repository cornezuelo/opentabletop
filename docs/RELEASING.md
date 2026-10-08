# Releasing

How a version of OpenTabletop is made and published. Agreed with the author on 2026-10-09; the first release (`0.1.0`, the alpha) is tagged once the apps have been tried by hand.

## Versions

- **One version for the whole repository** (semver), in the root `package.json`: the apps, the libraries and the bundled packs' code are released together. The libraries are consumed as source inside the repo; they get versions of their own only when they're published to npm (see the backlog).
- **Packs keep their own `version`** in `pack.yaml`: it versions their content (bundled pack updates compare files, not this number), and changes when their content does.
- While `0.x`: a **minor** (`0.2.0`) for new features or any change of a persisted format (maps, trips, pack syntax: always with a migration, so older files keep opening); a **patch** (`0.1.1`) for fixes only. From `1.0.0`, a **major** when a format can no longer be migrated or a pack's meaning changes.
- `0.x` releases are marked as **pre-releases** on GitHub.

## The changelog

[`CHANGELOG.md`](../CHANGELOG.md), in [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) style. Work lands under **Unreleased** as it's done (what a user notices: apps, packs, formats, fixes), grouped by **Apps**, **Packs**, **Formats** and **Fixes**. A release renames that section to `## [X.Y.Z] - YYYY-MM-DD` and opens a new empty **Unreleased** above it. The release workflow publishes that section as the release notes, and fails if it's missing.

## Making a release

1. `make verify` and `make site` pass locally (and CI is green on `main`).
2. In `CHANGELOG.md`, rename **Unreleased** to `## [X.Y.Z] - YYYY-MM-DD` and add an empty `## [Unreleased]` above it.
3. `npm version X.Y.Z --no-git-tag-version` (updates `package.json` and the lockfile).
4. Commit (`Release vX.Y.Z`), then tag it: `git tag -a vX.Y.Z -m "OpenTabletop vX.Y.Z"`.
5. Push the commit and the tag: `git push origin main vX.Y.Z`.

The tag starts the **Release** workflow ([`.github/workflows/release.yml`](../.github/workflows/release.yml)), from a clean clone:

- checks the tag matches `package.json`, runs `make verify` and `make site`, and makes sure no personal-use pack is in `dist/`;
- creates the GitHub release with the notes of that version and `opentabletop-vX.Y.Z.zip` (the whole site: unzip and serve it from any folder, the builds use relative URLs);
- publishes the same site on **GitHub Pages**.

One-time setup on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**. Pages needs the repository to be public (on GitHub's free plan): it stays private until `0.1.0` and is made public when that version is released.

We work on `main` only, with tags for releases: no release branches or pull requests while the project has one author.

## Personal-use packs never ship

Releases are built from a clean clone, which has no `packs-private/`: the apps' builds leave personal-use packs out and fail if anything still loads one (`vite.packs.ts`), and the workflows look for the private Kal-Arath licence line in `dist/` before publishing. `make serve` builds for your machine into `dist-local/`, which is never published.

## Continuous integration

Every push to `main` and every pull request runs **CI** ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) from a clean clone on Node 22 and 26: `make verify` (lint, types, tests), `make site` and the same personal-use check. The built site is kept as an artifact for a week.
