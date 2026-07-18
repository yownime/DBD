"use client";

import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface DataTableProps {
  type: 'raw' | 'prediction';
  rawData?: any[]; // MalariaRecord[]
  predictionData?: any[]; // PredictionRecord[]
}

export default function DataTable({ type, rawData = [], predictionData = [] }: DataTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Helper to extract Kecamatan from Alamat
  const extractKecamatan = (alamat: string): string => {
    if (!alamat || alamat === '-') return '-';
    const addr = alamat.toUpperCase();
    const match = addr.match(/KECAMATAN\s+([A-Z\s\-]+?)(?:\s+KABUPATEN|\s+KAB|\s+PROVINSI|\d|\,|\.|$)/);
    if (match) {
      const kec = match[1].trim();
      if (kec && kec !== '-') return kec;
    }
    const matchKec = addr.match(/KEC\.\s+([A-Z\s\-]+?)(?:\s+KABUPATEN|\s+KAB|\s+PROVINSI|\d|\,|\.|$)/);
    if (matchKec) {
      const kec = matchKec[1].trim();
      if (kec && kec !== '-') return kec;
    }
    return '-';
  };

  // 1. Combine data based on type and inject Kecamatan
  const items = useMemo(() => {
    const rawItems = type === 'raw' ? rawData : predictionData;
    return rawItems.map(item => ({
      ...item,
      Kecamatan: extractKecamatan(item.Alamat)
    }));
  }, [type, rawData, predictionData]);

  // Reset page when search query changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // 2. Filter data by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    
    return items.filter((item) => {
      return (
        String(item.Kabupaten || '').toLowerCase().includes(query) ||
        String(item.Kecamatan || '').toLowerCase().includes(query) ||
        String(item.Desa || '').toLowerCase().includes(query) ||
        String(item.Dusun || '').toLowerCase().includes(query) ||
        String(item.Alamat || '').toLowerCase().includes(query) ||
        String(item.Jenis_Kelamin || '').toLowerCase().includes(query) ||
        String(item.Golongan_Darah || '').toLowerCase().includes(query) ||
        String(item.Tahun || '').toLowerCase().includes(query)
      );
    });
  }, [items, searchQuery]);

  // 3. Sort data
  const handleSort = (field: string) => {
    const isAsc = sortField === field && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortField(field);
    setCurrentPage(1);
  };

  const sortedItems = useMemo(() => {
    if (!sortField) return filteredItems;
    
    return [...filteredItems].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      
      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = String(valB).toLowerCase();
      }
      
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredItems, sortField, sortDirection]);

  // 4. Pagination calculations
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / rowsPerPage));
  
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedItems.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedItems, currentPage, rowsPerPage]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search Bar & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-tertiary)]">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Cari wilayah, kabupaten, kecamatan, desa, dusun..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-teal-500/40 text-sm transition-all shadow-sm"
          />
        </div>
        
        <div className="text-xs text-[var(--text-secondary)] font-medium bg-[var(--bg-tertiary)] px-4 py-2.5 rounded-xl border border-[var(--border-color)] self-start md:self-auto">
          Menampilkan <span className="font-bold">{Math.min(sortedItems.length, (currentPage - 1) * rowsPerPage + 1)}-{Math.min(sortedItems.length, currentPage * rowsPerPage)}</span> dari <span className="font-bold text-teal-500">{sortedItems.length.toLocaleString()}</span> data
        </div>
      </div>

      {/* Table Container */}
      <div className="border border-[var(--border-color)] rounded-2xl overflow-hidden glass-panel shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-[var(--text-secondary)]">
            <thead className="bg-[var(--bg-tertiary)] text-[var(--text-primary)] border-b border-[var(--border-color)] text-xs font-bold uppercase tracking-wider">
              <tr>
                <th onClick={() => handleSort('No')} className="px-6 py-4 cursor-pointer hover:bg-[var(--border-color)] transition-colors">No</th>
                <th onClick={() => handleSort('Tahun')} className="px-6 py-4 cursor-pointer hover:bg-[var(--border-color)] transition-colors">Tahun</th>
                <th onClick={() => handleSort('Kabupaten')} className="px-6 py-4 cursor-pointer hover:bg-[var(--border-color)] transition-colors">Kabupaten</th>
                <th onClick={() => handleSort('Kecamatan')} className="px-6 py-4 cursor-pointer hover:bg-[var(--border-color)] transition-colors">Kecamatan</th>
                <th onClick={() => handleSort('Desa')} className="px-6 py-4 cursor-pointer hover:bg-[var(--border-color)] transition-colors">Desa</th>
                <th onClick={() => handleSort('Dusun')} className="px-6 py-4 cursor-pointer hover:bg-[var(--border-color)] transition-colors">Dusun</th>
                <th onClick={() => handleSort('Usia')} className="px-6 py-4 cursor-pointer hover:bg-[var(--border-color)] transition-colors text-center">Usia</th>
                <th onClick={() => handleSort('Jenis_Kelamin')} className="px-6 py-4 cursor-pointer hover:bg-[var(--border-color)] transition-colors">Jenis Kelamin</th>
                <th onClick={() => handleSort('Golongan_Darah')} className="px-6 py-4 cursor-pointer hover:bg-[var(--border-color)] transition-colors text-center">Gol. Darah</th>
                {type === 'raw' ? (
                  <th onClick={() => handleSort('Risiko')} className="px-6 py-4 cursor-pointer hover:bg-[var(--border-color)] transition-colors text-center">Status Kerentanan</th>
                ) : (
                  <th onClick={() => handleSort('Prediksi')} className="px-6 py-4 cursor-pointer hover:bg-[var(--border-color)] transition-colors text-center">Prediksi Kerentanan (AI)</th>
                )}
              </tr>
            </thead>
            
            <tbody className="divide-y divide-[var(--border-color)] bg-[var(--bg-secondary)]">
              {paginatedItems.length > 0 ? (
                paginatedItems.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                    <td className="px-6 py-4.5 font-medium text-[var(--text-primary)]">{row.No}</td>
                    <td className="px-6 py-4.5">{row.Tahun}</td>
                    <td className="px-6 py-4.5 font-semibold text-[var(--text-primary)]">{row.Kabupaten}</td>
                    <td className="px-6 py-4.5 font-semibold text-[var(--text-primary)]">{row.Kecamatan}</td>
                    <td className="px-6 py-4.5 text-xs font-medium">{row.Desa}</td>
                    <td className="px-6 py-4.5 text-xs">{row.Dusun}</td>
                    <td className="px-6 py-4.5 text-center font-bold text-[var(--text-primary)]">{row.Usia}</td>
                    <td className="px-6 py-4.5">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                        row.Jenis_Kelamin === 'Perempuan' 
                          ? 'bg-pink-500/10 text-pink-500 border border-pink-500/20' 
                          : 'bg-sky-500/10 text-sky-500 border border-sky-500/20'
                      }`}>
                        {row.Jenis_Kelamin}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 text-center font-bold text-[var(--text-primary)]">
                      {row.Golongan_Darah}
                    </td>
                    <td className="px-6 py-4.5 text-center font-bold text-[var(--text-primary)]">
                      {row.Risiko === 'Rentan' || row.Prediksi === 'Rentan' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                          Rentan
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-500 border border-teal-500/20">
                          Tidak Rentan
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-[var(--text-tertiary)] bg-[var(--bg-secondary)]">
                    Tidak ada data yang cocok dengan pencarian Anda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {sortedItems.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-[var(--bg-tertiary)] border-t border-[var(--border-color)]">
            {/* Rows per page dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-secondary)] font-medium">Baris per halaman:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs focus:outline-none font-semibold cursor-pointer"
              >
                {[5, 10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-end gap-1.5">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] disabled:opacity-40 hover:bg-[var(--border-color)] transition-colors"
                title="Halaman Pertama"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] disabled:opacity-40 hover:bg-[var(--border-color)] transition-colors"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>
              
              <span className="text-xs text-[var(--text-secondary)] font-semibold px-3">
                Halaman <span className="text-[var(--text-primary)] font-bold">{currentPage}</span> dari <span className="font-bold">{totalPages}</span>
              </span>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] disabled:opacity-40 hover:bg-[var(--border-color)] transition-colors"
                title="Halaman Selanjutnya"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] disabled:opacity-40 hover:bg-[var(--border-color)] transition-colors"
                title="Halaman Terakhir"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
