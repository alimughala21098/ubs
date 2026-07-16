import React from 'react';

export default function FilterBar({ filters, setFilters, countries }) {
  return (
    <div className="sticky top-0 z-20 bg-surface border-b border-border px-6 md:px-8 py-3 flex flex-wrap items-center gap-3">
      <input
        type="text"
        placeholder="Search job title or client…"
        value={filters.text}
        onChange={(e) => setFilters((f) => ({ ...f, text: e.target.value }))}
        className="flex-1 min-w-[200px] bg-surface2 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <select
        value={filters.country}
        onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value }))}
        className="bg-surface2 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <option value="">All countries</option>
        {countries.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <label
        className={
          'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold cursor-pointer select-none transition-colors ' +
          (filters.needsReview
            ? 'border-danger text-danger bg-danger/10'
            : 'border-border text-muted bg-surface2')
        }
      >
        <input
          type="checkbox"
          checked={filters.needsReview}
          onChange={(e) => setFilters((f) => ({ ...f, needsReview: e.target.checked }))}
          className="accent-danger"
        />
        Needs review only
      </label>
    </div>
  );
}
