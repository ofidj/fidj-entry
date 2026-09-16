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

Three entry points, split by what they need to run:

| Import                | Needs            | What it holds                                                                  |
| --------------------- | ---------------- | ------------------------------------------------------------------------------ |
| `@ofidj/entry`        | nothing          | **the model**: every rule, and every sentence a person is shown, as plain data |
| `@ofidj/entry/dom`    | a document       | one renderer of that model as HTML strings, and the helpers that drive it      |
| `@ofidj/entry/window` | a browser window | the Fidj window and the answer it relays back                                  |

The root is pure — no DOM, no markup, no view layer. That is deliberate: a
screen is a **value**, so the same entry can be drawn as HTML strings, as React
components or as Vue single-file components, and none of them re-derives a rule
or re-types a sentence.

### On React, Vue, Svelte, or a server

Take the model and render it yourself. Nothing here assumes a browser, so it
works under SSR, in a test, or in a plain Node script.

```tsx
import {
  agreementModel,
  acceptance,
  agreementRequired,
  agreementFromRefusal,
  verificationPending,
  pollVerification,
  signInErrorMessage,
} from "@ofidj/entry";
import { openProviderWindow } from "@ofidj/entry/window";
import "@ofidj/entry/tokens.css";
import "@ofidj/entry/style.css";

function Agreement({ title, agreement, onAccepted }) {
  const [checked, setChecked] = useState(false);
  const screen = agreementModel(title, agreement, { checked });
  return (
    <form
      onSubmit={() =>
        onAccepted(acceptance({ checked, version: screen.version }))
      }
    >
      <h2>{screen.heading}</h2>
      <p className="signin-lead">{screen.lead}</p>
      <p className="fineprint">{screen.versionLabel}</p>
      <div className="agreement-text" tabIndex={0}>
        {screen.text}
      </div>
      <label className="agreement-choice">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
        <span>{screen.checkboxLabel}</span>
      </label>
      <button className="primary" disabled={screen.submitDisabled}>
        {screen.submitLabel}
      </button>
    </form>
  );
}
```

`acceptance()` is the rule `@ofidj/entry/dom` applies to a checkbox, asked of
your own state instead: a tick is evidence only if it was live and only if it
names the version that was displayed. Both callers have to get the same answer,
or the evidence means different things depending on who collected it.

Authentication itself is not here — that is `@ofidj/node`. This package is the
screens and the flow around them.

### On a shell that builds pages out of strings

```ts
import { agreementRequired, agreementFromRefusal } from "@ofidj/entry";
import {
  agreementScreen,
  bindAgreementScreen,
  acceptedAgreement,
} from "@ofidj/entry/dom";
```

`tokens.css` defines every colour, family and radius the product paints with;
nothing else may introduce a literal. `fonts.css` is shipped separately because
each consumer serves its own font files and the `url()`s differ by one path
prefix.

## What is here, and what is not

| Module                                 | What it holds                                                                                                                           |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `model.ts`                             | the refusals and what they mean, the acceptance rule, and a model per screen: entry, agreement, verification wait, account, credentials |
| `remembered.ts`                        | the address this browser remembers, and forgetting it                                                                                   |
| `dom.ts`                               | the HTML renderer, the agreement binding, the folding form, the `fidj@<version>` badge                                                  |
| `provider-window.ts`                   | the Fidj window and the answer it relays back                                                                                           |
| `tokens.css`, `fonts.css`, `style.css` | the design system                                                                                                                       |

Two tests hold the split, and they are the reason it stays true. One exercises
every model function in a file that never loads jsdom and never defines `window`
or `document`. The other asserts the HTML renderer says **what the model says**
and invents nothing — because a sentence able to drift between the two is a
React app and a generated app telling the same person different things, which is
the failure this package exists to end.

Still in `generator-fidj`'s template, and next to move: the Fidj-hosted OIDC
interaction page. It imports `app.config.json` directly, so it moves behind a
config argument rather than verbatim.

## The entry flow

[The workspace README](../README.md#entry-one-flow-the-same-everywhere) defines
it; this package implements it, so every surface gets the same one.

```ts
import {
  pollVerification, // the wait ends by itself when the link is opened
  agreementRequired, // was this refusal "you owe this app its agreement"?
  agreementFromRefusal, // ...and the agreement it refused with
  verificationPending, // was it "nobody has proved this address yet"?
  credentialsModel, // email, password, two buttons, nothing gated
  verificationWaitModel, // the wait a new account owes its address
  agreementModel, // the second screen, and when its submit is live
} from "@ofidj/entry";
import {
  credentialFields,
  verificationWait,
  agreementScreen,
  bindAgreementScreen,
} from "@ofidj/entry/dom"; // ...the same screens, as markup
```

**The API decides, not the screen.** Call `login`, and when it refuses with
`409 agreement_required`, show the agreement screen. A screen that decided for
itself
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

**The wait is not a screen.** `verificationWait` returns a block to put _under_
the credential form, which stays where it is. That is what keeps a mistyped
address correctable: the field is still there, still filled in — correcting it
and creating the account again is the repair, and it reads as one because
nothing moved.

**`pollVerification` treats a failed check as no answer.** A browser that lost
its connection has learned nothing about the address, so the wait continues
rather than reporting anything.

### What went with the old arrangement

`agreementMarkup` and `bindAgreement` are gone. They put the checkbox beside the
credentials and gated the submit on whether the agreement had _loaded_, ticked or
not; the generated shells both render the two screens now, so nothing called
them. `agreementScreen` and `bindAgreementScreen` replace them, and the tick is
what opens the door.

## Release

This package joins [the one release series](../README.md#one-release-series-for-every-ofidj-package)
and publishes from `./dist` when its `package` branch is pushed. It sits after
`@ofidj/contracts` and `@ofidj/node` and before `@ofidj/generator-fidj` in the
dependency chain, because the generator and the console both consume it.
