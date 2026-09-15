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

## The three-screen flow

[The workspace README](../README.md#entry-one-flow-the-same-everywhere) defines
it; this package implements it, so every surface gets the same one.

```ts
import {
  credentialFields, // screen one: email, password, two buttons, nothing gated
  verificationWait, // screen two: the wait a new account owes its address
  pollVerification, // ...which ends by itself when the link is opened
  agreementRequired, // was this refusal "you owe this app its agreement"?
  agreementFromRefusal, // ...and the agreement it refused with
  agreementScreen, // screen three
  bindAgreementScreen, // whose submit is read-only until the box is ticked
} from "@ofidj/entry";
```

**The API decides, not the screen.** Call `login`, and when it refuses with
`409 agreement_required`, show screen three. A screen that decided for itself
would have to know which version the account already accepted, which is the
API's to know — and an owner publishing a new version is what makes the
question owed again.

**Read the agreement off the refusal.** `agreementFromRefusal` returns the
version and text the API compared against, from `FidjError.details`. Fetching it
again with `GET /apps/:appId` usually gives the same answer and occasionally
not: an owner who publishes between the refusal and the refetch would have
somebody accept text the API is about to call stale. It needs `@ofidj/node`
3.10.2 or later, where `login` stopped rebuilding its error from
`err.toString()` and losing the body; against an older SDK it returns `null` and
the caller falls back to fetching.

**`pollVerification` treats a failed check as no answer.** A browser that lost
its connection has learned nothing about the address, so the wait continues
rather than reporting anything.

### Not this, yet

`agreementMarkup` and `bindAgreement` are the _old_ arrangement — the checkbox
beside the credentials, whose submit opens as soon as the agreement has loaded,
ticked or not. They stay until the generated shells and the console move to the
three screens, and go in the same change that moves them. New code uses
`agreementScreen` and `bindAgreementScreen`.

## Release

This package joins [the one release series](../README.md#one-release-series-for-every-ofidj-package)
and publishes from `./dist` when its `package` branch is pushed. It sits after
`@ofidj/contracts` and `@ofidj/node` and before `@ofidj/generator-fidj` in the
dependency chain, because the generator and the console both consume it.
