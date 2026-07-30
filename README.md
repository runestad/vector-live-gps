# VECTOR — Live GPS Tracking

VECTOR is a fictional, production-friendly GPS simulation interface for screen graphics and props. It does not track real devices, request location access, collect personal data, or use analytics.

## Run and build

Requires Node.js 22. Run `npm install`, then `npm run dev`. Create the production build with `npm run build`; run checks with `npm run check`.

## Use

- **Set Position:** enter `latitude, longitude`, use the map center, click the map, or drag the tracker.
- **Movement Simulator:** import a supported Google Maps route URL, enter start/destination addresses, click map points, or paste coordinate pairs. Road geometry is generated with the public OSRM service over OpenStreetMap data.
- **Tracker Appearance:** choose one of 12 original SVG tracker icons or upload PNG, JPG, WEBP, or SVG (maximum 1.5 MB). Tracker assets never change the VECTOR brand assets.
- **Presenter Mode:** press `P` or use the top-right button. `Space` plays/pauses, `R` restarts, `F` toggles fullscreen, `C` centers, `H` hides the interface, arrow keys seek, and `Escape` exits.
- **Scenarios:** create unlimited custom scenarios, duplicate demos, rename/delete custom entries, or export/import a JSON file.

Settings and scenarios use a versioned LocalStorage model. V1 data is migrated automatically, including uploaded tracker images. The default map uses OpenStreetMap tiles and always displays contributor attribution. Satellite imagery is a prepared placeholder because a reliable production imagery provider normally requires its own key and usage agreement.

Google Maps URLs are only parsed for route endpoints already present in the URL. VECTOR does not scrape Google Maps or use proprietary Google route geometry. Supported formats include `google.com/maps/dir/...` and Maps URLs using `api=1`, `origin`, `destination`, and optional `waypoints`. Short `maps.app.goo.gl` links must be expanded in Google Maps before import.

## Deployment

The app is configured for Sites hosting and can also be deployed to Vercel as a standard frontend project after adapting the build output if needed. PWA metadata, icons, and a service worker are included.

## Brand assets

The full compact logo is `public/vector-logo.svg`; the standalone icon is `public/app-icon.svg`; favicon and 192/512px PNG app icons are in `public/`.
