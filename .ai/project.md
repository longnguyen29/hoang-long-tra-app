# Project Charter

Project name: House of Hoàng Long
Repository: longnguyen29/hoang-long-tra-app
Owner: longnguyen29

## Product goal
Vietnamese tea brand website with B2B wholesale,
sample requests, customer ordering and B2C retail.
Improve reliability, usability, documentation and
customer conversion without disrupting existing operations.

## Technology
Next.js, React, Node.js, Supabase, npm.

## Codebase map
- app/: Routes and application features
- components/: UI components
- lib/: Business logic and integrations
- tests/: Application tests
- docs/: Documentation

## Autonomous permissions
Initial rollout: documentation changes under docs/ only.
All application code changes require an expanded,
reviewed policy and appropriate automated checks.

## Non-negotiable boundaries
No unattended database migrations, authentication,
payment changes, production deployment, customer-data
operations, destructive commands, or automatic merges.
