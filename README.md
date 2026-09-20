# Pete Rose Society Record Book

A static, responsive GitHub Pages site built from `Pete Rose Society Record Book.ods`.

## Publish with GitHub Pages

1. Create a new GitHub repository.
2. Upload everything in this folder to the repository root.
3. In GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`, then save.

No build step or server is required. Open `index.html` locally to preview it.

## Updating the data

The live site data is stored in `data/league-data.js`. The included site is a snapshot of the supplied record book through 2026. Years 2020 and 2021 are intentionally excluded from counted league records.

All-time W-L-T totals shown on the site are calculated from the annual standings, which keeps the overview consistent with every displayed season.
