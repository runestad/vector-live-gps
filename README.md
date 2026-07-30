# VECTOR — Live GPS Tracking

VECTOR is a fictional, production-friendly GPS simulation interface for screen graphics and props. It does not track real devices, request location access, collect personal data, or use analytics.

## Run and build

Requires Node.js 22. Run `npm install`, then `npm run dev`. Create the production build with `npm run build`; run checks with `npm run check`.

## Use

- **Set Position:** enter `latitude, longitude`, use the map center, click the map, or drag the tracker.
- **Movement Simulator:** click several map points or paste one coordinate pair per line. Set speed and press Play.
- **Tracker Appearance:** upload PNG, JPG, WEBP, or SVG (maximum 1.5 MB), then adjust size, opacity, ring, pulse, shadow, and directional rotation.
- **Presenter Mode:** press `P` or use the top-right button. `Space` plays/pauses, `R` restarts, `F` toggles fullscreen, `C` centers, `H` hides the interface, arrow keys seek, and `Escape` exits.
- **Scenarios:** save locally, open any demo, or export/import a JSON file.

Settings and scenarios persist in LocalStorage. The default map uses OpenStreetMap tiles and always displays contributor attribution. Satellite imagery is a prepared placeholder because a reliable production imagery provider normally requires its own key and usage agreement.

## Deployment

The app is configured for Sites hosting and can also be deployed to Vercel as a standard frontend project after adapting the build output if needed. PWA metadata, icons, and a service worker are included.

## Brand assets

The full compact logo is `public/vector-logo.svg`; the standalone icon is `public/app-icon.svg`; favicon and 192/512px PNG app icons are in `public/`.
