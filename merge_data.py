import os
import glob
import joblib
import pandas as pd
import numpy as np

def clean_gender(val):
    if pd.isna(val):
        return 'Laki Laki'
    val_str = str(val).strip().lower()
    if 'perempuan' in val_str or 'p' == val_str:
        return 'Perempuan'
    return 'Laki Laki'

def clean_age(val):
    try:
        if pd.isna(val):
            return 30
        # extract digit if string
        if isinstance(val, str):
            digits = ''.join(c for c in val if c.isdigit())
            if digits:
                return int(digits)
            return 30
        return int(float(val))
    except Exception:
        return 30

def main():
    print("Starting dataset merging and cleaning process...")
    
    # Load region encoder to perform fuzzy matching for 2023 missing wilayahs
    model_dir = r"d:\joki_dbd\model"
    encoder_path = os.path.join(model_dir, "encoder_wilayah.pkl")
    
    if os.path.exists(encoder_path):
        try:
            le_wilayah = joblib.load(encoder_path)
            wilayah_classes = sorted(list(le_wilayah.classes_), key=len, reverse=True)
            print(f"Loaded {len(wilayah_classes)} wilayah classes for fuzzy matching.")
        except Exception as e:
            print(f"Error loading encoder_wilayah.pkl: {e}. Fallback to basic names.")
            wilayah_classes = []
    else:
        print("encoder_wilayah.pkl not found. Fuzzy matching disabled.")
        wilayah_classes = []

    files = {
        2019: r"d:\joki_dbd\dataset\MALARIA 2019.xlsx",
        2020: r"d:\joki_dbd\dataset\MALARIA 2020.xlsx",
        2021: r"d:\joki_dbd\dataset\MALARIA 2021.xlsx",
        2022: r"d:\joki_dbd\dataset\MALARIA 2022.xlsx",
        2023: r"d:\joki_dbd\dataset\MALARIA 2023.xlsx",
        2024: r"d:\joki_dbd\dataset\MALARIA 2024.xlsx"
    }

    all_dfs = []

    for year, path in files.items():
        if not os.path.exists(path):
            print(f"File not found: {path}")
            continue
            
        print(f"Processing year {year} from {os.path.basename(path)}...")
        
        if year in [2019, 2020, 2021, 2022]:
            df = pd.read_excel(path)
            # Take first 10 columns
            df = df.iloc[:, :10]
            df.columns = ['No', 'Provinsi', 'Kabupaten', 'Desa', 'Dusun', 'Alamat', 'Negara', 'Usia', 'Jenis_Kelamin', 'Wilayah']
            df['Tahun'] = year
            
        elif year == 2023:
            # Skip metadata at top, header is row index 8 (0-indexed 7 or 8 depending on sheet)
            # Looking at previous test, header=8 (skiprows=8) works
            df = pd.read_excel(path, header=8)
            df = df.iloc[:, :9]
            df.columns = ['No', 'Provinsi', 'Kabupaten', 'Desa', 'Dusun', 'Alamat', 'Negara', 'Usia', 'Jenis_Kelamin']
            
            # Map Wilayah using fuzzy matching from Alamat
            def extract_wilayah_2023(row):
                addr = str(row['Alamat']).upper()
                for c in wilayah_classes:
                    if c in addr:
                        return c
                desa = str(row['Desa']).upper()
                if pd.notna(row['Desa']) and desa in wilayah_classes:
                    return desa
                return 'KISARAN BARU' # Safe default
                
            df['Wilayah'] = df.apply(extract_wilayah_2023, axis=1)
            df['Tahun'] = year
            
        elif year == 2024:
            df = pd.read_excel(path, header=8)
            cols = list(df.columns)
            # Drop No Telepon column (7th column, index 6)
            if len(cols) > 6:
                df = df.drop(columns=[cols[6]])
            df = df.iloc[:, :9]
            df.columns = ['No', 'Provinsi', 'Kabupaten', 'Desa', 'Dusun', 'Alamat', 'Usia', 'Jenis_Kelamin', 'Wilayah']
            df['Negara'] = 'Indonesia'
            # Reorder columns
            df = df[['No', 'Provinsi', 'Kabupaten', 'Desa', 'Dusun', 'Alamat', 'Negara', 'Usia', 'Jenis_Kelamin', 'Wilayah']]
            df['Tahun'] = year

        # Basic cleaning of columns
        df['Jenis_Kelamin'] = df['Jenis_Kelamin'].apply(clean_gender)
        df['Usia'] = df['Usia'].apply(clean_age)
        
        # Clean text columns
        for text_col in ['Provinsi', 'Kabupaten', 'Desa', 'Dusun', 'Alamat', 'Negara', 'Wilayah']:
            df[text_col] = df[text_col].fillna('-').astype(str).str.strip().str.upper()
            
        all_dfs.append(df)

    if not all_dfs:
        print("No datasets loaded. Exiting.")
        return

    merged_df = pd.concat(all_dfs, ignore_index=True)
    
    # Filter rows: we need a valid Wilayah
    merged_df = merged_df[merged_df['Wilayah'] != '-']
    merged_df = merged_df[merged_df['Wilayah'].notna()]
    
    # Sort by Tahun and No
    merged_df = merged_df.sort_values(by=['Tahun', 'No']).reset_index(drop=True)
    
    # Create output directory
    output_dir = r"d:\joki_dbd\public\data"
    os.makedirs(output_dir, exist_ok=True)
    
    output_path = os.path.join(output_dir, "dbd_historis.xlsx")
    print(f"Saving merged dataset ({len(merged_df)} rows) to {output_path}...")
    
    merged_df.to_excel(output_path, index=False)
    print("Dataset merging completed successfully!")

if __name__ == "__main__":
    main()
