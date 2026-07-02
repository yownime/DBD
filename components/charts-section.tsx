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
  ReferenceLine,
} from 'recharts';
import { MalariaRecord, PredictionRecord } from '../utils/dbd-parser';

interface ChartsSectionProps {
  mode: 'historical' | 'prediction';
  historicalData: MalariaRecord[];
  predictionData: PredictionRecord[];
  isDark: boolean;
  projectionData?: any[];
}

export default function ChartsSection({
  mode,
  historicalData,
  predictionData,
  isDark,
  projectionData = [],
}: ChartsSectionProps) {
  
  // Custom colors for groups
  const COLORS = {
    // Kelompok Risiko Usia Colors
    Balita: '#14b8a6', // Teal 500
    Remaja: '#6366f1', // Indigo 500
    Dewasa: '#f59e0b', // Amber 500
    Lansia: '#f43f5e', // Rose 500
    
    // Gender Colors
    Laki_Laki: '#0ea5e9', // Sky 500
    Perempuan: '#ec4899', // Pink 500
    
    // Blood Type Colors
    BloodA: '#ef4444',
    BloodB: '#3b82f6',
    BloodAB: '#8b5cf6',
    BloodO: '#10b981',
  };

  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const textColor = isDark ? '#cbd5e1' : '#475569';
  const tooltipBg = isDark ? '#1e293b' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#e2e8f0';

  // Static SVM Model Metrics (based on training evaluation results)
  const cvData = [
    { name: 'Fold 1', Skor: 0.8144 },
    { name: 'Fold 2', Skor: 0.8204 },
    { name: 'Fold 3', Skor: 0.8204 },
    { name: 'Fold 4', Skor: 0.8204 },
    { name: 'Fold 5', Skor: 0.8144 },
  ];
  const cvMean = 0.8200;

  // Actual vs Predicted classes from test validation
  // Classes: ['Balita (0-5)', 'Remaja (6-17)', 'Dewasa (18-45)', 'Lansia (46+)']
  // Rows: Actual, Cols: Predicted
  const confusionMatrix = [
    { actual: 'Balita (0-5)',   'Balita (0-5)': 39, 'Remaja (6-17)': 5,  'Dewasa (18-45)': 3,   'Lansia (46+)': 1  },
    { actual: 'Remaja (6-17)', 'Balita (0-5)': 15, 'Remaja (6-17)': 88, 'Dewasa (18-45)': 18,  'Lansia (46+)': 4  },
    { actual: 'Dewasa (18-45)','Balita (0-5)': 5,  'Remaja (6-17)': 20, 'Dewasa (18-45)': 232, 'Lansia (46+)': 26 },
    { actual: 'Lansia (46+)',  'Balita (0-5)': 1,  'Remaja (6-17)': 5,  'Dewasa (18-45)': 20,  'Lansia (46+)': 352},
  ];

  // 1. Calculations for Historical Mode
  const historicalStats = useMemo(() => {
    if (mode !== 'historical' || historicalData.length === 0) return null;

    const yearCounts: { [year: number]: number } = {};
    const riskCounts = { 'Balita (0-5)': 0, 'Remaja (6-17)': 0, 'Dewasa (18-45)': 0, 'Lansia (46+)': 0 };
    const bloodCounts = { 'A': 0, 'B': 0, 'AB': 0, 'O': 0 };
    const yearRiskCounts: { [year: number]: { [risk: string]: number } } = {};
    let maleCount = 0;
    let femaleCount = 0;

    historicalData.forEach((r) => {
      // Year Trend
      const year = r.Tahun;
      yearCounts[year] = (yearCounts[year] || 0) + 1;
      
      // Risk Groups
      const riskKey = r.Risiko as keyof typeof riskCounts;
      if (riskKey in riskCounts) {
        riskCounts[riskKey]++;
      }

      // Year & Risk Group combination for grouped bar chart
      if (!yearRiskCounts[year]) {
        yearRiskCounts[year] = { 'Balita (0-5)': 0, 'Remaja (6-17)': 0, 'Dewasa (18-45)': 0, 'Lansia (46+)': 0 };
      }
      if (riskKey in yearRiskCounts[year]) {
        yearRiskCounts[year][riskKey]++;
      }
      
      // Blood Type
      const bloodKey = r.Golongan_Darah as keyof typeof bloodCounts;
      if (bloodKey in bloodCounts) {
        bloodCounts[bloodKey]++;
      }
      
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

    // Convert yearRiskCounts into Recharts format
    const yearlyRiskTrend = Object.entries(yearRiskCounts)
      .map(([year, counts]) => ({
        name: year,
        'Balita (0-5)': counts['Balita (0-5)'],
        'Remaja (6-17)': counts['Remaja (6-17)'],
        'Dewasa (18-45)': counts['Dewasa (18-45)'],
        'Lansia (46+)': counts['Lansia (46+)'],
      }))
      .sort((a, b) => Number(a.name) - Number(b.name));

    const riskData = [
      { name: 'Balita (0-5)', value: riskCounts['Balita (0-5)'], color: COLORS.Balita },
      { name: 'Remaja (6-17)', value: riskCounts['Remaja (6-17)'], color: COLORS.Remaja },
      { name: 'Dewasa (18-45)', value: riskCounts['Dewasa (18-45)'], color: COLORS.Dewasa },
      { name: 'Lansia (46+)', value: riskCounts['Lansia (46+)'], color: COLORS.Lansia },
    ];

    const bloodData = [
      { name: 'Golongan A', value: bloodCounts['A'], color: COLORS.BloodA },
      { name: 'Golongan B', value: bloodCounts['B'], color: COLORS.BloodB },
      { name: 'Golongan AB', value: bloodCounts['AB'], color: COLORS.BloodAB },
      { name: 'Golongan O', value: bloodCounts['O'], color: COLORS.BloodO },
    ];

    const genderData = [
      { name: 'Laki Laki', value: maleCount, color: COLORS.Laki_Laki },
      { name: 'Perempuan', value: femaleCount, color: COLORS.Perempuan },
    ];

    return { yearlyTrend, yearlyRiskTrend, riskData, bloodData, genderData };
  }, [historicalData, mode]);

  // 2. Calculations for Prediction Mode
  const predictionStats = useMemo(() => {
    if (mode !== 'prediction' || predictionData.length === 0) return null;

    const predRiskCounts = { 'Balita (0-5)': 0, 'Remaja (6-17)': 0, 'Dewasa (18-45)': 0, 'Lansia (46+)': 0 };
    const bloodCounts = { 'A': 0, 'B': 0, 'AB': 0, 'O': 0 };
    let maleCount = 0;
    let femaleCount = 0;

    predictionData.forEach((r) => {
      const predKey = r.Prediksi as keyof typeof predRiskCounts;
      if (predKey in predRiskCounts) {
        predRiskCounts[predKey]++;
      }
      
      const bloodKey = r.Golongan_Darah as keyof typeof bloodCounts;
      if (bloodKey in bloodCounts) {
        bloodCounts[bloodKey]++;
      }

      if (r.Jenis_Kelamin === 'Perempuan') {
        femaleCount++;
      } else {
        maleCount++;
      }
    });

    const riskPieData = [
      { name: 'Balita (0-5)', value: predRiskCounts['Balita (0-5)'], color: COLORS.Balita },
      { name: 'Remaja (6-17)', value: predRiskCounts['Remaja (6-17)'], color: COLORS.Remaja },
      { name: 'Dewasa (18-45)', value: predRiskCounts['Dewasa (18-45)'], color: COLORS.Dewasa },
      { name: 'Lansia (46+)', value: predRiskCounts['Lansia (46+)'], color: COLORS.Lansia },
    ];

    const bloodData = [
      { name: 'A', value: bloodCounts['A'], color: COLORS.BloodA },
      { name: 'B', value: bloodCounts['B'], color: COLORS.BloodB },
      { name: 'AB', value: bloodCounts['AB'], color: COLORS.BloodAB },
      { name: 'O', value: bloodCounts['O'], color: COLORS.BloodO },
    ];

    const genderData = [
      { name: 'Laki Laki', value: maleCount, color: COLORS.Laki_Laki },
      { name: 'Perempuan', value: femaleCount, color: COLORS.Perempuan },
    ];

    return { riskPieData, bloodData, genderData };
  }, [predictionData, mode]);

  if (mode === 'historical' && historicalStats) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Tren Kasus DBD */}
        <div className="p-6 rounded-2xl glass-panel border border-[var(--border-color)] animate-fade-in">
          <h4 className="text-sm font-bold text-[var(--text-primary)] mb-4 tracking-tight uppercase">
            Tren Kasus DBD per Tahun (2019-2024)
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
                  stroke={COLORS.Remaja}
                  strokeWidth={3}
                  activeDot={{ r: 6 }}
                  name="Jumlah Kasus"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribusi Kelompok Risiko per Tahun (Grouped Bar Chart) */}
        <div className="p-6 rounded-2xl glass-panel border border-[var(--border-color)] animate-fade-in">
          <h4 className="text-sm font-bold text-[var(--text-primary)] mb-4 tracking-tight uppercase">
            Distribusi Kelompok Risiko per Tahun
          </h4>
          <div className="h-80 chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={historicalStats.yearlyRiskTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" stroke={textColor} fontSize={12} tickLine={false} />
                <YAxis stroke={textColor} fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: 8, color: textColor }}
                />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="Balita (0-5)" fill={COLORS.Balita} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Remaja (6-17)" fill={COLORS.Remaja} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Dewasa (18-45)" fill={COLORS.Dewasa} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Lansia (46+)" fill={COLORS.Lansia} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Proyeksi Kasus & Kelompok Risiko SVM (2019-2027) */}
        {projectionData && projectionData.length > 0 && (
          <div className="p-6 rounded-2xl glass-panel border border-[var(--border-color)] lg:col-span-2 animate-fade-in">
            <h4 className="text-sm font-bold text-[var(--text-primary)] mb-4 tracking-tight uppercase">
              Proyeksi Kelompok Risiko Usia Menggunakan SVM (2019-2027)
            </h4>
            <div className="h-80 chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projectionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="Tahun" stroke={textColor} fontSize={12} tickLine={false} />
                  <YAxis stroke={textColor} fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: 8, color: textColor }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <ReferenceLine x={2024} stroke="#f43f5e" strokeDasharray="5 5" label={{ value: 'Mulai Proyeksi', fill: '#f43f5e', position: 'insideTopRight', fontSize: 11 }} />
                  <Line type="monotone" dataKey="Balita (0-5)" stroke={COLORS.Balita} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Remaja (6-17)" stroke={COLORS.Remaja} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Dewasa (18-45)" stroke={COLORS.Dewasa} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Lansia (46+)" stroke={COLORS.Lansia} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Distribusi Kelompok Risiko Usia (Pie Chart) */}
        <div className="p-6 rounded-2xl glass-panel border border-[var(--border-color)] animate-fade-in">
          <h4 className="text-sm font-bold text-[var(--text-primary)] mb-4 tracking-tight uppercase">
            Proporsi Kelompok Risiko Usia (Total)
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
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {historicalStats.riskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: 8 }}
                    formatter={(value: any) => [value, 'Kasus']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 px-6 space-y-2">
              {historicalStats.riskData.map((entry, index) => {
                const total = historicalStats.riskData.reduce((a, b) => a + b.value, 0);
                const percent = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0';
                return (
                  <div key={index} className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-tertiary)]">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">{entry.name}</span>
                    </div>
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {entry.value.toLocaleString()} ({percent}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Distribusi Golongan Darah */}
        <div className="p-6 rounded-2xl glass-panel border border-[var(--border-color)] animate-fade-in">
          <h4 className="text-sm font-bold text-[var(--text-primary)] mb-4 tracking-tight uppercase">
            Persebaran Golongan Darah Pasien
          </h4>
          <div className="h-80 chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={historicalStats.bloodData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" stroke={textColor} fontSize={11} tickLine={false} />
                <YAxis stroke={textColor} fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: 8, color: textColor }}
                />
                <Bar dataKey="value" fill={COLORS.BloodB} name="Pasien" radius={[4, 4, 0, 0]}>
                  {historicalStats.bloodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribusi Gender */}
        <div className="p-6 rounded-2xl glass-panel border border-[var(--border-color)] animate-fade-in">
          <h4 className="text-sm font-bold text-[var(--text-primary)] mb-4 tracking-tight uppercase">
            Proporsi Jenis Kelamin Pasien
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
                const percent = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0';
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

        {/* Section: SVM Model Evaluation & Metrics */}
        <div className="p-6 rounded-2xl glass-panel border border-[var(--border-color)] lg:col-span-2 space-y-6">
          <div>
            <h4 className="text-sm font-bold text-[var(--text-primary)] tracking-tight uppercase mb-1">
              Grafik Evaluasi Model SVM AI
            </h4>
            <p className="text-xs text-[var(--text-secondary)]">Karakteristik performa model SVM hasil training dan validasi 5-Fold.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Cross-Validation Score */}
            <div className="space-y-4">
              <h5 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">Cross-Validation Scores (5-Fold)</h5>
              <div className="h-64 chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cvData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="name" stroke={textColor} fontSize={11} tickLine={false} />
                    <YAxis stroke={textColor} fontSize={12} tickLine={false} domain={[0.6, 1.0]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: 8, color: textColor }}
                    />
                    <ReferenceLine y={cvMean} stroke="#ef4444" strokeDasharray="3 3" label={{ value: `Rerata: ${(cvMean*100).toFixed(1)}%`, fill: '#ef4444', position: 'top', fontSize: 10 }} />
                    <Bar dataKey="Skor" fill="#6366f1" radius={[4, 4, 0, 0]} name="Akurasi" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Confusion Matrix heat-grid */}
            <div className="space-y-4 flex flex-col justify-between">
              <h5 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">Confusion Matrix (Akurasi: 85.3%)</h5>
              <div className="border border-[var(--border-color)] rounded-xl overflow-hidden text-xs bg-[var(--bg-tertiary)] flex-1 flex flex-col justify-center">
                <table className="w-full text-center border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] font-bold text-[var(--text-primary)]">
                      <th className="p-2 border-r border-[var(--border-color)] text-[10px] text-left">Aktual \ Prediksi</th>
                      <th className="p-2 text-[10px]">Balita</th>
                      <th className="p-2 text-[10px]">Remaja</th>
                      <th className="p-2 text-[10px]">Dewasa</th>
                      <th className="p-2 text-[10px]">Lansia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {confusionMatrix.map((row, i) => (
                      <tr key={i} className="border-b border-[var(--border-color)] last:border-none">
                        <td className="p-2 font-bold border-r border-[var(--border-color)] text-[10px] text-left">{row.actual}</td>
                        <td className={`p-2 font-bold ${row['Balita (0-5)'] > 0 ? 'bg-teal-500/25 text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] font-normal opacity-40'}`}>{row['Balita (0-5)']}</td>
                        <td className={`p-2 font-bold ${row['Remaja (6-17)'] > 0 ? 'bg-indigo-500/25 text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] font-normal opacity-40'}`}>{row['Remaja (6-17)']}</td>
                        <td className={`p-2 font-bold ${row['Dewasa (18-45)'] > 0 ? 'bg-amber-500/25 text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] font-normal opacity-40'}`}>{row['Dewasa (18-45)']}</td>
                        <td className={`p-2 font-bold ${row['Lansia (46+)'] > 0 ? 'bg-rose-500/25 text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] font-normal opacity-40'}`}>{row['Lansia (46+)']}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  }

  if (mode === 'prediction' && predictionStats) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Proporsi Risiko Prediksi (Pie) */}
        <div className="p-6 rounded-2xl glass-panel border border-[var(--border-color)] animate-fade-in">
          <h4 className="text-sm font-bold text-[var(--text-primary)] mb-4 tracking-tight uppercase">
            Hasil Klasifikasi Kelompok Risiko AI (SVM)
          </h4>
          <div className="h-80 flex flex-col md:flex-row items-center justify-center">
            <div className="w-full md:w-1/2 h-64 chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={predictionStats.riskPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {predictionStats.riskPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: 8, color: textColor }}
                    formatter={(value: any) => [value, 'Kasus']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 px-6 space-y-2">
              {predictionStats.riskPieData.map((entry, index) => {
                const total = predictionStats.riskPieData.reduce((a, b) => a + b.value, 0);
                const percent = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0';
                return (
                  <div key={index} className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-tertiary)]">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">{entry.name}</span>
                    </div>
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {entry.value} ({percent}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Distribusi Golongan Darah - Prediksi */}
        <div className="p-6 rounded-2xl glass-panel border border-[var(--border-color)] animate-fade-in">
          <h4 className="text-sm font-bold text-[var(--text-primary)] mb-4 tracking-tight uppercase">
            Golongan Darah pada Dataset Prediksi
          </h4>
          <div className="h-80 chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={predictionStats.bloodData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" stroke={textColor} fontSize={12} tickLine={false} />
                <YAxis stroke={textColor} fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: 8, color: textColor }}
                />
                <Bar dataKey="value" fill={COLORS.BloodA} name="Pasien" radius={[4, 4, 0, 0]}>
                  {predictionStats.bloodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Jenis Kelamin - Prediksi */}
        <div className="p-6 rounded-2xl glass-panel border border-[var(--border-color)] lg:col-span-2 animate-fade-in">
          <h4 className="text-sm font-bold text-[var(--text-primary)] mb-4 tracking-tight uppercase">
            Proporsi Jenis Kelamin Dataset Prediksi
          </h4>
          <div className="h-48 flex flex-col md:flex-row items-center justify-center">
            <div className="w-full md:w-1/2 h-36 chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={predictionStats.genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {predictionStats.genderData.map((entry, index) => (
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
            <div className="w-full md:w-1/2 px-6 flex gap-4">
              {predictionStats.genderData.map((entry, index) => {
                const total = predictionStats.genderData.reduce((a, b) => a + b.value, 0);
                const percent = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0';
                return (
                  <div key={index} className="flex-1 flex flex-col items-center justify-center p-4 rounded-xl bg-[var(--bg-tertiary)]">
                    <div className="w-3.5 h-3.5 rounded-full mb-1" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs font-medium text-[var(--text-secondary)]">{entry.name}</span>
                    <span className="text-base font-bold text-[var(--text-primary)] mt-1">
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

  return (
    <div className="p-12 rounded-2xl glass-panel border border-[var(--border-color)] text-center text-[var(--text-secondary)]">
      Tidak ada data visualisasi untuk ditampilkan.
    </div>
  );
}
