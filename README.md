# Apuração — GitHub Pages edition

A static Brazilian election dashboard with an interactive map and clearly labeled exploratory scenarios. No API keys or external backend are required.

## Publish

1. Create a GitHub repository named `apuracao-brasil` with default branch `main`. Use a public repository for GitHub Free. The repository's contents and website will be public.
2. Put all files in this folder at the repository root, including `.github/workflows/pages.yml`, `.gitignore` and `.nojekyll`. If using the browser upload UI, check that the hidden `.github` folder was included; create `.github/workflows/pages.yml` manually from the supplied file if necessary.
3. Open **Settings → Pages** and set **Source** to **GitHub Actions**.
4. In **Actions**, choose **Update election results and publish Pages → Run workflow** on `main`.
5. Wait for the workflow to finish. The deployment summary links to your public site, normally `https://YOUR-USERNAME.github.io/apuracao-brasil/`.

The workflow uses GitHub's built-in token. Do not add a personal token. Repository or organization policies must allow Actions and the workflow's declared contents/Pages permissions.

## Updates and limitations

- GitHub is scheduled to collect TSE data approximately every five minutes. Scheduling and publishing can be delayed. The open page checks the published snapshot every minute; the Refresh button checks that snapshot, not TSE directly.
- The included starting snapshot was collected from TSE on 25 October 2026. The page displays its collection time and labels it as delayed once that time is more than ten minutes old. A snapshot with no collection metadata is labeled as bundled data.
- Failed areas retain their last data and are marked; older source generations cannot overwrite newer ones. Newer official corrections may legitimately reduce vote totals.
- The badge distinguishes snapshot availability from source freshness. Last collection time and each area's TSE timestamps are exposed. A completed count need not keep changing.
- Scheduled collection continues while the workflow is enabled. After the count ends, disable this workflow in the Actions menu. Manual runs remain an option after re-enabling it.
- Data collection commits `data/snapshot.json` so subsequent runs can retain successful data. A simultaneous manual push can reject the collector's push: rerun the workflow rather than force-pushing.
- This is not a calibrated forecast. The scenario assumes uncounted sections have the counted sections' candidate split and valid-vote yield within each state. First-round data supplies a fallback; candidate transfers and reporting-order bias are not modeled.

## Local checks

Requires Node.js 22 or later. No package installation is needed.

```
npm test
npm run update
npm run build
```

Serve `_site/` with any static web server. All application URLs are relative, so repository subpaths work.

Official data: https://resultados.tse.jus.br/ and https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados . Boundaries: IBGE, retained from the source site.
