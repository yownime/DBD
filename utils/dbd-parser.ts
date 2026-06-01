import * as XLSX from 'xlsx';

export interface DBDRecord {
  No: number;
  Provinsi: string;
  Kabupaten: string;
  Desa: string;
  Dusun: string;
  Alamat: string;
  Negara: string;
  Usia: number;
  Jenis_Kelamin: string;
  Wilayah: string;
  Tahun: number;
}

export interface PredictionRecord {
  Tahun: number;
  Wilayah: string;
  Rata_Usia: number;
  Jumlah_Kasus: number;
  Risiko: string;
  Prediksi: string;
}

export interface AggregatedRecord {
  Tahun: number;
  Wilayah: string;
  Rata_Usia: number;
  Jumlah_Kasus: number;
  Risiko: string;
}

export async function fetchAndParseHistoricalData(): Promise<DBDRecord[]> {
  try {
    const response = await fetch('/data/dbd_historis.xlsx');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);
    
    // Map sheet columns to DBDRecord structure
    return jsonData.map((row: any) => ({
      No: Number(row.No || 0),
      Provinsi: String(row.Provinsi || '-').trim().toUpperCase(),
      Kabupaten: String(row.Kabupaten || '-').trim().toUpperCase(),
      Desa: String(row.Desa || '-').trim().toUpperCase(),
      Dusun: String(row.Dusun || '-').trim().toUpperCase(),
      Alamat: String(row.Alamat || '-').trim().toUpperCase(),
      Negara: String(row.Negara || 'INDONESIA').trim().toUpperCase(),
      Usia: Number(row.Usia || 0),
      Jenis_Kelamin: String(row.Jenis_Kelamin || 'Laki Laki').trim(),
      Wilayah: String(row.Wilayah || '-').trim().toUpperCase(),
      Tahun: Number(row.Tahun || 2024),
    }));
  } catch (error) {
    console.error("Error loading or parsing local excel file:", error);
    throw error;
  }
}

export function aggregateHistoricalData(records: DBDRecord[]): AggregatedRecord[] {
  const groups: { [key: string]: { ages: number[]; count: number } } = {};
  
  records.forEach(r => {
    const key = `${r.Tahun}|${r.Wilayah}`;
    if (!groups[key]) {
      groups[key] = { ages: [], count: 0 };
    }
    groups[key].ages.push(r.Usia);
    groups[key].count += 1;
  });
  
  const getRiskCategory = (cases: number): string => {
    if (cases < 20) return "Rendah";
    if (cases < 50) return "Sedang";
    return "Tinggi";
  };
  
  return Object.entries(groups).map(([key, data]) => {
    const [tahunStr, wilayah] = key.split('|');
    const avgAge = data.ages.length > 0 ? data.ages.reduce((a, b) => a + b, 0) / data.ages.length : 0;
    return {
      Tahun: Number(tahunStr),
      Wilayah: wilayah,
      Rata_Usia: Math.round(avgAge * 100) / 100,
      Jumlah_Kasus: data.count,
      Risiko: getRiskCategory(data.count)
    };
  });
}
