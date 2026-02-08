export default function SearchBar({
  location,
  onChange,
  onSubmit,
  disabled,
  status,
  onUseCurrentLocation,
  geoStatus,
  isGeoActive,
}) {
  const isLoading = status === "loading";
  const isGeoLoading = geoStatus === "loading";

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center">
      <div className="flex-1">
        <label className="text-sm font-semibold text-ink-700" htmlFor="location">
          Ubicación
        </label>
        <input
          id="location"
          className="mt-2 w-full rounded-2xl border border-ink-900/10 bg-white/90 px-4 py-3 text-base shadow-sm outline-none transition focus:border-tide-500 focus:ring-2 focus:ring-tide-500/20"
          placeholder="Ej: Palermo, Condesa o Calle 5"
          value={location}
          onChange={(event) => onChange(event.target.value)}
          disabled={isGeoActive}
        />
      </div>
      <div className="flex flex-col gap-2 md:flex-row">
        <button
          type="button"
          onClick={onUseCurrentLocation}
          disabled={isGeoLoading || isLoading}
          className="rounded-2xl border border-ink-900/10 bg-white/85 px-5 py-3 text-sm font-semibold text-ink-800 shadow-soft transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:bg-ink-700/10"
        >
          {isGeoLoading ? "Ubicando..." : "📍 Usar mi ubicación actual"}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || isGeoActive}
          className="rounded-2xl bg-tide-600 px-6 py-3 text-base font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-tide-500 disabled:cursor-not-allowed disabled:bg-ink-700/40"
        >
          {isLoading ? "Buscando..." : "Buscar"}
        </button>
      </div>
    </div>
  );
}
