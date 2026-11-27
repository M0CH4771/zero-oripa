# ZERO DAIFUGO — standalone prototype
No money, no credits, no redemption. Nothing changes the main ZERO ORIPA games.
 
## Rules
Four players, eight cards each, 52-card deck, 20 cards unused. Fixed hands and starting seat. 1–4 same rank cards, four triggers revolution, 8 cuts; matching exact suit sets on consecutive plays locks that set. Pass is legal only with nonempty field and persists until reset. After third finisher, last seat is fourth. No special forbidden finish rules. CPU chooses the largest playable group, then weakest legal rank, then lowest suit mask; only passes if no move. No RNG after dealing.

## Verification
`node test.mjs` checks rules and recomputes every proof. DFS explores every legal player move, including pass, and the fixed CPU choice. No pruning on presumed rank; memoization merges identical states. Exact reachable rank set is returned, not sampled. A budget-exhausted state is unverified and rejected. Search stops once player's rank is known, since subsequent moves cannot change it. Rule/CPU changes invalidate the bank. Current bank: 80 (20/20/20/20); 20 exact player-hand groups each cover all four rank classes. These are 2 distinct rank-pattern families with independently reverified global suit permutations, not 20 unrelated rank patterns. CPU deals and starting seats vary between classes. All stored scenes require a real reachable player two-card play and an 8-cut on one legal route, independent of the exact rank verification. Counts are per scenario; states may overlap between scenarios.

`node generate.mjs 100 80000 ./bank.generated.mjs` appends verified candidates to a separate output, never overwrites the active bank. Re-run tests against a reviewed bank before promoting it. Do not deploy unverified scenarios. Browser can rerun selected proof and choose a player-hand group to compare rank classes.

## Fixed vs variable CPU hands
Fixed: one fully determined deal, deterministic CPU, all remaining player moves explored. Proven for stored scenes only.
Variable: with eight known player cards, possible labeled CPU deals before play are C(44,8)*C(36,8)*C(28,8) = 16,669,138,695,520,735,323,900, excluding unused cards and before conditioning. A variable approach would require a separately specified policy, a remaining-card pool, all previous plays and passes, hand-size constraints, and proof over every allowed assignment/decision, with no reassignment of already committed cards. This prototype does not certify or enable midgame changes. A finite state model is possible in principle, but no practical bound or certificate for dynamic assignment was established. Fixed-hand mode is recommended.
 
## Reward handling
For this no-value test, choose a scenario category in the UI; results display actual rank and designated test reward class separately. No real reward, predetermined monetary payouts, RTP claim, or connection to existing credit ledger. When actual rank is lower than test class, the UI explains that the preselected demo class applies; no fake cheating event or alteration of match rank. RTP 97% is a future target and cannot be measured until a reward table and selection probabilities exist. 
