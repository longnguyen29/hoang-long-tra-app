# Controlled A/B tests

Use this pattern when a new Hoàng Long function is promising but should not replace a proven customer path yet.

## House rule

1. Keep the existing route as the **control**. Do not change its core decision flow during the test.
2. Put the experimental function on a **parallel route** using the same design system, catalogue and submission backend.
3. Give both routes the same conversion checkpoints: page viewed, decision started and request submitted.
4. Distinguish variants with the route path and the analytics `placement` value. Never store customer names, phone numbers, addresses or free-form notes in experiment analytics.
5. Send comparable traffic to each URL. Use the same audience, message, channel and period; change only the function being tested.
6. Compare completion rate and lead quality, not raw visits alone. A variant wins only when it produces useful sample requests without creating more confusion or unqualified work.
7. Promote deliberately. If the variant wins, replace the control in a separate change. If it loses, keep or remove the test route without disturbing the control.

## Current sample experiment

| Variant | Route | Purpose |
| --- | --- | --- |
| Control | `/sample` | Choose a sample pack, then submit delivery details. |
| Menu Lab | `/sample/menu-lab` | Choose a drink first, receive a tea and starting-recipe suggestion, then request a sample pack. |

Both routes submit to the existing sample-request system. Analytics can separate them by `path` and by placements beginning with `sample_control` or `sample_menu_lab`.

## Link discipline

When testing a campaign, keep the same UTM tags and change only the destination URL. Do not redirect `/sample` automatically or randomly split traffic until the owner asks for it; direct links make the test easy to pause, explain and audit.
