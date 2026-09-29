"""The composition's version rules: where each component's version is read.

`0003` §4.7: one decorated function per component, handed that component's **payload** and answering
a PEP 440 version. `release` takes no version because this file reads one -- a number passed on the
command line could disagree with the content it names, and a reading cannot.

The convention: **every component writes its version at `component.json` in its own first region**,
beside the code the version is a version of. Each region is the component's own directory -- `domain`
owns `src/domain`, `views` owns `src/views` -- so the file stating a version is part of the content
it describes, and a cone that moves takes its version with it.

Why the *first* region, and not any of them: a version is read from one region's subtree
(`versions.py`), and that region is `first_region()` -- so a rule sees only that subtree, never the
placed path and never the repository. The consequence to plan around: nothing outside the payload is
reachable, so there is no reading a project-wide version here. That is why this repository's single
`package.json` cannot answer for a component, and why each component carries a `component.json` of
its own.

A rule runs in a sandbox: a wall clock, a memory bound, a payload it cannot write, no `GIT_*`
handle, no home, and no repository view -- so this file reads the payload it was handed and nothing
else. `Version` is `packaging.version.Version` re-exported unwrapped, so PEP 440's grammar is the
only rule here: `0.1.0`, `1.0.0rc1` and `2.0.post1` are versions, and so is `1.5` -- the field
guide's claim that `1.5` is not one does not hold in 0.53.0. What does hold, and bites: trailing
zeros are equal, so `Version("1.5") == Version("1.5.0")` and a manifest bumped from `0.1` to `0.1.0`
is refused as not increasing. **Write three release segments, always.**
"""

# pyright: reportUnusedParameter=false
# Every rule takes `context` because the evaluator calls one by keyword -- `function(payload=payload,
# context=context)` -- so a rule that never reads it is following the protocol rather than forgetting
# an argument. No other parameter in this file is unused.

from __future__ import annotations

import json
from pathlib import Path
from typing import cast

from git_churchill_composer import Version, pkgver

MANIFEST = "component.json"
"""Where a component writes its version: the root of its own first region."""


def version_of(payload: Path) -> Version:
  """The version the component writes in the region this rule was handed."""
  manifest = payload / MANIFEST
  if not manifest.is_file():
    raise FileNotFoundError(
      f"no {MANIFEST} in this component's first region: {MANIFEST} is where its version is written"
    )

  declared = cast("dict[str, object]", json.loads(manifest.read_text(encoding="utf-8")))
  stated = declared.get("version")
  if not isinstance(stated, str):
    raise ValueError(f"{MANIFEST} states no version string: {manifest.name}")  # noqa: TRY004

  return Version(stated)


# -- The layers of the app ----------------------------------------------------
#
# One rule per component declared in `.churchill/components.kdl`, and the names must agree: a
# component with no rule refuses by name, `[binds-no-derivation]`, which is the refusal that caught
# this file when the declaration named the app's layers rather than the four feature-shaped
# components the first reconnaissance proposed.


@pkgver(name="domain")
def domain_version(payload: Path, context: dict[str, str]) -> Version:
  """The pure layer: line, word, sync and selection logic, importing no store and no view."""
  return version_of(payload)


@pkgver(name="utils")
def utils_version(payload: Path, context: dict[str, str]) -> Version:
  """Shared helpers and timing math, with no React and no store."""
  return version_of(payload)


@pkgver(name="stores")
def stores_version(payload: Path, context: dict[str, str]) -> Version:
  """The zustand state: project, audio, settings, the shortcut bindings, the modal stack."""
  return version_of(payload)


@pkgver(name="hooks")
def hooks_version(payload: Path, context: dict[str, str]) -> Version:
  """The React hooks that bind stores to views: persistence, sync gestures, shortcuts, preview."""
  return version_of(payload)


@pkgver(name="views")
def views_version(payload: Path, context: dict[str, str]) -> Version:
  """The tab views: import, edit, languages, sync, timeline, preview, export."""
  return version_of(payload)


@pkgver(name="ui")
def ui_version(payload: Path, context: dict[str, str]) -> Version:
  """The primitives, the settings modal, and the in-editor help sections."""
  return version_of(payload)
