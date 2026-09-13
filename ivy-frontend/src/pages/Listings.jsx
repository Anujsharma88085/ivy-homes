import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { ListingCard } from '../components/ListingCard';
import { Filters } from '../components/Filters';
import { Loader2 } from 'lucide-react';

export const Listings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFilters] = useState({
    locality: '',
    bhk: '',
    furnishing: '',
    excludeInactive: true,
    excludeCorrupt: true,
  });

  const fetchListings = async (currentOffset = 0, append = false) => {
    setLoading(true);
    try {
      const res = await api.get('/v1/listings', {
        params: { limit: 50, offset: currentOffset },
      });
      const data = res.data;
      const results = data.results || [];
      setTotal(data.total || 0);
      setHasMore(data.has_more ?? results.length === 50);

      setListings((prev) => (append ? [...prev, ...results] : results));
    } catch (err) {
      console.error('Failed to fetch listings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings(0, false);
  }, []);

  const localities = [...new Set(listings.map((l) => l.locality).filter(Boolean))];

  const filteredListings = listings.filter((l) => {
    if (filters.excludeInactive && l.is_live === false) return false;
    if (filters.excludeCorrupt) {
      if (l.price <= 0 || (l.price > 0 && l.price < 100000)) return false;
      if (l.floor !== null && l.total_floors !== null && l.floor > l.total_floors) return false;
      if (l.carpet_area && l.super_built_up_area && l.carpet_area > l.super_built_up_area) return false;
    }
    if (filters.locality && l.locality?.toLowerCase() !== filters.locality.toLowerCase()) return false;
    if (filters.bhk && String(l.bedroom) !== String(filters.bhk)) return false;
    if (filters.furnishing && l.furnishing !== filters.furnishing) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sale Listings</h1>
          <p className="text-xs text-slate-500 mt-1">
            Showing {filteredListings.length} matching properties (Total indexed: {total})
          </p>
        </div>
      </div>

      <Filters filters={filters} onChange={setFilters} localities={localities} />

      {loading && listings.length === 0 ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredListings.map((listing) => (
              <ListingCard key={listing.listing_id} listing={listing} />
            ))}
          </div>

          {hasMore && (
            <div className="text-center pt-8">
              <button
                onClick={() => {
                  const nextOffset = offset + 50;
                  setOffset(nextOffset);
                  fetchListings(nextOffset, true);
                }}
                disabled={loading}
                className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition disabled:opacity-50"
              >
                {loading ? 'Loading More...' : 'Load Next 50 Listings'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};