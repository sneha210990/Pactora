# Pactora - task brief for Claude Code: add the legal disclaimer to the live product

Counsel has required a disclaimer making clear that users should see a lawyer.
The exact, counsel-approved wording is:

> Pactora flags issues to discuss with a lawyer - it's not legal advice. Speak to a qualified lawyer before you sign.

This wording is fixed. Do not paraphrase, shorten, or reword it - it has been
signed off as-is. Use it verbatim everywhere.

## Where it must appear

This runs in the live Next.js app (pactora.vercel.app), not the rules-engine
repo. Place the disclaimer on every surface where a user sees a risk result or is
about to act on one:

1. **Free IP clause scanner - result screen.** This is the highest priority: it's
   the no-sign-up entry point and the place a stranger first acts on a Pactora
   output. The disclaimer must be visible on the result itself, not only in a
   footer.
2. **Near the email-capture point on the free scanner.** A user handing over their
   email after seeing a result is the moment they're most likely to treat the
   output as advice. The line should be visible there.
3. **Full contract review output** (paid tiers) - on the results/report view.
4. **Site-wide footer** as a persistent backstop, in addition to the above - not
   instead of them.

## How to place it (conventions)

- Use the exact string above. Define it once as a shared constant (e.g.
  `LEGAL_DISCLAIMER` in a constants module) and import it everywhere, so the four
  surfaces can never drift apart. This matters: counsel will re-review, and three
  slightly different versions is exactly what gets flagged.
- Match the existing brand: minimal, black (#0a0a0a) aesthetic, system
  sans-serif, no icons or colour accents. The disclaimer should be legible and
  clearly separated from the risk findings, not buried in fine print - but it
  should not look like an alert box either. A clear line above or below the
  result, in normal-weight body text, is right.
- House voice rules apply to any surrounding microcopy you add: British English;
  hyphens, never em dashes; avoid "genuinely", "honestly", "straightforward".
- The existing trust line ("Your documents are never stored or used for
  training.") stays where it is. The new disclaimer is separate and additional;
  do not merge or replace it.

## Verify
- The exact string appears on: the free scanner result, near email capture, the
  full review output, and the site footer.
- It is a single shared constant, imported in all four places (grep for the
  constant name; there should be one definition and four-plus usages).
- Nothing about document storage or the existing trust line changed.
- Build passes and the line renders on each screen (check the scanner result in
  particular, since that's the one that matters most for liability).

## Do not
- Do not reword the approved sentence.
- Do not add legal claims beyond it (no "by using this you agree...", no implied
  terms of service - that's a separate counsel question, not this task).
- Do not gate the scanner behind the disclaimer (no "click to accept"); it is a
  visible notice, not a consent wall.
