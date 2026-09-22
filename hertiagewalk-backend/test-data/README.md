# Sanity test data

All docs have `_id` starting with `test-` and titles starting with `[TEST]`.

Recommended: import into a **private `test` dataset** so nothing shows on the public site
(the public site reads `production`).

```bash
cd hertiagewalk-backend
npx sanity dataset create test --visibility private
npx sanity dataset import test-data/test-data.ndjson test --replace
```

Then pick dataset `test` on `localhost:5173/test`. To view it in Studio, run Studio with
`SANITY_STUDIO_DATASET=test` (if wired) or temporarily change `dataset` in `sanity.config.js`.

To clean up from production if you imported there:

```bash
npx sanity documents query '*[_id match "test-*"]._id'
npx sanity dataset delete test   # or delete individual docs in Studio
```

## Using it from the website

`http://localhost:5173/test` serves the whole site reading the `test` dataset
(`/` keeps reading `production`). Env vars in `UI/.env`:

```
VITE_ENABLE_TEST_PAGE=true        # only needed for non-dev builds
VITE_SANITY_TEST_DATASET=test     # optional, defaults to "test"
VITE_SANITY_TEST_TOKEN=...        # only if the test dataset is private (dev only!)
```
