import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Bed, Bath, Layers, AlertTriangle } from 'lucide-react';
import { formatPrice, normalizeArea } from '../utils/formatters';
import { useFavourites } from '../context/FavouritesContext';

// High-resolution architectural photography mapped deterministically
const PROPERTY_IMAGES = [
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
];

const getDeterministicImage = (id = '') => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PROPERTY_IMAGES.length;
  return PROPERTY_IMAGES[index];
};

export const ListingCard = ({ listing }) => {
  const { favouriteIds, toggleFavourite } = useFavourites();
  const id = listing.listing_id || listing.id;
  const isSaved = favouriteIds.has(id);
  const area = normalizeArea(listing.carpet_area, listing.website);
  const imageUrl = getDeterministicImage(id);

  const isCorrupt =
    listing.price <= 0 ||
    (listing.floor !== null &&
      listing.total_floors !== null &&
      listing.floor > listing.total_floors) ||
    (listing.carpet_area &&
      listing.super_built_up_area &&
      listing.carpet_area > listing.super_built_up_area);

  const isFake = listing.price > 0 && listing.price < 100000;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between group">
      <div>
        {/* Visual Hero Header */}
        <div className="relative h-48 bg-slate-200 overflow-hidden">
          <img
            src={imageUrl}
            alt={listing.apartment_name || 'Property'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

          {/* Top Badges & Heart */}
          <div className="absolute top-3 inset-x-3 flex justify-between items-start">
            <div className="flex flex-wrap gap-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-900/90 text-white tracking-wider backdrop-blur-sm">
                {listing.website || 'Direct'}
              </span>
              {listing.is_live === false && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500 text-white shadow-sm">
                  Withdrawn
                </span>
              )}
              {isCorrupt && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-600 text-white shadow-sm flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Corrupt
                </span>
              )}
              {isFake && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-600 text-white shadow-sm">
                  Enquiry Bait
                </span>
              )}
            </div>

            <button
              onClick={(e) => {
                e.preventDefault();
                toggleFavourite(listing);
              }}
              aria-label={isSaved ? 'Remove from saved' : 'Save property'}
              className="p-2 rounded-full bg-white/90 backdrop-blur shadow hover:bg-white transition text-slate-700 hover:text-rose-500 cursor-pointer"
            >
              <Heart
                className={`w-4 h-4 ${isSaved ? 'fill-rose-500 text-rose-500' : ''}`}
              />
            </button>
          </div>

          {/* Price & Area Overlay */}
          <div className="absolute bottom-3 inset-x-3 text-white">
            <div className="text-xl font-extrabold tracking-tight drop-shadow-sm">
              {formatPrice(listing.price)}
            </div>
            <div className="text-xs text-slate-200">
              {area.isSqm ? (
                <span>
                  {area.sqft} sqft{' '}
                  <span className="text-emerald-300 font-medium">
                    ({area.rawSqm} sqm)
                  </span>
                </span>
              ) : (
                `${area.sqft} sqft`
              )}
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4">
          <h3 className="font-semibold text-slate-800 truncate text-sm">
            {listing.apartment_name || listing.title || 'Property Unit'}
          </h3>
          <p className="text-xs text-slate-500 capitalize mt-0.5 truncate">
            {listing.locality || 'Unknown locality'}
          </p>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <Bed className="w-3.5 h-3.5 text-slate-400" />
              {listing.bedroom || 0} BHK
            </span>
            <span className="flex items-center gap-1">
              <Bath className="w-3.5 h-3.5 text-slate-400" />
              {listing.bathroom || 0} Bath
            </span>
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Floor {listing.floor ?? '-'}/{listing.total_floors ?? '-'}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <Link
          to={`/listings/${id}`}
          className="block text-center w-full py-2 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 rounded-lg text-xs font-semibold transition"
        >
          View Full Details
        </Link>
      </div>
    </div>
  );
};