"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { 
  AlertTriangle, 
  RefreshCw,
  Clock,
  ChevronRight,
  Database
} from 'lucide-react';

import Sidebar from '../../components/sidebar';
import DataTable from '../../components/data-table';
import { 
  MalariaRecord,
} from '../../utils/dbd-parser';

export default function DataManagementPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);

  // Data States
  const [historicalRecords, setHistoricalRecords] = useState<MalariaRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Toggle theme
  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Authentication protection & Sync theme
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }

    async function loadData() {
      setLoadingData(true);
      setDataError(null);
      try {
        const res = await fetch('/data/malaria_data.json');
        if (res.ok) {
          const json = await res.json();
          setHistoricalRecords(json.historical || []);
        } else {
          throw new Error("Gagal mengambil data static JSON.");
        }
      } catch (err: any) {
        setDataError(
          'Gagal memuat data DBD dari berkas static JSON. Pastikan file "public/data/malaria_data.json" terbuat.'
        );
      } finally {
        setLoadingData(false);
      }
    }
    
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const shouldRender = isAuthenticated && !authLoading;

  if (!shouldRender) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-primary)] space-y-4">
        <RefreshCw size={36} className="animate-spin text-teal-500" />
        <p className="text-sm font-semibold text-[var(--text-secondary)]">Memeriksa autentikasi...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
      {/* Sidebar Navigation */}
      <Sidebar 
        isDark={isDark} 
        toggleTheme={toggleTheme} 
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto space-y-8">
        
        {/* Page Title & Breadcrumb */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] font-semibold tracking-wider uppercase mb-1.5">
              <span>Sistem AI DBD</span>
              <ChevronRight size={10} />
              <span className="text-teal-500 font-bold">Manajemen Data</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Manajemen Tabel Data Pasien
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Rincian data pasien lengkap dengan perbandingan Kategori Risiko Aktual vs Prediksi AI SVM.
            </p>
          </div>
          
          <div className="flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 px-4 py-2 rounded-xl text-teal-500 text-xs font-bold shadow-sm self-start md:self-auto">
            <Clock size={14} className="animate-spin" style={{ animationDuration: '6s' }} />
            <span>Update Data: Juni 2026</span>
          </div>
        </div>

        {/* Data Table Section */}
        <div className="space-y-6">
          {dataError ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-start gap-3">
              <AlertTriangle className="shrink-0 mt-0.5" size={18} />
              <span className="text-sm font-medium">{dataError}</span>
            </div>
          ) : loadingData ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <RefreshCw size={36} className="animate-spin text-teal-500" />
              <p className="text-sm font-semibold text-[var(--text-secondary)]">Memuat data DBD...</p>
            </div>
          ) : (
            <div className="glass-panel p-6 rounded-[var(--radius-card)] border border-[var(--border-color)] space-y-4">
              <div className="flex items-center gap-2 text-[var(--text-primary)]">
                <Database size={20} className="text-teal-500" />
                <h3 className="text-lg font-bold tracking-tight">Database Kasus & Prediksi SVM</h3>
              </div>
              <DataTable type="raw" rawData={historicalRecords} />
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
