import RestaurantCard from "./RestaurantCard.jsx";

export default function ResultsList({ status, results, favorites, onToggleFavorite }) {
  if (status === "idle") {
    return (
      <div className="rounded-3xl border border-dashed border-ink-900/10 bg-white/70 px-6 py-10 text-center text-sm text-ink-700 shadow-soft">
        Empieza con una ubicación para ver restaurantes.
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="rounded-3xl border border-ink-900/10 bg-white/70 px-6 py-10 text-center text-sm text-ink-700 shadow-soft">
        Cargando resultados...
      </div>
    );
  }

  if (status === "success" && results.length === 0) {
    return (
      <div className="rounded-3xl border border-ink-900/10 bg-white/70 px-6 py-10 text-center text-sm text-ink-700 shadow-soft">
        No encontramos restaurantes con esos filtros. Prueba ajustando el radio o la cocina.
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {results.map((restaurant) => (
        <RestaurantCard
          key={restaurant.id}
          restaurant={restaurant}
          isFavorite={favorites.includes(restaurant.id)}
          onToggleFavorite={() => onToggleFavorite(restaurant.id)}
        />
      ))}
    </div>
  );
}
