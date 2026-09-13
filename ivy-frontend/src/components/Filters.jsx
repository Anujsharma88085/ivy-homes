import React from 'react';
import { Filter, CheckCircle2 } from 'lucide-react';

export const Filters = ({ filters, onChange, localities }) => {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-sm text-slate-800">
          <Filter className="w-4 h-4 text-emerald-600" />
          <span>Filters</span>
        </div>
        <button
          onClick={() =>
            onChange({
              locality: '',
              bhk: '',
              furnishing: '',
              excludeInactive: true,
              excludeCorrupt: true,
            })
          }
          className="text-xs text-emerald-600 hover:underline"
        >
          Reset All
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Locality</label>
          <select
            value={filters.locality}
            onChange={(e) => onChange({ ...filters, locality: e.target.value })}
            className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
          >
            <option value="">All Localities</option>
            {localities.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Bedrooms</label>
          <select
            value={filters.bhk}
            onChange={(e) => onChange({ ...filters, bhk: e.target.value })}
            className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
          >
            <option value="">Any BHK</option>
            <option value="1">1 BHK</option>
            <option value="2">2 BHK</option>
            <option value="3">3 BHK</option>
            <option value="4">4+ BHK</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Furnishing</label>
          <select
            value={filters.furnishing}
            onChange={(e) => onChange({ ...filters, furnishing: e.target.value })}
            className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
          >
            <option value="">Any</option>
            <option value="unfurnished">Unfurnished</option>
            <option value="semi-furnished">Semi-Furnished</option>
            <option value="fully-furnished">Fully-Furnished</option>
          </select>
        </div>

        <div className="flex flex-col justify-end gap-1.5">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={filters.excludeInactive}
              onChange={(e) => onChange({ ...filters, excludeInactive: e.target.checked })}
              className="rounded text-emerald-600"
            />
            <span>Exclude Inactive (is_live: false)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={filters.excludeCorrupt}
              onChange={(e) => onChange({ ...filters, excludeCorrupt: e.target.checked })}
              className="rounded text-emerald-600"
            />
            <span>Filter Out Corrupt / Fakes</span>
          </label>
        </div>
      </div>
    </div>
  );
};