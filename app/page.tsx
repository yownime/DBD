"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth-context';
import { 
  Database, 
  MapPin, 
  Users, 
  UserPlus, 
  AlertTriangle, 
  RefreshCw,
  Clock,
  ChevronRight
} from 'lucide-react';

import Sidebar from '../components/sidebar';
import StatCard from '../components/stat-card';
import ChartsSection from '../components/charts-section';
import DataTable from '../components/data-table';
import { 
  MalariaRecord,
} from '../utils/dbd-parser';

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);

  // Authentication protection
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Prevent loading state flashes or data fetching when not authenticated
  const shouldRender = isAuthenticated && !authLoading;

  // Historical Data States
  const [historicalRecords, setHistoricalRecords] = useState<MalariaRecord[]>([]);
  const [projectionRecords, setProjectionRecords] = useState<any[]>([]);
  const [loadingHistorical, setLoadingHistorical] = useState(true);
  const [historicalError, setHistoricalError] = useState<string | null>(null);



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

  // Load historical data with SVM predictions and projections on mount
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
      setLoadingHistorical(true);
      setHistoricalError(null);
      try {
        const res = await fetch('/data/malaria_data.json');
        if (res.ok) {
          const json = await res.json();
          setHistoricalRecords(json.historical || []);
          setProjectionRecords(json.projection || []);
        } else {
          throw new Error("Gagal mengambil data static JSON.");
        }
      } catch (err: any) {
        setHistoricalError(
          'Gagal memuat data Malaria dari berkas static JSON. Pastikan file "public/data/malaria_data.json" terbuat.'
        );
      } finally {
        setLoadingHistorical(false);
      }
    }
    
    loadData();
  }, []);

  // Stats cards for historical mode
  const historicalCardsData = useMemo(() => {
    if (historicalRecords.length === 0) return null;

    const totalCases = historicalRecords.length;
    const kabupatenSet = new Set(historicalRecords.map(r => r.Kabupaten).filter(k => k !== '-'));
    const totalKabupaten = kabupatenSet.size;
    const sumAge = historicalRecords.reduce((acc, curr) => acc + curr.Usia, 0);
    const averageAge = Math.round((sumAge / totalCases) * 10) / 10;
    const femaleCount = historicalRecords.filter(r => r.Jenis_Kelamin === 'Perempuan').length;
    const femalePct = Math.round((femaleCount / totalCases) * 100);
    const malePct = 100 - femalePct;
    const genderRatio = `${malePct}% L / ${femalePct}% P`;

    // Most affected risk group
    const riskCounts: { [group: string]: number } = {};
    historicalRecords.forEach(r => {
      riskCounts[r.Risiko] = (riskCounts[r.Risiko] || 0) + 1;
    });
    let topGroup = '-';
    let maxCases = 0;
    Object.entries(riskCounts).forEach(([group, count]) => {
      if (count > maxCases) { maxCases = count; topGroup = group; }
    });

    return {
      totalCases,
      totalKabupaten,
      averageAge,
      genderRatio,
      topGroup: `${topGroup} (${maxCases.toLocaleString()} Kasus)`
    };
  }, [historicalRecords]);

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
              <span>Sistem AI Malaria</span>
              <ChevronRight size={10} />
              <span className="text-teal-500 font-bold">Dashboard Historis</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Dashboard Analisis Historis Malaria
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Visualisasi data Malaria Sumatera Utara periode 2019-2024 terintegrasi langsung dengan klasifikasi prediksi SVM.
            </p>
          </div>
          
          <div className="flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 px-4 py-2 rounded-xl text-teal-500 text-xs font-bold shadow-sm self-start md:self-auto">
            <Clock size={14} className="animate-spin" style={{ animationDuration: '6s' }} />
            <span>Update Data: Juni 2026</span>
          </div>
        </div>

        {/* ========================================================
            HISTORICAL DASHBOARD WITH INTEGRATED SVM PREDICTIONS
           ======================================================== */}
        <div className="space-y-8">
          {historicalError ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-start gap-3">
              <AlertTriangle className="shrink-0 mt-0.5" size={18} />
              <span className="text-sm font-medium">{historicalError}</span>
            </div>
          ) : loadingHistorical ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <RefreshCw size={36} className="animate-spin text-teal-500" />
              <p className="text-sm font-semibold text-[var(--text-secondary)]">Memuat data Malaria dan prediksi SVM...</p>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              {historicalCardsData && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                  <StatCard 
                    title="Total Kasus Malaria" 
                    value={historicalCardsData.totalCases.toLocaleString()} 
                    icon={<Database size={20} />} 
                    description="Catatan Kasus 2019-2024"
                    color="indigo"
                  />
                  <StatCard 
                    title="Kabupaten Terdampak" 
                    value={historicalCardsData.totalKabupaten} 
                    icon={<MapPin size={20} />} 
                    description="Kabupaten/Kota terdata"
                    color="emerald"
                  />
                  <StatCard 
                    title="Rata-rata Usia" 
                    value={`${historicalCardsData.averageAge} Tahun`} 
                    icon={<Users size={20} />} 
                    description="Rerata usia pasien"
                    color="emerald"
                  />
                  <StatCard 
                    title="Rasio Gender (L/P)" 
                    value={historicalCardsData.genderRatio} 
                    icon={<UserPlus size={20} />} 
                    description="Persentase Laki vs Perempuan"
                    color="amber"
                  />
                  <StatCard 
                    title="Kelompok Terrentan" 
                    value={historicalCardsData.topGroup.split(' ')[0]} 
                    icon={<AlertTriangle size={20} />} 
                    description={historicalCardsData.topGroup.slice(historicalCardsData.topGroup.indexOf('('))}
                    color="rose"
                  />
                </div>
              )}

              {/* Charts Section */}
              <ChartsSection 
                mode="historical" 
                historicalData={historicalRecords} 
                predictionData={[]} 
                isDark={isDark} 
                projectionData={projectionRecords}
              />

              {/* Data Table */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Tabel Data Kasus & Hasil Klasifikasi SVM</h3>
                  <p className="text-xs text-[var(--text-secondary)]">Rincian data pasien lengkap dengan perbandingan Kategori Risiko Aktual vs Prediksi AI SVM.</p>
                </div>
                <DataTable type="raw" rawData={historicalRecords} />
              </div>
            </>
          )}
        </div>

      </main>
    </div>
  );
}
