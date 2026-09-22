# companion-module-wakemedia-stagetime

[Bitfocus Companion](https://bitfocus.io/companion) module for [StageTime](https://stagetime.app), the free countdown timer for live events by Wake Media.

It talks to StageTime's built-in HTTP API and subscribes to its event stream, so button feedback and variables follow the timer live. See [companion/HELP.md](companion/HELP.md) for what the module can do and how to configure it, and [CHANGELOG.md](CHANGELOG.md) for release notes.

## Getting started

Executing a `yarn` command should perform all necessary steps to develop the module, if it does not then follow the steps below.

The module can be built once with `yarn build`. This should be enough to get the module to be loadable by Companion.

While developing the module, by using `yarn dev` the compiler will be run in watch mode to recompile the files on change.

`yarn package` builds `wakemedia-stagetime-<version>.tgz`, which Companion's Modules page can import.

## Tests

`yarn test` builds the module, boots StageTime's real HTTP API against a stubbed Electron (it looks for the StageTime source in `../` or `$STAGETIME_APP_DIR`), and fires every action at it. Without the StageTime source it checks the definitions only.

## Requirements

Companion 4.0 or later. StageTime 1.1 or later for the full feature set; the core timer, preset and message controls also work with StageTime 1.0.
