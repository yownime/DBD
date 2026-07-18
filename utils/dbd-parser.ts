import * as XLSX from 'xlsx';

export interface MalariaRecord {
  No: number;
  Provinsi: string;
  Kabupaten: string;
  Desa: string;
  Dusun: string;
  Alamat: string;
  Usia: number;
  Jenis_Kelamin: string;
  Golongan_Darah: string;
  Tahun: number;
  Risiko: string;
}

// Map alias for easier migration
export type DBDRecord = MalariaRecord;

export interface PredictionRecord {
  No: number;
  Provinsi: string;
  Kabupaten: string;
  Desa: string;
  Dusun: string;
  Alamat: string;
  Usia: number;
  Jenis_Kelamin: string;
  Golongan_Darah: string;
  Tahun: number;
  Prediksi: string;
}

export async function fetchAndParseHistoricalData(): Promise<MalariaRecord[]> {
  try {
    const response = await fetch('/data/malaria_historis.xlsx');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);
    
    return jsonData.map((row: any) => ({
      No: Number(row.No || 0),
      Provinsi: String(row.Provinsi || '-').trim().toUpperCase(),
      Kabupaten: String(row.Kabupaten || '-').trim().toUpperCase(),
      Desa: String(row.Desa || '-').trim().toUpperCase(),
      Dusun: String(row.Dusun || '-').trim().toUpperCase(),
      Alamat: String(row.Alamat || '-').trim().toUpperCase(),
      Usia: Number(row.Usia || 0),
      Jenis_Kelamin: String(row.Jenis_Kelamin || 'Laki Laki').trim(),
      Golongan_Darah: String(row.Golongan_Darah || 'O').trim().toUpperCase(),
      Tahun: Number(row.Tahun || 2024),
      Risiko: String(row.Risiko || 'Tidak Rentan').trim()
    }));
  } catch (error) {
    console.error("Error loading or parsing malaria excel file:", error);
    throw error;
  }
}
