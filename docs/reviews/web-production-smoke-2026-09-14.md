# Web production smoke - 2026-09-14

Coordinator verified production after the user authenticated in the in-app browser.

Deployment: dpl_Gp7TSdTirfk9uPyjQK3BDAGRxSym
URL: https://laudousg-tpab2anf8-prazeresapp.vercel.app
Domain: https://www.laudousg.com.br
Source commit: a42e0d3c27c0a4044b99bbb131b38f464c64126a
Branch: codex/web-release-20260914 (not main).

Vercel inspect confirmed Ready, production target, and the www domain alias.
Authenticated /app opened the category picker in /app/gerar. Its heading uses
uppercase text and all 15 category controls were present. Local typography and
responsive checks are recorded in the release stories; the production check
here used the accessibility tree, not a new pixel comparison.

Selecting the combined obstetric Doppler category opened the obstetric sections,
biometry/growth, Doppler indices and PE calculator. The isolated-mode switch was
off by default. The document included obstetric and Doppler sections.
Switching to isolated mode removed obstetric sections and produced only the
Doppler document. With no indices supplied, its conclusion stated insufficient
data, not normal hemodynamics. Restored combined mode and returned to categories.

No reports saved, no real patient input, no purchase or database write requested.
This is a navigation/rendering smoke, not a save/companion/purchase end-to-end test.

Public prostate-v2.webp returned HTTP 200, image/webp, 3346 bytes.
API health returned ok=true at 2026-09-14T23:08:46.031Z. Health alone does not
establish the API deployment identity; DevOps checks that separately.

Remaining clinical API, mobile parity and new Apple build are outside this WEB
deployment. New FMF risks are not declared clinically validated by this smoke.
