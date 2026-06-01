"use client";

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { DBDRecord, PredictionRecord, aggregateHistoricalData } from '../utils/dbd-parser';

interface ChartsSectionProps {
  mode: 'historical' | 'prediction';
  historicalData: DBDRecord[];
  predictionData: PredictionRecord[];
  isDark: boolean;
}

export default function ChartsSection({
  mode,
  historicalData,
  predictionData,
  isDark,
}: ChartsSectionProps) {
  // Common colors
  const COLORS = {
    Rendah: '#10b981', // Emerald 500
    Sedang: '#f59e0b', // Amber 500
    Tinggi: '#ef4444', // Red 500
    Laki_Laki: '#0ea5e9', // Sky 500
    Perempuan: '#ec4899', // Pink 500
    Accent1: '#6366f1', // Indigo 500
    Accent2: '#8b5cf6', // Purple 500
  };

  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const textColor = isDark ? '#cbd5e1' : '#475569';
  const tooltipBg = isDark ? '#1e293b' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#e2e8f0';

  // 1. Calculations for Historical Mode
  const historicalStats = useMemo(() => {
    if (mode !== 'historical' || historicalData.length === 0) return null;

    // Group cases by year
    const yearCounts: { [year: number]: number } = {};
    const regionCounts: { [region: string]: number } = {};
    let maleCount = 0;
    let femaleCount = 0;

    historicalData.forEach((r) => {
      // Year
      yearCounts[r.Tahun] = (yearCounts[r.Tahun] || 0) + 1;
      // Region
      regionCounts[r.Wilayah] = (regionCounts[r.Wilayah] || 0) + 1;
      // Gender
      if (r.Jenis_Kelamin === 'Perempuan') {
        femaleCount++;
      } else {
        maleCount++;
      }
    });

    const yearlyTrend = Object.entries(yearCounts)
      .map(([year, count]) => ({
        name: year,
        Kasus: count,
      }))
      .sort((a, b) => Number(a.name) - Number(b.name));

    const topRegions = Object.entries(regionCounts)
      .map(([region, count]) => ({
        name: region,
        Kasus: count,
      }))
      .sort((a, b) => b.Kasus - a.Kasus)
      .slice(0, 10);

    const genderData = [
      { name: 'Laki Laki', value: maleCount, color: COLORS.Laki_Laki },
      { name: 'Perempuan', value: femaleCount, color: COLORS.Perempuan },
    ];

    // Risk distribution based on aggregations
    const aggregated = aggregateHistoricalData(historicalData);
    const riskCounts = { Rendah: 0, Sedang: 0, Tinggi: 0 };
    aggregated.forEach((r) => {
      if (r.Risiko === 'Rendah') riskCounts.Rendah++;
      else if (r.Risiko === 'Sedang') riskCounts.Sedang++;
      else if (r.Risiko === 'Tinggi') riskCounts.Tinggi++;
    });

    const riskData = [
      { name: 'Rendah', value: riskCounts.Rendah, color: COLORS.Rendah },
      { name: 'Sedang', value: riskCounts.Sedang, color: COLORS.Sedang },
      { name: 'Tinggi', value: riskCounts.Tinggi, color: COLORS.Tinggi },
    ];

    return { yearlyTrend, topRegions, genderData, riskData };
  }, [historicalData, mode]);

  // 2. Calculations for Prediction Mode
  const predictionStats = useMemo(() => {
    if (mode !== 'prediction' || predictionData.length === 0) return null;

    // Predicted risk counts
    const predRiskCounts = { Rendah: 0, Sedang: 0, Tinggi: 0 };
    const actualRiskCounts = { Rendah: 0, Sedang: 0, Tinggi: 0 };
    const regionCases: { [region: string]: number } = {};

    predictionData.forEach((r) => {
      predRiskCounts[r.Prediksi as keyof typeof predRiskCounts] = 
        (predRiskCounts[r.Prediksi as keyof typeof predRiskCounts] || 0) + 1;
      
      actualRiskCounts[r.Risiko as keyof typeof actualRiskCounts] = 
        (actualRiskCounts[r.Risiko as keyof typeof actualRiskCounts] || 0) + 1;
        
      regionCases[r.Wilayah] = r.Jumlah_Kasus;
    });

    const topRegions = Object.entries(regionCases)
      .map(([region, cases]) => ({
        name: region,
        Kasus: cases,
      }))
      .sort((a, b) => b.Kasus - a.Kasus)
      .slice(0, 10);

    const comparisonData = [
      {
        name: 'Rendah',
        'Aturan (Jumlah)': actualRiskCounts.Rendah,
        'Prediksi AI (SVM)': predRiskCounts.Rendah,
      },
      {
        name: 'Sedang',
        'Aturan (Jumlah)': actualRiskCounts.Sedang,
        'Prediksi AI (SVM)': predRiskCounts.Sedang,
      },
      {
        name: 'Tinggi',
        'Aturan (Jumlah)': actualRiskCounts.Tinggi,
        'Prediksi AI (SVM)': predRiskCounts.Tinggi,
      },
    ];

    const predRiskPieData = [
      { name: 'Rendah', value: predRiskCounts.Rendah, color: COLORS.Rendah },
      { name: 'Sedang', value: predRiskCounts.Sedang, color: COLORS.Sedang },
      { name: 'Tinggi', value: predRiskCounts.Tinggi, color: COLORS.Tinggi },
    ];

    return { topRegions, comparisonData, predRiskPieData };
  }, [predictionData, mode]);

  if (mode === 'historical' && historicalStats) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Kasus DBD */}
        <div className="p-6 rounded-2xl glass-panel border border-[var(--border-color)] animate-fade-in">
          <h4 className="text-sm font-bold text-[var(--text-primary)] mb-4 tracking-tight uppercase">
            Tren Kasus DBD (2019-2024)
          </h4>
          <div className="h-80 chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalStats.yearlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" stroke={textColor} fontSize={12} tickLine={false} />
                <YAxis stroke={textColor} fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: 8, color: textColor }}
                />
                <Legend verticalAlign="top" height={36} />
                <Line
                  type="monotone"
                  dataKey="Kasus"
                  stroke={COLORS.Accent1}
                  strokeWidth={3}
                  activeDot={{ r: 6 }}
                  name="Jumlah Kasus"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 10 Wilayah Kasus Terbanyak */}
        <div className="p-6 rounded-2xl glass-panel border border-[var(--border-color)] animate-fade-in">
          <h4 className="text-sm font-bold text-[var(--text-primary)] mb-4 tracking-tight uppercase">
            Top 10 Wilayah Kasus Terbanyak
          </h4>
          <div className="h-80 chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={historicalStats.topRegions} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" stroke={textColor} fontSize={10} tickLine={false} interval={0} tickFormatter={(v) => v.slice(0, 10)} />
                <YAxis stroke={textColor} fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: 8, color: textColor }}
                />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="Kasus" fill={COLORS.Accent1} name="Total Kasus" radius={[4, 4, 0, 0]}>
                  {historicalStats.topRegions.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? COLORS.Accent1 : COLORS.Accent2} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribusi Gender */}
        <div className="p-6 rounded-2xl glass-panel border border-[var(--border-color)] animate-fade-in">
          <h4 className="text-sm font-bold text-[var(--text-primary)] mb-4 tracking-tight uppercase">
            Proporsi Jenis Kelamin
          </h4>
          <div className="h-80 flex flex-col md:flex-row items-center justify-center">
            <div className="w-full md:w-1/2 h-64 chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={historicalStats.genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {historicalStats.genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: 8 }}
                    formatter={(value: any) => [value, 'Pasien']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 px-6 space-y-3">
              {historicalStats.genderData.map((entry, index) => {
                const total = historicalStats.genderData.reduce((a, b) => a + b.value, 0);
                const percent = ((entry.value / total) * 100).toFixed(1);
                return (
                  <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-tertiary)]">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-sm font-medium text-[var(--text-secondary)]">{entry.name}</span>
                    </div>
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      {entry.value.toLocaleString()} ({percent}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Distribusi Risiko Wilayah */}
        <div className="p-6 rounded-2xl glass-panel border border-[var(--border-color)] animate-fade-in">
          <h4 className="text-sm font-bold text-[var(--text-primary)] mb-4 tracking-tight uppercase">
            Kategori Risiko Wilayah (Kasus per Tahun)
          </h4>
          <div className="h-80 flex flex-col md:flex-row items-center justify-center">
            <div className="w-full md:w-1/2 h-64 chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={historicalStats.riskData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="name"
                  >
                    {historicalStats.riskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: 8, color: textColor }}
                    formatter={(value: any, name: any) => {
                      const total = historicalStats.riskData.reduce((a, b) => a + b.value, 0);
                      const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                      return [`${value} kombinasi wilayah (${pct}%)`, `Risiko ${name}`];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 px-6 space-y-3">
              {historicalStats.riskData.map((entry, index) => {
                const total = historicalStats.riskData.reduce((a, b) => a + b.value, 0);
                const percent = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0';
                return (
                  <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-tertiary)]">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-sm font-medium text-[var(--text-secondary)]">{entry.name}</span>
                    </div>
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      {entry.value} ({percent}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'prediction' && predictionStats) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kasus di Wilayah Prediksi */}
        <div className="p-6 rounded-2xl glass-panel border border-[var(--border-color)] animate-fade-in">
          <h4 className="text-sm font-bold text-[var(--text-primary)] mb-4 tracking-tight uppercase">
            Prediksi Kasus per Wilayah (10 Teratas)
          </h4>
          <div className="h-80 chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={predictionStats.topRegions} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" stroke={textColor} fontSize={10} tickLine={false} interval={0} tickFormatter={(v) => v.slice(0, 10)} />
                <YAxis stroke={textColor} fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: 8, color: textColor }}
                />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="Kasus" fill={COLORS.Accent1} name="Jumlah Kasus" radius={[4, 4, 0, 0]}>
                  {predictionStats.topRegions.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? COLORS.Accent1 : COLORS.Accent2} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Perbandingan Aturan vs Model SVM AI */}
        <div className="p-6 rounded-2xl glass-panel border border-[var(--border-color)] animate-fade-in">
          <h4 className="text-sm font-bold text-[var(--text-primary)] mb-4 tracking-tight uppercase">
            Perbandingan Risiko: Aturan Manual vs Prediksi AI SVM
          </h4>
          <div className="h-80 chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={predictionStats.comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" stroke={textColor} fontSize={12} tickLine={false} />
                <YAxis stroke={textColor} fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: 8, color: textColor }}
                />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="Aturan (Jumlah)" fill="#84cc16" name="Klasifikasi Aturan" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Prediksi AI (SVM)" fill={COLORS.Accent1} name="Prediksi SVM AI" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Proporsi Risiko Prediksi (Pie) */}
        <div className="p-6 rounded-2xl glass-panel border border-[var(--border-color)] lg:col-span-2 animate-fade-in">
          <h4 className="text-sm font-bold text-[var(--text-primary)] mb-4 tracking-tight uppercase">
            Proporsi Kategori Risiko Hasil Prediksi AI (SVM)
          </h4>
          <div className="h-64 flex flex-col md:flex-row items-center justify-center">
            <div className="w-full md:w-1/2 h-48 chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={predictionStats.predRiskPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="name"
                  >
                    {predictionStats.predRiskPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: 8, color: textColor }}
                    formatter={(value: any, name: any) => {
                      const total = predictionStats.predRiskPieData.reduce((a, b) => a + b.value, 0);
                      const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                      return [`${value} wilayah (${pct}%)`, `Prediksi Risiko ${name}`];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 px-6 grid grid-cols-3 gap-4">
              {predictionStats.predRiskPieData.map((entry, index) => {
                const total = predictionStats.predRiskPieData.reduce((a, b) => a + b.value, 0);
                const percent = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0';
                return (
                  <div key={index} className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[var(--bg-tertiary)] text-center">
                    <div className="w-3.5 h-3.5 rounded-full mb-2" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs font-bold text-[var(--text-secondary)] mb-1">{entry.name}</span>
                    <span className="text-lg font-extrabold text-[var(--text-primary)] leading-tight">
                      {entry.value}
                    </span>
                    <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                      ({percent}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-12 rounded-2xl glass-panel border border-[var(--border-color)] text-center text-[var(--text-secondary)]">
      Tidak ada data visualisasi untuk ditampilkan.
    </div>
  );
}
