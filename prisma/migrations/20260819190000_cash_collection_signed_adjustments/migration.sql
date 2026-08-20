-- Cash-collection review fix: ADJUSTMENT rows must be able to carry a signed
-- correction delta (negative to correct an over-recorded collection, positive
-- to correct an under-recorded one), while COLLECTION rows must remain
-- strictly positive. The original migration's unconditional
-- `amountCents > 0` check no longer reflects the domain rule, so it is
-- replaced (not edited in place) with a kind-aware check. Forward-only:
-- the previously-applied migration directory is left untouched.
ALTER TABLE `CashCollection` DROP CHECK `CashCollection_amountCents_positive`;

-- Defense-in-depth check, enforced by MySQL 8.0.16+ (the Clever Cloud managed
-- target); silently ignored by older engines, where the application-layer
-- validation in modules/finance/cash-collection.ts remains the authoritative
-- guard (kind === 'COLLECTION' requires amountCents > 0; kind === 'ADJUSTMENT'
-- requires a non-zero amountCents and additionally that the running collected
-- total for the order never goes negative).
ALTER TABLE `CashCollection` ADD CONSTRAINT `CashCollection_amountCents_check` CHECK (
  (`kind` = 'COLLECTION' AND `amountCents` > 0) OR (`kind` = 'ADJUSTMENT' AND `amountCents` <> 0)
);
