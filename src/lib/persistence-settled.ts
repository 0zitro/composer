// -- Boot-time settled signals ------------------------------------------------
//
// Module-scoped promises that resolve once boot-time writers finish their async
// work. URL-driven import hooks await `persistenceSettled` before mutating the
// project/audio stores, so persistence's restore never clobbers their writes.
//
// `hashImportSettled` mirrors the pattern for `useImportFromHash`: it resolves
// after `runImport` returns (success, failure, or skip). Tests await it to read
// the final stable state without arbitrary delays.
//
// Tests reset the singletons via the `__reset*` helpers so each test starts
// with a fresh pending promise.
//
// linkProjectSettled and queryImportSettled order the ?v= project decision
// before the link's metadata is applied.

let _markPersistenceSettled: () => void = () => {};
let persistenceSettled: Promise<void> = new Promise<void>((resolve) => {
  _markPersistenceSettled = resolve;
});

let _markHashImportSettled: () => void = () => {};
let hashImportSettled: Promise<void> = new Promise<void>((resolve) => {
  _markHashImportSettled = resolve;
});

type LinkProjectOutcome = "none" | "current" | "reopened" | "created" | "failed";

let _markLinkProjectSettled: (outcome: LinkProjectOutcome) => void = () => {};
let linkProjectSettled: Promise<LinkProjectOutcome> = new Promise<LinkProjectOutcome>((resolve) => {
  _markLinkProjectSettled = resolve;
});

let _markQueryImportSettled: () => void = () => {};
let queryImportSettled: Promise<void> = new Promise<void>((resolve) => {
  _markQueryImportSettled = resolve;
});

function getPersistenceSettled(): Promise<void> {
  return persistenceSettled;
}

function markPersistenceSettled(): void {
  _markPersistenceSettled();
}

function getHashImportSettled(): Promise<void> {
  return hashImportSettled;
}

function markHashImportSettled(): void {
  _markHashImportSettled();
}

function getLinkProjectSettled(): Promise<LinkProjectOutcome> {
  return linkProjectSettled;
}

function markLinkProjectSettled(outcome: LinkProjectOutcome): void {
  _markLinkProjectSettled(outcome);
}

function getQueryImportSettled(): Promise<void> {
  return queryImportSettled;
}

function markQueryImportSettled(): void {
  _markQueryImportSettled();
}

function __resetPersistenceSettledForTests(): void {
  persistenceSettled = new Promise<void>((resolve) => {
    _markPersistenceSettled = resolve;
  });
  hashImportSettled = new Promise<void>((resolve) => {
    _markHashImportSettled = resolve;
  });
  linkProjectSettled = new Promise<LinkProjectOutcome>((resolve) => {
    _markLinkProjectSettled = resolve;
  });
  queryImportSettled = new Promise<void>((resolve) => {
    _markQueryImportSettled = resolve;
  });
}

// -- Exports ------------------------------------------------------------------

export {
  getPersistenceSettled,
  markPersistenceSettled,
  getHashImportSettled,
  markHashImportSettled,
  getLinkProjectSettled,
  markLinkProjectSettled,
  getQueryImportSettled,
  markQueryImportSettled,
  __resetPersistenceSettledForTests,
};
export type { LinkProjectOutcome };
