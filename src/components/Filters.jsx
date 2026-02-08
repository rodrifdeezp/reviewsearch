const radiusOptions = [
  { label: "1 km", value: 1000 },
  { label: "1.5 km", value: 1500 },
  { label: "2 km", value: 2000 },
  { label: "3 km", value: 3000 },
];

const cuisineSuggestions = [
  "mexican",
  "indian",
  "italian",
  "japanese",
  "chinese",
  "korean",
  "thai",
  "vietnamese",
  "greek",
  "turkish",
  "lebanese",
  "moroccan",
  "spanish",
  "french",
  "german",
  "brazilian",
  "argentinian",
  "peruvian",
  "colombian",
  "venezuelan",
  "burger",
  "pizza",
  "sushi",
  "steak_house",
  "seafood",
  "vegetarian",
  "vegan",
  "tapas",
  "taco",
];

export default function Filters({ radius, onRadiusChange, filters, onFilterChange }) {
  const updateFilter = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-1 flex-col gap-3">
        <label className="text-sm font-semibold text-ink-700" htmlFor="cuisine">
          Cocina
        </label>
        <select
          id="cuisine"
          className="w-full rounded-2xl border border-ink-900/10 bg-white/90 px-4 py-3 text-base shadow-sm outline-none transition focus:border-tide-500 focus:ring-2 focus:ring-tide-500/20"
          value={filters.cuisine}
          onChange={(event) => updateFilter("cuisine", event.target.value)}
        >
          <option value="">Todas</option>
          {cuisineSuggestions.map((item) => (
            <option key={item} value={item}>
              {item.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-5">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink-700">Radio</span>
          <div className="flex gap-2">
            {radiusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onRadiusChange(option.value)}
                className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                  radius === option.value
                    ? "bg-ink-900 text-white"
                    : "bg-white/80 text-ink-700 hover:bg-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink-700">Debe tener</span>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={filters.hasWebsite}
              onChange={(event) => updateFilter("hasWebsite", event.target.checked)}
            />
            Sitio web
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={filters.hasOpeningHours}
              onChange={(event) => updateFilter("hasOpeningHours", event.target.checked)}
            />
            Horarios
          </label>
        </div>
      </div>
    </div>
  );
}
