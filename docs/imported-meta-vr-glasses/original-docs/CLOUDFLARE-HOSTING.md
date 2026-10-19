# Cloudflare Pages preparation and costs

Prepared 17 October 2026. Owner authorized configuration preparation. Nothing deployed, purchased or changed in DNS by this preparation.

Delivery priorities, effort estimates, owner decisions and release gates are maintained in the [final Meta Architect + plan](COMPLETION-PLAN.md). The existing application/project names in configuration remain unchanged pending the public-name decision.

## Selected proposal

- Cloudflare Pages Free, static assets only; no Pages Functions, database, paid Worker, R2 or AI service.
- Proposed project name: architecture-decision-workspace (availability not checked in account).
- Public hostname: architecture.connect-the-dots.biz; owner confirms DNS control.
- Build locally with `npm run check` and `npm run build`; output directory `dist`.
- `wrangler.jsonc` contains only local Pages project/output settings. It does not create cloud resources or associate the hostname.

## Budget

Expected incremental hosting cost for this configuration: **USD 0/month**. Static asset requests are free and unlimited; Pages includes SSL. The Free plan currently permits 500 hosted builds/month, 20,000 files/site and 25 MiB/file. The inspected build's largest file is 6,632,025 bytes, below that per-file limit; performance optimization remains separate.

Using a subdomain does not require another domain registration. Existing connect-the-dots.biz renewal remains payable at the owner's registrar; exact renewal price is unknown. No extra headset purchase is planned because Quest 3 is available. AI is disabled, so no AI API allowance is budgeted. Browser dictation is retained without adding a paid speech API; its actual processor/terms must still be checked on device.

This is an infrastructure estimate, not a total development quote. Existing Codex subscription/usage, internet, electricity, domain renewal, and any chosen contractor, legal review, paid assets or promotional work are separate. Store account/review charges have not been authoritatively confirmed here and are not represented as guaranteed zero. No paid tier is required by this local hosting proposal.

## Deployment sequence after candidate approval

1. Access the owner's Cloudflare account locally; do not send API tokens/passwords in chat.
2. Confirm Free plan and project-name availability. Use Direct Upload of verified `dist` initially; no Git repository creation is necessary.
3. Verify default Pages URL and all scene/UI/font assets over HTTPS. Keep evidence of exact build.
4. Associate architecture.connect-the-dots.biz in Pages Custom domains before creating DNS records. Use the actual target Cloudflare provides; do not guess a pages.dev hostname.
5. Add only the required architecture CNAME at the current DNS provider. A subdomain can use externally managed DNS; no nameserver migration is needed.
6. Verify certificate issuance, public access without login and actual Quest Browser behavior. Confirm response MIME types.
7. When signing/package identity is selected, serve the real certificate/package association at /.well-known/assetlinks.json. Never publish guessed fingerprints or placeholder package names.
8. Preserve a separate competition candidate at freeze; later Store updates must not silently alter the submitted deadline version.

Public deployment, DNS mutation and final signing decisions remain release-gate actions. Before deployment, review actual account plan and exact candidate; do not enable paid add-ons as part of this preparation.

## Sources checked 17 October 2026

- https://developers.cloudflare.com/pages/functions/pricing/
- https://developers.cloudflare.com/pages/platform/limits/
- https://developers.cloudflare.com/pages/configuration/custom-domains/
- https://developers.cloudflare.com/pages/functions/wrangler-configuration/
- https://www.cloudflare.com/products/pages/
