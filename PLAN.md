# ARA web-full: plan

Date: 2026-10-14. Asked for: a web version of the prototype with 100% of the iPhone coverage, plus carousels and marketing components, in its own folder. Scope W0 (legacy web in the coverage map) and W1 (web parity) from `../WEB-ANALYSIS.md`.

## Decisions

| Question | Decision |
|---|---|
| Where | `web-full/` is the hand-written web source from now on, started as a copy of `web/`. `web/` stays as the 1013 baseline, unchanged except for its generated data files. |
| Self-contained | Like `mobile-full/`: `index.html` loads nothing outside the folder. `_src/build.mjs` writes its data and icons, and copies the presenter (`js/presenter.js`) and the manuals (`manuals/`) in. |
| What "100% of mobile coverage" means | Every state captured from `mobile-full` (174 named captures in `_src/subset-screens.mjs`) has a web twin with the same scenario and name, captured from `web-full` by `_src/web-screens.mjs`. A state the phone draws natively gets its web equivalent (iOS push alert = the browser's notification prompt; iOS keyboard = the focused field; menu sheet = the rail). The capture script fails on any iPhone state with no twin. |
| Where the checks live | `routes.json` `w` routes point at `web-full`; `test.mjs`, `walk-test.mjs` and the hub use it. `verify.mjs` gains the web captures and web-full consistency checks. |
| Rules kept | 1 persona (Sarah), JLG and Skyjack live, no invented photos (hatched grey placeholders), no "demo" wording, 12px text floor, blue focus, no em dashes, numerals, 1 file per view, runs from file://. |

## W1: web twins of the 20 mobile-only review states

| Mobile state | Web twin | Work |
|---|---|---|
| Menu sheet | Rail (and the drawer under 1024) with the new rows | Rail gains Recommended Parts, Knowledge Base, Scan Asset Tag |
| Push permission | Desktop notifications prompt after the first sign in, then the browser's permission bubble | `home?push=1`, `home?push=alert` |
| News & Bulletins, Knowledge Base search types | 6 type tabs on search, rows open the item | search core ported from mobile (done), results tables |
| Voice search | Microphone in the search field, permission, listening, words heard | `search?voice=ask|1|2` |
| Recommended, medium | New view `recommended` | port |
| Part comments, branch currency | Part page: comments section, MXN at Monterrey | port |
| Cart actions | Cart "More" menu: save as list, share (copy link), export CSV (real download) | port |
| Cancelled filter, cancelled order | Orders filter Cancelled; order page shows the reason | port |
| Work order not found | `work-order?id=999999` empty state | port |
| News notices, milestone, team visit | Notifications filter News; new view `notice` with Add to Calendar | port |
| Knowledge Base, recall, how-to | New views `kb`, `article` | port |
| Scan asset tag (found, unknown) | New view `scan`: camera viewfinder or a USB scanner typing into a field | port, web form |
| New list | `lists?dialog=new` | check, route |

Plus every capture-level twin (sign-in field focus, Home approval cards with Approve in place, sign-out confirmation, location Monterrey, filter dialog states, wo-new dialog states, manual thumbnails, presenter).

## Marketing and carousel kit (web extras, branch M)

1 carousel component (`SE.ui.carousel` in `js/kit.js`, styles in `css/marketing.css`): slides, previous and next, dots, keyboard arrows, swipe, autoplay that pauses on hover, focus and hidden tabs, off under reduced motion and capture, ARIA carousel pattern.

| # | Component | Where |
|---|---|---|
| M1 | Updates hero carousel: recall, bulletin, new feature, team visit | Home |
| M2 | Announcement banner (a recall), dismissible for the session | every page |
| M3 | Product highlights carousel beside the sign-in card | Sign in, 1024 and up |
| M4 | What's new tour (3 slides) after sign in, also from the account menu | dialog |
| M5 | Recommended-for-your-fleet carousel; Often ordered together on the part page | Home, part |
| M6 | Supplier network: 2 connected, 6 to request | Catalog, Home |
| M7 | Early access promo for Diagnostics | Home, rail |
| M8 | Featured articles carousel | Knowledge Base |

Copy comes from the seed (`marketing` in `_src/seed.json`); images are hatched placeholders or brand-colour type compositions.

## W0: legacy web in the coverage map

`LEGACY_WEB` (92 screens of Ash's web prototype) in `_src/coverage-map.mjs`, each with status and the web captures that show it (`web:B3/checkout`) or a Pivot Guidelines rule. Report gains the legacy web section, the mobile-parity table and the marketing extras, with legacy web thumbnails rendered from `1006/analysis/web/screens/*.svg`.

## Order

1. Pipeline: build, presenter and manuals copy, hub, test, walk-test, verify, web-screens.
2. Seed: `marketing`.
3. W1 views and edits, then the marketing kit.
4. Routes, walkthroughs, web captures.
5. W0 map, report, thumbnails.
6. Full gate: `node _src/verify.mjs`.

## Follow-up, same day: supervisor desk W2 to W6

Built in web-full as branch D (web only, like M): cart review (W2), branch stock and transfer orders (W3), work order table and header edits (W4), approval reasons and approver line edits (W5), needed-by advice and the due-date guard (W6). Rules in `js/desk.js`. 18 captures in `screens/D`; `LEGACY_WEB` rows 17, 18, 20, 22, 23, 24, 27, 30, 44, 45 cite them, and the report lists them under "supervisor desk" (`DESK` in `_src/coverage-map.mjs`).
