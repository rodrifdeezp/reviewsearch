import { useMemo, useState } from "react";
import Filters from "./components/Filters.jsx";
import ResultsList from "./components/ResultsList.jsx";
import SearchBar from "./components/SearchBar.jsx";
import { fetchRestaurants } from "./lib/api.js";
import { useFavorites } from "./hooks/useFavorites.js";

const DEFAULT_RADIUS = 1500;

export default function App() {
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [filters, setFilters] = useState({
    cuisine: "",
    hasWebsite: false,
    hasOpeningHours: false,
  });
  const [status, setStatus] = useState("idle");
  const [geoStatus, setGeoStatus] = useState("idle");
  const [geoError, setGeoError] = useState("");
  const [coords, setCoords] = useState(null);
  const [useGeolocation, setUseGeolocation] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const [meta, setMeta] = useState(null);
  const { favorites, toggleFavorite } = useFavorites();

  const hasManualLocation = location.trim().length > 2 && !useGeolocation;
  const hasGeoLocation = useGeolocation && coords;
  const canSearch =
    (hasManualLocation || hasGeoLocation) && status !== "loading" && geoStatus !== "loading";

  const handleSearch = async ({ useCoords, coordsOverride } = {}) => {
    const shouldUseCoords = typeof useCoords === "boolean" ? useCoords : useGeolocation;
    if (!shouldUseCoords && !canSearch) return;
    if (shouldUseCoords && !coords && !coordsOverride) return;
    setStatus("loading");
    setError("");

    try {
      const effectiveCoords = coordsOverride || coords;
      const response = await fetchRestaurants({
        location: shouldUseCoords ? "" : location.trim(),
        latitude: shouldUseCoords ? effectiveCoords?.latitude : undefined,
        longitude: shouldUseCoords ? effectiveCoords?.longitude : undefined,
        radius,
        filters,
      });
      setResults(response.results);
      setMeta(response.meta);
      if (shouldUseCoords) {
        setLocation(response.meta?.displayName || "Ubicación actual");
      }
      setStatus("success");
    } catch (err) {
      setError(err.message || "Algo salió mal.");
      setStatus("error");
    }
  };

  const handleUseCurrentLocation = () => {
    setGeoError("");
    setUseGeolocation(true);

    if (!("geolocation" in navigator)) {
      setGeoStatus("unsupported");
      setGeoError("La geolocalización no está disponible en este navegador.");
      setUseGeolocation(false);
      return;
    }

    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCoords(nextCoords);
        setGeoStatus("success");
        setLocation("Ubicación actual");
        setUseGeolocation(true);
      },
      (geoErr) => {
        setGeoStatus(geoErr.code === 1 ? "denied" : "error");
        setGeoError(
          geoErr.code === 1
            ? "Permiso de ubicación denegado. Puedes buscar escribiendo un lugar."
            : "No pudimos acceder a tu ubicación. Intenta de nuevo o busca manualmente."
        );
        setUseGeolocation(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  const subtitle = useMemo(() => {
    if (!meta) return "Descubre restaurantes con datos abiertos.";
    return `Encontramos ${meta.total} lugares cerca de ${meta.displayName}.`;
  }, [meta]);

  return (
    <div className="min-h-screen bg-hero text-ink-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-20 pt-10 md:px-8">
        <header className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="fade-in">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-tide-600">
                Open Eats Finder
              </p>
              <h1 className="mt-4 text-3xl font-semibold leading-tight md:text-5xl">
                Descubre restaurantes con datos de OpenStreetMap.
              </h1>
              <p className="mt-4 max-w-2xl text-base text-ink-700 md:text-lg">
                {subtitle}
              </p>
            </div>
            <div className="glass pulse-ring rounded-3xl px-6 py-5 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-700">
                Datos abiertos
              </p>
              <p className="mt-2 text-sm text-ink-800">
                Resultados basados en la información pública de OpenStreetMap.
              </p>
              <div className="mt-4 flex items-center gap-3 text-xs font-semibold text-ink-600">
                <span className="rounded-full bg-ink-900/5 px-3 py-1">Sin cuentas</span>
                <span className="rounded-full bg-ink-900/5 px-3 py-1">Sin tracking</span>
              </div>
            </div>
          </div>
        </header>

        <section className="glass rise-in rounded-[28px] p-6 shadow-soft md:p-8">
          <div className="flex flex-col gap-6">
            <SearchBar
              location={location}
              onChange={(value) => {
                setLocation(value);
                setUseGeolocation(false);
                setCoords(null);
              }}
              onSubmit={handleSearch}
              disabled={!canSearch}
              status={status}
              onUseCurrentLocation={handleUseCurrentLocation}
              geoStatus={geoStatus}
              isGeoActive={useGeolocation}
            />
            <Filters
              radius={radius}
              onRadiusChange={setRadius}
              filters={filters}
              onFilterChange={setFilters}
            />
            {geoError && (
              <div className="rounded-2xl border border-ink-900/10 bg-white/70 px-4 py-3 text-sm text-ink-700">
                {geoError}
              </div>
            )}
            {status === "error" && (
              <div className="rounded-2xl border border-coral-500/30 bg-coral-500/10 px-4 py-3 text-sm text-ink-700">
                {error}
              </div>
            )}
          </div>
        </section>

        <section className="rise-in">
          <ResultsList
            status={status}
            results={results}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
          />
        </section>
      </div>
    </div>
  );
}
