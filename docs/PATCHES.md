# Maple Guide Patches

## 2026-09 Audit

### Critical fixes (applied)
1. CompletionController::findAssignmentOrFail() now selects
   c.household_id (chore_assignments has no household_id column).
2. migrations/run.php has no transaction wrapper.
3. Namespace standardized to Maple\ everywhere.

### Correctness fixes (applied)
4. PointsService::award() runs inside the approval transaction.
5. Redemption approve() re-checks balance.
6. Member ordering uses FIELD(role_in_household, 'parent', 'admin', 'child').
7. Approve/reject guarded with WHERE status = 'pending' + rowCount().
8. Seeder never creates a 'submitted' assignment without a completion.
9. Analytics members query ignores other households' completions.

### Docs
10. Angular class-based interceptor/guard notes (<=16 vs 17+).
11. Middleware layer deleted (unused).
12. composer dump-autoload after changing the PSR-4 namespace.
13. Seed emails use @maple.test.