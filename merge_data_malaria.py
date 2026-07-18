import os
import pandas as pd
import numpy as np

def clean_gender(val):
    if pd.isna(val):
        return 'Laki Laki'
    val_str = str(val).strip().title()
    if 'Perempuan' in val_str or 'P' == val_str:
        return 'Perempuan'
    return 'Laki Laki'

def clean_age(val):
    try:
        if pd.isna(val):
            return 30
        if isinstance(val, str):
            digits = ''.join(c for c in val if c.isdigit())
            if digits:
                return int(digits)
            return 30
        return int(float(val))
    except Exception:
        return 30

def clean_blood_type(val):
    if pd.isna(val):
        return 'O'
    val_str = str(val).strip().upper()
    if val_str in ['A', 'B', 'O', 'AB']:
        return val_str
    return 'O'

def get_vulnerability(row):
    usia = int(row['Usia'])
    jk = str(row['Jenis_Kelamin']).strip().upper()
    gd = str(row['Golongan_Darah']).strip().upper()
    alamat = str(row['Alamat']).strip().upper()
    desa = str(row['Desa']).strip().upper()
    
    # 1. Age factor (Balita <= 5 or Lansia >= 46 are vulnerable)
    is_vulnerable_age = (usia <= 5 or usia >= 46)
    
    # 2. Location factor (top 10 kelurahans in Asahan)
    target_desas = ['MUTIARA', 'SENTANG', 'SIUMBUT-UMBUT', 'SIUMBUT UMBUT', 'LESTARI', 'SIUMBUT BARU', 'SELAWAN', 'BUNUT BARAT', 'TELADAN', 'KISARAN NAGA', 'SIDOMUKTI']
    is_in_top_kelurahan = any(d in alamat or d in desa for d in target_desas)
    
    # 3. Blood type factor (O and A)
    is_vulnerable_blood = gd in ['O', 'A']
    
    # 4. Gender factor (Perempuan)
    is_vulnerable_gender = (jk == 'PEREMPUAN')
    
    # Rule
    if is_vulnerable_age or (is_in_top_kelurahan and (is_vulnerable_blood or is_vulnerable_gender)):
        return 'Rentan'
    return 'Tidak Rentan'


def main():
    print("Memulai penggabungan dataset Malaria...")
    file_paths = {
        2019: 'dataset/MALARIA2019.xlsx',
        2020: 'dataset/MALARIA2020.xlsx',
        2021: 'dataset/MALARIA2021.xlsx',
        2022: 'dataset/MALARIA2022.xlsx',
        2023: 'dataset/MALARIA2023.xlsx',
        2024: 'dataset/MALARIA2024.xlsx',
    }

    all_dfs = []

    for year, path in file_paths.items():
        if not os.path.exists(path):
            print(f"File tidak ditemukan: {path}")
            continue
        print(f"Membaca data tahun {year}...")
        df = pd.read_excel(path)
        
        # Create standard columns
        clean_df = pd.DataFrame()
        
        # 1. No
        no_col = [c for c in df.columns if str(c).strip().lower() in ['no', 'no.']]
        clean_df['No'] = df[no_col[0]] if no_col else range(1, len(df) + 1)
        
        # 2. Provinsi
        prov_col = [c for c in df.columns if 'provinsi' in str(c).strip().lower()]
        clean_df['Provinsi'] = df[prov_col[0]] if prov_col else 'SUMATERA UTARA'
        
        # 3. Kabupaten
        kab_col = [c for c in df.columns if 'kabupaten' in str(c).strip().lower()]
        clean_df['Kabupaten'] = df[kab_col[0]] if kab_col else '-'
        
        # 4. Desa
        if year == 2024:
            # Prefer Desa Domisili for 2024
            desa_col = [c for c in df.columns if 'domisili' in str(c).strip().lower()]
            if not desa_col:
                desa_col = [c for c in df.columns if str(c).strip().lower() == 'desa']
        else:
            desa_col = [c for c in df.columns if str(c).strip().lower() == 'desa']
            
        clean_df['Desa'] = df[desa_col[0]] if desa_col else '-'
        
        # 5. Dusun
        dusun_col = [c for c in df.columns if 'dusun' in str(c).strip().lower()]
        clean_df['Dusun'] = df[dusun_col[0]] if dusun_col else '-'
        
        # 6. Alamat
        alamat_col = [c for c in df.columns if 'alamat' in str(c).strip().lower()]
        clean_df['Alamat'] = df[alamat_col[0]] if alamat_col else '-'
        
        # 7. Usia
        usia_col = [c for c in df.columns if 'usia' in str(c).strip().lower() or 'umur' in str(c).strip().lower()]
        clean_df['Usia'] = df[usia_col[0]] if usia_col else 30
        
        # 8. Jenis Kelamin
        jk_col = [c for c in df.columns if 'kelamin' in str(c).strip().lower() or 'gender' in str(c).strip().lower()]
        clean_df['Jenis_Kelamin'] = df[jk_col[0]] if jk_col else 'Laki Laki'
        
        # 9. Golongan Darah
        gd_col = [c for c in df.columns if 'golongan darah' in str(c).strip().lower() or 'darah' in str(c).strip().lower()]
        clean_df['Golongan_Darah'] = df[gd_col[0]] if gd_col else 'O'
        
        # 10. Tahun
        clean_df['Tahun'] = year
        
        # Cleaning operations
        clean_df['Jenis_Kelamin'] = clean_df['Jenis_Kelamin'].apply(clean_gender)
        clean_df['Usia'] = clean_df['Usia'].apply(clean_age)
        clean_df['Golongan_Darah'] = clean_df['Golongan_Darah'].apply(clean_blood_type)
        
        for text_col in ['Provinsi', 'Kabupaten', 'Desa', 'Dusun', 'Alamat']:
            clean_df[text_col] = clean_df[text_col].fillna('-').astype(str).str.strip().str.upper()
            
        clean_df['Risiko'] = clean_df.apply(get_vulnerability, axis=1)
        
        all_dfs.append(clean_df)

    if not all_dfs:
        print("Tidak ada dataset yang berhasil digabungkan.")
        return

    merged_df = pd.concat(all_dfs, ignore_index=True)
    merged_df = merged_df.sort_values(by=['Tahun', 'No']).reset_index(drop=True)
    
    # Save to public/data/
    output_dir = 'public/data'
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, 'malaria_historis.xlsx')
    
    print(f"Menyimpan data gabungan ke {output_path} ({len(merged_df)} baris)...")
    merged_df.to_excel(output_path, index=False)
    print("Penggabungan selesai dengan sukses!")

if __name__ == "__main__":
    main()
