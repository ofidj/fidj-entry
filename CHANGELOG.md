# Changelog

## [3.27.0] - 2026-10-10

- `profileAvatar(name, email)`: two initials on a hue drawn from the address, the same mark on Fidj and in every app.
- `exitLevelModel`, `exitConductLine` and `exitClassNotice`: the sentences that explain an app's exit class, its rule and the service's conduct, never as a GDPR certification.
- The profile head is compact: the address beside the app's badge, Sign out at the top right, and the Profile title kept for screen readers only.

## [3.26.0] - 2026-10-05

- The 3.26 series; no change to entry behaviour.

## [3.25.0] - 2026-10-04

- `permissionMeanings` / `permissionLines`: one sentence per permission a Fidj client can ask for, drawn by the API's consent page and by Fidj's front end; adds the deletion of the account (`fidj:account.delete`).

## [3.24.0] - 2026-10-04

- Align with the 3.24 series; shared entry behavior remains unchanged.


Earlier versions are described in their commit messages and in the generator's
CHANGELOG, which records each entry release it installs.

## [3.23.0] - 2026-10-04

- No change of its own: the 3.23 series.

## [3.22.0] - 2026-10-04

- The 3.22 series.
- Type floor at 11px (roles, agreement tags, footer, badges, wallet date).
- On a phone, the sign-in form carries the app's masthead and the intro hides
  its own (`.signin-mobile-masthead`).
- A profile mark on the generated app's Profile tab (`.profile-mark`).
- The member card's link reads "Manage every app on Fidj ↗".
