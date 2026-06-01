"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
  DBDRecord, 
  fetchAndParseHistoricalData,
} from '../utils/dbd-parser';

export default function DashboardPage() {
  const [isDark, setIsDark] = useState(false);

  // Historical Data States
  const [historicalRecords, setHistoricalRecords] = useState<DBDRecord[]>([]);
  const [loadingHistorical, setLoadingHistorical] = useState(true);
  const [historicalError, setHistoricalError] = useState<string | null>(null);

  // ============================================================
  // FITUR_PREDIKSI_AI — State, Ref & Handlers (nonaktif sementara)
  // Untuk mengaktifkan kembali, bilang ke AI: "aktifkan fitur prediksi AI"
  // ============================================================
  /*
  FITUR_PREDIKSI_AI_START

  import * as XLSX from 'xlsx';
  import { PredictionRecord } from '../utils/dbd-parser';
  import { Brain, Upload, FileText, Activity, Sparkles } from 'lucide-react';
  import { useRef } from 'react';

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<any[]>([]);
  const [defaultTahun, setDefaultTahun] = useState<number>(2024);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [predictionRecords, setPredictionRecords] = useState<PredictionRecord[]>([]);
  const [predictionMeta, setPredictionMeta] = useState<{
    rawCases: number;
    filename: string;
    totalRegions: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setPredictionError('Tipe file tidak valid. Silakan upload file Excel (.xlsx atau .xls).');
      return;
    }
    setSelectedFile(file);
    setPredictionError(null);
    setPredictionRecords([]);
    setPredictionMeta(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const allRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        let headerRowIdx = 0;
        for (let i = 0; i < Math.min(15, allRows.length); i++) {
          const row = allRows[i];
          if (Array.isArray(row)) {
            const rowStr = row.map(cell => String(cell).toLowerCase().trim());
            const hasNo = rowStr.some(v => v === 'no' || v === 'no.' || v === 'no_');
            const hasProv = rowStr.some(v => v.includes('provinsi') || v.includes('kabupaten') || v.includes('desa'));
            if (hasNo && hasProv) { headerRowIdx = i; break; }
          }
        }
        const parsedData = XLSX.utils.sheet_to_json<any>(worksheet, { range: headerRowIdx });
        setFilePreview(parsedData.slice(0, 8));
      } catch (err) { console.error("Gagal membaca preview Excel:", err); }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      if (fileInputRef.current) {
        const dt = new DataTransfer();
        dt.items.add(files[0]);
        fileInputRef.current.files = dt.files;
        handleFileChange({ target: fileInputRef.current } as React.ChangeEvent<HTMLInputElement>);
      }
    }
  };

  const handleRunPrediction = async () => {
    if (!selectedFile) { setPredictionError('Silakan pilih atau seret file excel terlebih dahulu.'); return; }
    setLoadingPrediction(true);
    setPredictionError(null);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('default_tahun', defaultTahun.toString());
    try {
      const response = await fetch(`${API_URL}/api/predict`, { method: 'POST', body: formData });
      if (!response.ok) { const err = await response.json(); throw new Error(err.detail || 'Error dari server AI.'); }
      const result = await response.json();
      if (result.status === 'success') {
        setPredictionRecords(result.data);
        setPredictionMeta({ rawCases: result.raw_total_cases, filename: result.filename, totalRegions: result.total_predicted_regions });
      } else { throw new Error('Format respon API tidak valid.'); }
    } catch (err: any) {
      setPredictionError(err.message || 'Gagal menghubungi server FastAPI. Pastikan backend berjalan di port 8000.');
    } finally { setLoadingPrediction(false); }
  };

  const handleResetPrediction = () => {
    setSelectedFile(null); setFilePreview([]); setPredictionRecords([]);
    setPredictionMeta(null); setPredictionError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const predictionCardsData = useMemo(() => {
    if (predictionRecords.length === 0 || !predictionMeta) return null;
    let highRiskCount = 0, mediumRiskCount = 0, lowRiskCount = 0;
    predictionRecords.forEach(r => {
      if (r.Prediksi === 'Tinggi') highRiskCount++;
      else if (r.Prediksi === 'Sedang') mediumRiskCount++;
      else if (r.Prediksi === 'Rendah') lowRiskCount++;
    });
    return { totalCases: predictionMeta.rawCases, totalRegions: predictionMeta.totalRegions, highRiskCount, mediumRiskCount, lowRiskCount };
  }, [predictionRecords, predictionMeta]);

  FITUR_PREDIKSI_AI_END
  */

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

  // Load historical data on mount
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
        const data = await fetchAndParseHistoricalData();
        setHistoricalRecords(data);
      } catch (err: any) {
        setHistoricalError(
          'Gagal membaca file "public/data/dbd_historis.xlsx". Pastikan file excel berada di folder public/data/ dan formatnya benar.'
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
    const regions = new Set(historicalRecords.map(r => r.Wilayah));
    const totalRegions = regions.size;
    const sumAge = historicalRecords.reduce((acc, curr) => acc + curr.Usia, 0);
    const averageAge = Math.round((sumAge / totalCases) * 10) / 10;
    const femaleCount = historicalRecords.filter(r => r.Jenis_Kelamin === 'Perempuan').length;
    const femalePct = Math.round((femaleCount / totalCases) * 100);
    const malePct = 100 - femalePct;
    const genderRatio = `${malePct}% L / ${femalePct}% P`;

    const regionCounts: { [region: string]: number } = {};
    historicalRecords.forEach(r => {
      regionCounts[r.Wilayah] = (regionCounts[r.Wilayah] || 0) + 1;
    });
    let topRegion = '-';
    let maxCases = 0;
    Object.entries(regionCounts).forEach(([region, count]) => {
      if (count > maxCases) { maxCases = count; topRegion = region; }
    });

    return {
      totalCases,
      totalRegions,
      averageAge,
      genderRatio,
      topRegion: `${topRegion} (${maxCases.toLocaleString()} Kasus)`
    };
  }, [historicalRecords]);

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
              <span className="text-sky-500 font-bold">Dashboard Historis</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Dashboard Analisis Historis DBD
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Visualisasi default berdasarkan integrasi data DBD periode 2019-2024.
            </p>
          </div>
          
          <div className="flex items-center gap-2 bg-sky-500/10 border border-sky-500/20 px-4 py-2 rounded-xl text-sky-500 text-xs font-bold shadow-sm self-start md:self-auto">
            <Clock size={14} className="animate-spin" style={{ animationDuration: '6s' }} />
            <span>Update Data: Mei 2026</span>
          </div>
        </div>

        {/* ========================================================
            MODE 1 — HISTORICAL DASHBOARD 
           ======================================================== */}
        <div className="space-y-8">
          {historicalError ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-start gap-3">
              <AlertTriangle className="shrink-0 mt-0.5" size={18} />
              <span className="text-sm font-medium">{historicalError}</span>
            </div>
          ) : loadingHistorical ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <RefreshCw size={36} className="animate-spin text-sky-500" />
              <p className="text-sm font-semibold text-[var(--text-secondary)]">Memuat data historis DBD dari excel lokal...</p>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              {historicalCardsData && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                  <StatCard 
                    title="Total Kasus DBD" 
                    value={historicalCardsData.totalCases.toLocaleString()} 
                    icon={<Database size={20} />} 
                    description="Total catatan kasus 2019-2024"
                    color="sky"
                  />
                  <StatCard 
                    title="Wilayah Terjangkit" 
                    value={historicalCardsData.totalRegions} 
                    icon={<MapPin size={20} />} 
                    description="Desa/Kelurahan terdaftar"
                    color="indigo"
                  />
                  <StatCard 
                    title="Rata-rata Usia" 
                    value={`${historicalCardsData.averageAge} Tahun`} 
                    icon={<Users size={20} />} 
                    description="Rerata usia pasien DBD"
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
                    title="Wilayah Terawan" 
                    value={historicalCardsData.topRegion.split(' ')[0]} 
                    icon={<AlertTriangle size={20} />} 
                    description={historicalCardsData.topRegion.slice(historicalCardsData.topRegion.indexOf('('))}
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
              />

              {/* Data Table */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Tabel Data Kasus Historis</h3>
                  <p className="text-xs text-[var(--text-secondary)]">Rincian data individu pasien DBD yang terdaftar secara lokal.</p>
                </div>
                <DataTable type="raw" rawData={historicalRecords} />
              </div>
            </>
          )}
        </div>

        {/* ============================================================
            FITUR_PREDIKSI_AI — Section JSX Mode 2 (nonaktif sementara)
            Untuk mengaktifkan kembali, bilang ke AI: "aktifkan fitur prediksi AI"
            Semua kode lengkap ada dalam blok komentar di atas (FITUR_PREDIKSI_AI_START/END)
            ============================================================ */}

      </main>
    </div>
  );
}
