# Open Eats Finder (MVP)

Travel-focused restaurant search using free OpenStreetMap data. Frontend built with React + Vite + Tailwind, backend powered by Netlify Functions.

## Project Structure
- `netlify/functions/search-restaurants.js`: API proxy to Nominatim + Overpass.
- `src/`: React app
- `src/components/`: UI components
- `src/hooks/`: custom hooks
- `src/lib/api.js`: frontend API client
- `netlify.toml`: Netlify build + function config

## Local Development
1. Install dependencies

```bash
npm install
```

2. Run Vite dev server (frontend)

```bash
npm run dev
```

3. Run Netlify Functions locally (optional)

```bash
npx netlify-cli dev
```

The Netlify CLI will proxy `/api/*` to your functions. In dev mode you can access the app at the URL shown by Netlify.

## Netlify Deployment
1. Push the repo to GitHub.
2. Create a new Netlify site from the repo.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Functions directory: `netlify/functions`

### Optional Environment Variables
- `OSM_USER_AGENT`: Custom User-Agent string for OpenStreetMap requests.
- `NOMINATIM_EMAIL`: Contact email used by Nominatim (recommended by OSM usage policy).

## API Contract (Frontend -> Function)
`POST /api/search-restaurants`

```json
{
  "location": "Lisbon",
  "radius": 1500,
  "filters": {
    "cuisine": "italian",
    "hasWebsite": false,
    "hasOpeningHours": false
  }
}
```

Response:

```json
{
  "meta": {
    "displayName": "Lisbon, Portugal",
    "lat": 38.72,
    "lon": -9.14,
    "radius": 1500,
    "total": 20,
    "cache": "miss"
  },
  "results": [
    {
      "id": "node-123",
      "name": "Sample Restaurant",
      "cuisine": "italian",
      "address": "Street 1, Lisbon",
      "score": 3,
      "tags": ["website", "phone"],
      "osmUrl": "https://www.openstreetmap.org/node/123",
      "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=38.72,-9.14"
    }
  ]
}
```
