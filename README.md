Disaster Risk Dashboard

A full-stack, containerised web dashboard for monitoring real-time disaster events, currently supporting Earthquakes and Floods, with interactive maps, event lists, and intensity heatmaps.

FEATURES
- Live Earthquake data (USGS)
- Live Flood alerts (NWS – US, Environment Agency – UK)
- Interactive world map (Leaflet)
- Event view and intensity heatmap
- Severity scoring and classification
- Auto-refresh every 60 seconds
- Fully Dockerised frontend and backend

ARCHITECTURE
Disaster Risk Dashboard
- backend (FastAPI, Python)
- frontend (Next.js, React, Leaflet)
- docker-compose.yml

PREREQUISITES
- Docker
- Docker Compose

RUN THE FULL STACK
From the project root directory, run:

docker compose up --build

ACCESS

Frontend: http://localhost:3000

Backend API: http://localhost:8000

STOP SERVICES
docker compose down

DATA SOURCES
- Earthquakes: USGS
- Floods: NOAA/NWS (US), UK Environment Agency

FUTURE SCOPE
- Wildfires
- Cyclones
- Landslides
- Multi-hazard overlays

AUTHOR
Harisankar Krishnadas

LICENSE
MIT License

