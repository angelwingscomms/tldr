# tldr blocked at deploy.live_walk

when: 2026-08-08T21:26:26.790Z
head: 5908671
why: deployed, ten-point live walk pending

## the step

- deploy: ship it and prove it live

VERIFY LIVE WITH THE agent-browser SKILL — not by reading code, not by trusting the deploy log. Walk the whole thing on the deployed url and confirm each with your own eyes: (1) the homepage loads and a device session cookie is set on first visit; (2) pasting a paragraph of text with a saved provider streams a summary in and stores it; (3) the `download .md` button produces a file with the h1/tl;dr/key-points shape; (4) the same link submitted twice returns instantly the second time and the response carries `x-tldr-cache: 1`; (5) search finds a word from inside a stored summary body, not just its title; (6) the share toggle makes `/s/[id]` load in a logged-out context and turning it off makes it 404; (7) google login upgrades the guest account in place and the guest's earlier summaries are still listed afterwards; (8) a Paystack test-mode purchase moves the balance; (9) load the unpacked extension, right-click a video and a page and a text selection, and confirm each opens a real summary; (10) open the popup, log in inside it, close and reopen it, and confirm it is still logged in.

Fix whatever that walk uncovers before marking this step done.

THIS STEP IS NOT MACHINE-CHECKABLE AND NOT YOURS TO ATTEMPT. It needs real eyes, a real google account, a real paystack test card and a browser that can load an unpacked extension. If you are an unattended executor: run `plan tldr deploy.live_walk --block "deployed, ten-point live walk pending"` immediately and stop. Do not mark it. Do not fake it. The planner picks it up from plan/tldr.blocked.md.

## v

```
grep -q 'tldr' wrangler.jsonc
```

## t

```
-
```

## next

planner: amend plan/tldr.plan.json, then delete this file.