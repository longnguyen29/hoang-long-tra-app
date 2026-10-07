# Private batch quality reviews

Each review belongs to an existing `tea_batches` record. Staff can record the
aroma, taste and brewed liquor appearance on an integer 1–5 scale, a human
assessment (`pass`, `hold`, `reject`) and notes including brewing conditions,
issues and next action. This is a sensory record, not a laboratory certificate
or automatic QC release.

The UI labels results as Đạt, Cần kiểm tra thêm and Không đạt. Đạt requires all
three scores; the other results permit partial scores but require an explanation.
Blank scores remain unknown. A review average requires all three scores. The
history summary averages complete reviews for its overall mean and only known
scores for each individual criterion, showing the counts behind those means.
Summary figures refer to the history currently loaded, not all unviewed pages.
History loads 20 at a time with a button for earlier reviews.

## Integration

`BatchQualityReviews` accepts:

- `supabase`: the existing authenticated browser Supabase client.
- `batch`: the existing batch object with `id`, `code`, `name` and other fields;
  no batch data is duplicated.
- `userEmail`: the signed-in user's email, used only to scope temporary draft
  storage in this browser session. It never determines saved authorship.
- `role`: existing `admin` or `manager` role for UI actions. The database
  independently checks the existing `is_staff()` helper, which restricts batch
  access to these two roles after migration 0053.

Render it for the selected batch in Operations → Lô & chất lượng. A missing batch
shows a selection prompt. Unsaved drafts are retained per batch in component
state and, when `userEmail` is supplied, in session storage so closing/reopening
the review panel does not discard the notes during the current browser session.
The form uses existing design tokens and mobile control sizing.

## Database and authorization

Migration `0075_tea_batch_reviews.sql` creates the private, append-only
`public.tea_batch_reviews` table:

- UUID ID; `batch_id` references `tea_batches(id)` with deletion restricted.
- Nullable `aroma_score`, `taste_score`, `liquor_score` smallints, range 1–5.
- Required `result` (`pass`, `hold`, `reject`) and notes up to 3,000 characters.
- Server-owned `reviewer_id`, `reviewer_name` and `reviewed_at`.

Authenticated staff may read through RLS. Anonymous reads and all authenticated
direct insert/update/delete permissions are revoked. There is no deletion or
editing UI: corrections are entered as a new dated assessment with an explanatory
note, preserving the previous record.

The only app write RPC is:

```
create_tea_batch_review(
  p_batch_id text,
  p_aroma_score smallint,
  p_taste_score smallint,
  p_liquor_score smallint,
  p_result text,
  p_notes text
) returns setof tea_batch_reviews
```

The security-definer RPC explicitly checks `auth.uid()` and `is_staff()`, verifies
the batch, validates scores/result/notes and assigns the actor/time itself.
Reviewer display name comes from the staff profile, then the authenticated user
email, then the user ID. Clients cannot impersonate another reviewer or backdate
the record. No service credentials are used in the client.

Saving a review does not modify `tea_batches.status`, `quality_metrics`, tasting
notes, stock, allocation eligibility or the public passport. Staff retain the
existing explicit batch-edit/release process. A new hold/reject review therefore
requires a human follow-up if stock must be stopped; it does not itself stop an
existing allocation or shipment.

## Validation and deployment status

Migration 0075 is new and is not claimed to be applied to production in this
document. Apply only this migration when deploying the feature.

The six focused helper tests passed, covering invalid/missing sensory scores,
mandatory pass scores, hold/reject explanations, size bounds, partial data
summaries and empty history. The new component also passed a JSX syntax check.
Database checks still required at deployment: staff can create/read, anonymous
and non-staff callers cannot, direct authenticated writes fail, saved identities
and timestamps come from the server, and reviews leave the batch unchanged.
Verify new review/history and pagination on desktop and at 390 px.
