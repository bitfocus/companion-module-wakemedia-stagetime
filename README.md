# companion-module-wakemedia-stagetime

[Bitfocus Companion](https://bitfocus.io/companion) module for [StageTime](https://stagetime.app), the free countdown timer for live events by Wake Media. It drives StageTime's HTTP API and follows the timer live over its event stream.

What the module does and how to configure it: [companion/HELP.md](companion/HELP.md). Release notes: [CHANGELOG.md](CHANGELOG.md).

Requires Companion 4.0 or later and StageTime 1.1 or later for the full feature set.

## Development

- `yarn` installs dependencies.
- `yarn build` compiles once; `yarn dev` recompiles on change.
- `yarn test` builds and runs the checks. With the StageTime source alongside (or `STAGETIME_APP_DIR` set) it also boots the real API and exercises every action.
- `yarn package` builds the `.tgz` that Companion's Modules page can import.
