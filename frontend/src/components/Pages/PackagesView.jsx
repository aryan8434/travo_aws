import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Search, Star, Calendar, Users, MapPin, Sparkles, CheckCircle2, ArrowRight, ShieldCheck, ArrowLeft, Filter } from 'lucide-react';
import { initializePayment } from '../../utils/razorpay';

export default function PackagesView({ onBackToHome, onBookingComplete, onBookingError, currentUser, onOpenAuthModal }) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [maxBudget, setMaxBudget] = useState(100000);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/packages');
      if (res.data && res.data.packages) {
        setPackages(res.data.packages);
      }
    } catch (err) {
      console.error('Error loading packages:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['ALL', 'Beach & Wellness', 'Family & Nature', 'Heritage & Culture', 'Luxury', 'Adventure'];

  const filteredPackages = packages.filter((pkg) => {
    const matchesCategory = selectedCategory === 'ALL' || pkg.category === selectedCategory || (pkg.tags && pkg.tags.includes(selectedCategory.toLowerCase()));
    const matchesSearch =
      !searchTerm ||
      pkg.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.state?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pkg.tags && pkg.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesPrice = (pkg.price_inr || pkg.price || 0) <= maxBudget;

    return matchesCategory && matchesSearch && matchesPrice;
  });

  const handleBookPackage = (pkg) => {
    // ENFORCE LOGIN GUARD: No booking unless user is signed in!
    if (!currentUser) {
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }

    initializePayment(
      pkg,
      (booking) => {
        if (onBookingComplete) onBookingComplete(booking);
      },
      (err) => {
        if (onBookingError) onBookingError(err);
      }
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-[#0b0f17] text-slate-100 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <button
            onClick={onBackToHome}
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:underline mb-1 font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to AI Concierge
          </button>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-cyan-400" /> RAG Travel Packages Catalog
          </h2>
          <p className="text-xs text-slate-400">Browse and book holiday packages stored in your Vectra Vector Database</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-emerald-400 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" /> {packages.length} Vector Packages Indexed
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search destination, city, or activity..."
              className="w-full bg-slate-900/90 text-xs text-slate-100 placeholder-slate-500 rounded-xl pl-9 pr-4 py-2.5 border border-slate-700 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="md:col-span-2 flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  selectedCategory === cat
                    ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Packages Grid */}
      {loading ? (
        <div className="text-center py-12 text-xs text-slate-400 animate-pulse">
          Loading Vector DB Travel Packages...
        </div>
      ) : filteredPackages.length === 0 ? (
        <div className="glass-panel p-8 rounded-2xl text-center space-y-3 max-w-md mx-auto my-8">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Packages Match Filter</h3>
          <p className="text-xs text-slate-400">Try adjusting your search criteria or resetting filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPackages.map((pkg) => (
            <div
              key={pkg.package_id}
              className="glass-card rounded-2xl overflow-hidden border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300 shadow-xl flex flex-col justify-between group"
            >
              <div>
                {/* Top Banner */}
                <div className="bg-gradient-to-r from-cyan-950/80 via-slate-900 to-blue-950/80 p-4 border-b border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      {pkg.package_id}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-amber-400 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{pkg.rating || 4.8}★</span>
                    </div>
                  </div>
                  <h3 className="text-base font-extrabold text-white group-hover:text-cyan-300 transition-colors">
                    {pkg.title}
                  </h3>
                  <div className="text-xs text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-cyan-400" />
                    <span>{pkg.destination}, {pkg.state || 'India'}</span>
                  </div>
                </div>

                {/* Package Details */}
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{pkg.days || 3}D / {pkg.nights || 2}N</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{pkg.capacity_people || 2} Guests</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                    {pkg.description}
                  </p>

                  {pkg.included_services && (
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      {pkg.included_services.meals && (
                        <span className="px-2 py-0.5 bg-slate-900 text-slate-300 rounded border border-slate-800">
                          🍴 {pkg.included_services.meals}
                        </span>
                      )}
                      {pkg.included_services.transport && (
                        <span className="px-2 py-0.5 bg-slate-900 text-slate-300 rounded border border-slate-800">
                          🚗 {pkg.included_services.transport}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer & Price */}
              <div className="p-4 pt-0 border-t border-slate-800/60 flex items-center justify-between mt-2">
                <div>
                  <div className="text-lg font-extrabold text-cyan-400">
                    ₹{Number(pkg.price_inr || pkg.price || 0).toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-slate-400">total price</span>
                </div>

                <button
                  onClick={() => handleBookPackage(pkg)}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
                >
                  <span>Book Package</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
