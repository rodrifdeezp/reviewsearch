const tagLabels = {
  website: "Sitio web",
  phone: "Teléfono",
  opening_hours: "Horarios",
};

export default function RestaurantCard({ restaurant, isFavorite, onToggleFavorite }) {
  return (
    <article className="flex flex-col justify-between rounded-3xl border border-ink-900/10 bg-white/80 p-5 shadow-soft transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">
              {restaurant.name || "Restaurante sin nombre"}
            </h2>
            <p className="text-sm text-ink-700">
              {restaurant.cuisine || "Cocina sin etiqueta"}
            </p>
          </div>
          <span className="rounded-full bg-sand-200 px-3 py-1 text-xs font-semibold text-ink-700">
            {restaurant.amenity === "fast_food" ? "Comida rápida" : "Restaurante"}
          </span>
        </div>

        <p className="text-sm text-ink-700">
          {restaurant.address || "Dirección no disponible"}
        </p>

        <div className="flex flex-wrap gap-2">
          {restaurant.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-ink-900/5 px-3 py-1 text-xs font-semibold text-ink-700"
            >
              {tagLabels[tag] || tag}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3 text-sm">
          <a
            className="font-semibold text-tide-600 hover:text-tide-500"
            href={restaurant.osmUrl}
            target="_blank"
            rel="noreferrer"
          >
            OSM
          </a>
          <a
            className="font-semibold text-tide-600 hover:text-tide-500"
            href={restaurant.googleMapsUrl}
            target="_blank"
            rel="noreferrer"
          >
            Google Maps
          </a>
        </div>
        <button
          type="button"
          onClick={onToggleFavorite}
          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
            isFavorite
              ? "bg-coral-600 text-white"
              : "bg-ink-900/5 text-ink-700 hover:bg-ink-900/10"
          }`}
        >
          {isFavorite ? "Quitar favorito" : "Guardar favorito"}
        </button>
      </div>
    </article>
  );
}
