# @ofidj/entry

The Fidj entry, as a package: the sign-in and account screens, the service
agreement, the provider window and the design system. One implementation, shared
by Fidj's own console, every generated app and mleweb.

Read the [workspace README](../README.md) for the product target and
[AGENTS.md](../AGENTS.md) for the working rules. The flow these screens
implement is [Entry: one flow, the same everywhere](../README.md#entry-one-flow-the-same-everywhere).

## Why it exists

These files used to live only in `generator-fidj`'s template, which meant the
only way to ship them was to generate an app. Fidj's own console was therefore
generated too — `fidj-app` built as a module, wrapped by the generator, published
from `.gen/fidj/www` — and you could not tell from `fidj-app/src` what
`fidj.ovh` actually draws. The alternative, keeping a second Angular copy in
step by hand, is what produced four unguarded copies of the service agreement.

A package is the third answer: the console imports the same code a generated app
renders, so there is one implementation and no hand-porting.

## Use it

```sh
npm install @ofidj/entry
```

```ts
import { providerEntry, bindAgreement, acceptedAgreement } from "@ofidj/entry";
import "@ofidj/entry/tokens.css";
import "@ofidj/entry/style.css";
```

`tokens.css` defines every colour, family and radius the product paints with;
nothing else may introduce a literal. `fonts.css` is shipped separately because
each consumer serves its own font files and the `url()`s differ by one path
prefix.

## What is here, and what is not

Moved, and covered by characterization tests in `test/`:

| Module                                 | What it holds                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `service-agreement.ts`                 | the agreement block and its loading, `providerEntry`'s three shapes, the remembered address, sign-in error wording |
| `provider-window.ts`                   | the Fidj window and the answer it relays back                                                                      |
| `version.ts`                           | the `fidj@<version>` badge                                                                                         |
| `tokens.css`, `fonts.css`, `style.css` | the design system                                                                                                  |

Still in `generator-fidj`'s template, and next to move: the screens inside
`content.ts` — the sign-in entry, `#/forgot`, `#/reset`, `#/verify`, `#/account`
and the Fidj-hosted OIDC interaction page. They import `app.config.json`
directly, so they move behind a config argument rather than verbatim.

**The generator has not switched over yet.** Its template still carries its own
copies and builds from them, so a change made here reaches nobody until that
lands. `test/no-drift-from-the-generator.test.mjs` fails while the two disagree,
and is deleted in the same change that deletes the generator's copies.

## Release

This package joins [the one release series](../README.md#one-release-series-for-every-ofidj-package)
and publishes from `./dist` when its `package` branch is pushed. It sits after
`@ofidj/contracts` and `@ofidj/node` and before `@ofidj/generator-fidj` in the
dependency chain, because the generator and the console both consume it.
