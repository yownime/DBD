import os
import io
import joblib
import pandas as pd
import numpy as np
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

app = FastAPI(title="Malaria Risk Group Prediction API", version="1.0")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model and encoders
model = None
le_jk = None
le_gd = None
le_risiko = None

# Load model and encoders on startup
@app.on_event("startup")
def load_models():
    global model, le_jk, le_gd, le_risiko
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    model_path = os.path.join(base_dir, "model", "model_svm_malaria.pkl")
    jk_path = os.path.join(base_dir, "model", "encoder_jk.pkl")
    gd_path = os.path.join(base_dir, "model", "encoder_gd.pkl")
    risiko_path = os.path.join(base_dir, "model", "encoder_risiko.pkl")
    
    print("Loading AI Models for Malaria prediction...")
    try:
        if os.path.exists(model_path):
            model = joblib.load(model_path)
            print("SVM Model loaded successfully.")
        else:
            print(f"Warning: model_svm_malaria.pkl not found at {model_path}")
            
        if os.path.exists(jk_path):
            le_jk = joblib.load(jk_path)
            print("JK encoder loaded successfully.")
        else:
            print(f"Warning: encoder_jk.pkl not found at {jk_path}")
            
        if os.path.exists(gd_path):
            le_gd = joblib.load(gd_path)
            print("GD encoder loaded successfully.")
        else:
            print(f"Warning: encoder_gd.pkl not found at {gd_path}")
            
        if os.path.exists(risiko_path):
            le_risiko = joblib.load(risiko_path)
            print("Risiko encoder loaded successfully.")
        else:
            print(f"Warning: encoder_risiko.pkl not found at {risiko_path}")
            
    except Exception as e:
        print(f"Error loading models: {e}")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Malaria AI Prediction Server is running",
        "model_loaded": model is not None,
        "classes": list(le_risiko.classes_) if le_risiko else []
    }

class PredictSingleInput(BaseModel):
    usia: int
    jenis_kelamin: str
    golongan_darah: str
    tahun: int
    alamat: Optional[str] = ""
    desa: Optional[str] = ""

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

def get_kelurahan_code_single(alamat: str, desa: str) -> int:
    addr = str(alamat or '').upper()
    ds = str(desa or '').upper()
    
    target_desas = {
        'MUTIARA': 1,
        'SENTANG': 2,
        'SIUMBUT-UMBUT': 3,
        'SIUMBUT UMBUT': 3,
        'LESTARI': 4,
        'SIUMBUT BARU': 5,
        'SELAWAN': 6,
        'BUNUT BARAT': 7,
        'TELADAN': 8,
        'KISARAN NAGA': 9,
        'SIDOMUKTI': 10
    }
    
    for k, v in target_desas.items():
        if k in addr or k in ds:
            return v
    return 0

@app.post("/api/predict_single")
def predict_single(data: PredictSingleInput):
    global model, le_jk, le_gd, le_risiko
    
    if model is None or le_jk is None or le_gd is None or le_risiko is None:
        raise HTTPException(status_code=503, detail="Models are not fully loaded.")
        
    try:
        jk_cleaned = clean_gender(data.jenis_kelamin)
        gd_cleaned = clean_blood_type(data.golongan_darah)
        usia_cleaned = clean_age(data.usia)
        tahun = data.tahun
        kel_enc = get_kelurahan_code_single(data.alamat, data.desa)
        
        # Label encode
        jk_enc = le_jk.transform([jk_cleaned])[0]
        gd_enc = le_gd.transform([gd_cleaned])[0]
        
        # Features
        usia2 = usia_cleaned ** 2
        jk_gd = jk_enc * gd_enc
        tahun_rel = tahun - 2019
        usia_tahun = usia_cleaned * (tahun - 2018)
        
        features = pd.DataFrame([[
            usia_cleaned, usia2, jk_enc, gd_enc, tahun_rel, jk_gd, usia_tahun, kel_enc
        ]], columns=['Usia', 'Usia2', 'JK_enc', 'GD_enc', 'Tahun_rel', 'JK_GD', 'Usia_Tahun', 'Kelurahan_enc'])
        
        pred = model.predict(features)[0]
        pred_label = le_risiko.inverse_transform([pred])[0]
        
        return {
            "status": "success",
            "prediction": pred_label
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/historical")
def get_historical_with_predictions():
    """Serves the complete historical dataset with SVM predictions pre-calculated."""
    global model, le_jk, le_gd, le_risiko
    
    if model is None or le_jk is None or le_gd is None or le_risiko is None:
        raise HTTPException(status_code=503, detail="Models are not fully loaded.")
        
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        data_path = os.path.join(base_dir, "public", "data", "malaria_historis.xlsx")
        
        if not os.path.exists(data_path):
            raise HTTPException(status_code=404, detail="Historical dataset not found.")
            
        df = pd.read_excel(data_path)
        
        # Feature Engineering for SVM
        jk_encs = le_jk.transform(df['Jenis_Kelamin'])
        gd_encs = le_gd.transform(df['Golongan_Darah'])
        
        def get_kelurahan_code(row):
            addr = str(row.get('Alamat', '')).upper()
            desa = str(row.get('Desa', '')).upper()
            
            target_desas = {
                'MUTIARA': 1,
                'SENTANG': 2,
                'SIUMBUT-UMBUT': 3,
                'SIUMBUT UMBUT': 3,
                'LESTARI': 4,
                'SIUMBUT BARU': 5,
                'SELAWAN': 6,
                'BUNUT BARAT': 7,
                'TELADAN': 8,
                'KISARAN NAGA': 9,
                'SIDOMUKTI': 10
            }
            
            for k, v in target_desas.items():
                if k in addr or k in desa:
                    return v
            return 0

        df['Kelurahan_enc'] = df.apply(get_kelurahan_code, axis=1)
        
        X = pd.DataFrame({
            'Usia': df['Usia'],
            'Usia2': df['Usia'] ** 2,
            'JK_enc': jk_encs,
            'GD_enc': gd_encs,
            'Tahun_rel': df['Tahun'] - 2019,
            'JK_GD': jk_encs * gd_encs,
            'Usia_Tahun': df['Usia'] * (df['Tahun'] - 2018),
            'Kelurahan_enc': df['Kelurahan_enc']
        })
        
        preds = model.predict(X)
        df['Prediksi'] = le_risiko.inverse_transform(preds)
        
        records = []
        for _, row in df.iterrows():
            records.append({
                "No": int(row['No']),
                "Provinsi": str(row['Provinsi']),
                "Kabupaten": str(row['Kabupaten']),
                "Desa": str(row['Desa']),
                "Dusun": str(row['Dusun']),
                "Alamat": str(row['Alamat']),
                "Usia": int(row['Usia']),
                "Jenis_Kelamin": str(row['Jenis_Kelamin']),
                "Golongan_Darah": str(row['Golongan_Darah']),
                "Tahun": int(row['Tahun']),
                "Risiko": str(row['Risiko']),
                "Prediksi": str(row['Prediksi'])
            })
        return {
            "status": "success",
            "data": records
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/projection")
def get_projection():
    """Generates future projections (2025-2027) using SVM based on historical trends."""
    global model, le_jk, le_gd, le_risiko
    
    if model is None or le_jk is None or le_gd is None or le_risiko is None:
        raise HTTPException(status_code=503, detail="Models are not fully loaded.")
        
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        data_path = os.path.join(base_dir, "public", "data", "malaria_historis.xlsx")
        
        if not os.path.exists(data_path):
            raise HTTPException(status_code=404, detail="Historical dataset not found.")
            
        df = pd.read_excel(data_path)
        
        # 1. Group historical data by year and risk group (Rentan / Tidak Rentan)
        historical_agg = df.groupby(['Tahun', 'Risiko']).size().unstack(fill_value=0)
        
        results = []
        for year in sorted(historical_agg.index):
            results.append({
                "Tahun": int(year),
                "Rentan": int(historical_agg.loc[year, 'Rentan'] if 'Rentan' in historical_agg.columns else 0),
                "Tidak Rentan": int(historical_agg.loc[year, 'Tidak Rentan'] if 'Tidak Rentan' in historical_agg.columns else 0),
                "Type": "Historical"
            })
            
        # 2. Simulate future cases for 2025, 2026, 2027
        last_years_counts = df['Tahun'].value_counts()
        avg_count = int(last_years_counts.mean()) if len(last_years_counts) > 0 else 500
        
        # Draw samples from historical cases to represent patient demographics
        demographics = df[['Usia', 'Jenis_Kelamin', 'Golongan_Darah', 'Alamat', 'Desa']].dropna()
        if len(demographics) == 0:
            demographics = pd.DataFrame({
                'Usia': [30], 'Jenis_Kelamin': ['Laki Laki'], 'Golongan_Darah': ['O'], 'Alamat': ['-'], 'Desa': ['-']
            })
            
        def get_kelurahan_code(row):
            addr = str(row.get('Alamat', '')).upper()
            desa = str(row.get('Desa', '')).upper()
            target_desas = {
                'MUTIARA': 1, 'SENTANG': 2, 'SIUMBUT-UMBUT': 3, 'SIUMBUT UMBUT': 3,
                'LESTARI': 4, 'SIUMBUT BARU': 5, 'SELAWAN': 6, 'BUNUT BARAT': 7,
                'TELADAN': 8, 'KISARAN NAGA': 9, 'SIDOMUKTI': 10
            }
            for k, v in target_desas.items():
                if k in addr or k in desa:
                    return v
            return 0

        for future_year in [2025, 2026, 2027]:
            # Resample demographics
            simulated = demographics.sample(n=min(avg_count, len(demographics)), replace=True, random_state=future_year)
            simulated['Tahun'] = future_year
            simulated['Kelurahan_enc'] = simulated.apply(get_kelurahan_code, axis=1)
            
            # Feature engineering
            jk_encs = le_jk.transform(simulated['Jenis_Kelamin'])
            gd_encs = le_gd.transform(simulated['Golongan_Darah'])
            
            X = pd.DataFrame({
                'Usia': simulated['Usia'],
                'Usia2': simulated['Usia'] ** 2,
                'JK_enc': jk_encs,
                'GD_enc': gd_encs,
                'Tahun_rel': simulated['Tahun'] - 2019,
                'JK_GD': jk_encs * gd_encs,
                'Usia_Tahun': simulated['Usia'] * (simulated['Tahun'] - 2018),
                'Kelurahan_enc': simulated['Kelurahan_enc']
            })
            
            preds = model.predict(X)
            simulated['Prediksi'] = le_risiko.inverse_transform(preds)
            
            pred_counts = simulated['Prediksi'].value_counts()
            
            results.append({
                "Tahun": int(future_year),
                "Rentan": int(pred_counts.get('Rentan', 0)),
                "Tidak Rentan": int(pred_counts.get('Tidak Rentan', 0)),
                "Type": "Projected"
            })
            
        return {
            "status": "success",
            "data": results
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

def find_header_row(df: pd.DataFrame) -> int:
    """Helper to detect where the actual header begins."""
    for i in range(min(15, len(df))):
        row_vals = [str(x).strip().lower() for x in df.iloc[i].dropna()]
        has_no = any(v in ['no', 'no.', 'no_'] for v in row_vals)
        has_usia = any('usia' in v or 'umur' in v or 'kelamin' in v for v in row_vals)
        if has_no and has_usia:
            return i
    return 0

@app.post("/api/predict")
async def predict_malaria(
    file: UploadFile = File(...),
    default_tahun: Optional[int] = Form(None)
):
    global model, le_jk, le_gd, le_risiko
    
    if model is None or le_jk is None or le_gd is None or le_risiko is None:
        raise HTTPException(
            status_code=503,
            detail="AI models are not loaded. Please verify server startup logs."
        )
        
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files (.xlsx, .xls) are supported.")
        
    try:
        raw_bytes = await file.read()
        df_temp = pd.read_excel(io.BytesIO(raw_bytes), header=None)
        header_idx = find_header_row(df_temp)
        
        df = pd.read_excel(io.BytesIO(raw_bytes), skiprows=header_idx)
        
        # Map column names dynamically
        col_mapping = {}
        for original_col in df.columns:
            clean_c = str(original_col).strip().lower()
            if clean_c in ['no', 'no.', 'no_']:
                col_mapping['No'] = original_col
            elif 'provinsi' in clean_c:
                col_mapping['Provinsi'] = original_col
            elif 'kabupaten' in clean_c:
                col_mapping['Kabupaten'] = original_col
            elif 'desa' in clean_c:
                col_mapping['Desa'] = original_col
            elif 'dusun' in clean_c:
                col_mapping['Dusun'] = original_col
            elif 'alamat' in clean_c:
                col_mapping['Alamat'] = original_col
            elif 'usia' in clean_c or 'umur' in clean_c:
                col_mapping['Usia'] = original_col
            elif 'kelamin' in clean_c or 'gender' in clean_c:
                col_mapping['Jenis_Kelamin'] = original_col
            elif 'darah' in clean_c:
                col_mapping['Golongan_Darah'] = original_col
            elif 'tahun' in clean_c:
                col_mapping['Tahun'] = original_col

        age_source = col_mapping.get('Usia')
        gender_source = col_mapping.get('Jenis_Kelamin')
        blood_source = col_mapping.get('Golongan_Darah')
        
        if not age_source or not gender_source or not blood_source:
            raise HTTPException(
                status_code=400,
                detail="Excel must contain 'Usia' (Age), 'Jenis Kelamin' (Gender), and 'Golongan Darah' (Blood Type) columns."
            )
            
        clean_df = pd.DataFrame()
        clean_df['No'] = df[col_mapping.get('No')].fillna(1) if col_mapping.get('No') else range(1, len(df)+1)
        clean_df['Provinsi'] = df[col_mapping.get('Provinsi')].fillna('SUMATERA UTARA').astype(str).str.strip().str.upper() if col_mapping.get('Provinsi') else 'SUMATERA UTARA'
        clean_df['Kabupaten'] = df[col_mapping.get('Kabupaten')].fillna('-').astype(str).str.strip().str.upper() if col_mapping.get('Kabupaten') else '-'
        clean_df['Desa'] = df[col_mapping.get('Desa')].fillna('-').astype(str).str.strip().str.upper() if col_mapping.get('Desa') else '-'
        clean_df['Dusun'] = df[col_mapping.get('Dusun')].fillna('-').astype(str).str.strip().str.upper() if col_mapping.get('Dusun') else '-'
        clean_df['Alamat'] = df[col_mapping.get('Alamat')].fillna('-').astype(str).str.strip().str.upper() if col_mapping.get('Alamat') else '-'
        
        clean_df['Usia'] = df[age_source].apply(clean_age)
        clean_df['Jenis_Kelamin'] = df[gender_source].apply(clean_gender)
        clean_df['Golongan_Darah'] = df[blood_source].apply(clean_blood_type)
        
        if 'Tahun' in col_mapping:
            clean_df['Tahun'] = pd.to_numeric(df[col_mapping['Tahun']], errors='coerce').fillna(2024).astype(int)
        else:
            year_val = default_tahun if default_tahun is not None else 2024
            clean_df['Tahun'] = year_val
            
        # Feature Engineering for SVM
        jk_encs = le_jk.transform(clean_df['Jenis_Kelamin'])
        gd_encs = le_gd.transform(clean_df['Golongan_Darah'])
        
        def get_kelurahan_code(row):
            addr = str(row.get('Alamat', '')).upper()
            desa = str(row.get('Desa', '')).upper()
            
            target_desas = {
                'MUTIARA': 1,
                'SENTANG': 2,
                'SIUMBUT-UMBUT': 3,
                'SIUMBUT UMBUT': 3,
                'LESTARI': 4,
                'SIUMBUT BARU': 5,
                'SELAWAN': 6,
                'BUNUT BARAT': 7,
                'TELADAN': 8,
                'KISARAN NAGA': 9,
                'SIDOMUKTI': 10
            }
            
            for k, v in target_desas.items():
                if k in addr or k in desa:
                    return v
            return 0

        clean_df['Kelurahan_enc'] = clean_df.apply(get_kelurahan_code, axis=1)
        
        X = pd.DataFrame({
            'Usia': clean_df['Usia'],
            'Usia2': clean_df['Usia'] ** 2,
            'JK_enc': jk_encs,
            'GD_enc': gd_encs,
            'Tahun_rel': clean_df['Tahun'] - 2019,
            'JK_GD': jk_encs * gd_encs,
            'Usia_Tahun': clean_df['Usia'] * (clean_df['Tahun'] - 2018),
            'Kelurahan_enc': clean_df['Kelurahan_enc']
        })
        
        # Run SVM predictions
        preds = model.predict(X)
        clean_df['Prediksi'] = le_risiko.inverse_transform(preds)
        
        # Format results for frontend response
        records = []
        for _, row in clean_df.iterrows():
            records.append({
                "No": int(row['No']),
                "Provinsi": str(row['Provinsi']),
                "Kabupaten": str(row['Kabupaten']),
                "Desa": str(row['Desa']),
                "Dusun": str(row['Dusun']),
                "Alamat": str(row['Alamat']),
                "Usia": int(row['Usia']),
                "Jenis_Kelamin": str(row['Jenis_Kelamin']),
                "Golongan_Darah": str(row['Golongan_Darah']),
                "Tahun": int(row['Tahun']),
                "Prediksi": str(row['Prediksi'])
            })
            
        raw_preview = []
        preview_df = df.head(10).fillna('-')
        for _, row in preview_df.iterrows():
            preview_row = {}
            for col in preview_df.columns:
                val = row[col]
                if isinstance(val, (np.integer, np.floating)):
                    val = val.item()
                elif isinstance(val, pd.Timestamp):
                    val = val.isoformat()
                preview_row[str(col)] = val
            raw_preview.append(preview_row)

        return {
            "status": "success",
            "filename": file.filename,
            "total_predicted_regions": len(records),
            "raw_total_cases": len(records),
            "data": records,
            "raw_preview": raw_preview
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
