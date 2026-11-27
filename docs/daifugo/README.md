# ZERO DAIFUGO — standalone prototype
No money, no credits, no redemption. Nothing changes the main ZERO ORIPA games.
 
## Rules
Four players, eight cards each, 52-card deck, 20 cards unused. Fixed hands and starting seat. 1–4 same rank cards, four triggers revolution, 8 cuts; matching exact suit sets on consecutive plays locks that set. Pass is legal only with nonempty field and persists until reset. After third finisher, last seat is fourth. No special forbidden finish rules. CPU chooses the largest playable group, then weakest legal rank, then lowest suit mask; only passes if no move. No RNG after dealing.

## Verification
`node test.mjs` checks rules and recomputes every proof. DFS explores every legal player move, including pass, and the fixed CPU choice. No pruning on presumed rank; memoization merges identical states. Exact reachable rank set is returned, not sampled. A budget-exhausted state is unverified and rejected. Search stops once player's rank is known, since subsequent moves cannot change it. Rule/CPU changes invalidate the bank. Current bank: 156 (39/39/39/39); 39 exact player-hand groups each cover all four rank classes. There are 21 distinct rank-pattern families: 2 original patterns with suit permutations plus 19 new one-card rank mutations, reverified for each class. CPU deals and starting seats vary between classes. All stored scenes require a real reachable player two-card play and an 8-cut on one legal route, independent of the exact rank verification. Counts are per scenario; states may overlap between scenarios.

`node generate.mjs 100 80000 ./bank.generated.mjs` appends verified candidates to a separate output, never overwrites the active bank. Re-run tests against a reviewed bank before promoting it. Do not deploy unverified scenarios. Browser can rerun selected proof and choose a player-hand group to compare rank classes.

## Fixed vs variable CPU hands
Fixed: one fully determined deal, deterministic CPU, all remaining player moves explored. Proven for stored scenes only.
Variable: with eight known player cards, possible labeled CPU deals before play are C(44,8)*C(36,8)*C(28,8) = 16,669,138,695,520,735,323,900, excluding unused cards and before conditioning. A variable approach would require a separately specified policy, a remaining-card pool, all previous plays and passes, hand-size constraints, and proof over every allowed assignment/decision, with no reassignment of already committed cards. This prototype does not certify or enable midgame changes. A finite state model is possible in principle, but no practical bound or certificate for dynamic assignment was established. Fixed-hand mode is recommended.
 
## Reward handling (free demo only)
Start draws a test reward class (1: 16%, 2: 20%, 3: 35.72%, 4: 28.28%), then a multiplier from the class: 2/3/4/5 uniformly, 1.5, 0.3, 0.01. The expected return is 96.9988%. Match rank and reward class are always separate. No actual prizes or exchangeable credits. The demo wallet is temporary, local memory only, and is not linked to the ZERO ORIPA wallet. The first-rank reveal wheel displays a value already drawn before play. Separate verify.html keeps the original manual scenario diagnostic page.
