import os
import io
import joblib
import pandas as pd
import numpy as np
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

app = FastAPI(title="DBD Spread Prediction API", version="1.0")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model and encoders
model = None
le_wilayah = None
le_risiko = None

# Load model and encoders on startup
@app.on_event("startup")
def load_models():
    global model, le_wilayah, le_risiko
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    model_path = os.path.join(base_dir, "model_svm.pkl")
    wilayah_path = os.path.join(base_dir, "encoder_wilayah.pkl")
    risiko_path = os.path.join(base_dir, "encoder_risiko.pkl")
    
    print("Loading AI Models...")
    try:
        if os.path.exists(model_path):
            model = joblib.load(model_path)
            print("SVM Model loaded successfully.")
        else:
            print(f"Warning: model_svm.pkl not found at {model_path}")
            
        if os.path.exists(wilayah_path):
            le_wilayah = joblib.load(wilayah_path)
            print("Wilayah encoder loaded successfully.")
        else:
            print(f"Warning: encoder_wilayah.pkl not found at {wilayah_path}")
            
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
        "message": "DBD AI Prediction Server is running",
        "model_loaded": model is not None,
        "wilayah_classes_count": len(le_wilayah.classes_) if le_wilayah else 0
    }

def find_header_row(df: pd.DataFrame) -> int:
    """Helper to detect where the actual header begins (e.g. skipping metadata rows)."""
    for i in range(min(15, len(df))):
        row_vals = [str(x).strip().lower() for x in df.iloc[i].dropna()]
        # Check if the row contains typical headers like 'no' or 'provinsi' or 'kabupaten'
        has_no = any(v in ['no', 'no.', 'no_'] for v in row_vals)
        has_prov = any('provinsi' in v or 'kabupaten' in v or 'desa' in v or 'wilayah' in v for v in row_vals)
        if has_no and has_prov:
            return i
    return 0

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
        if isinstance(val, str):
            digits = ''.join(c for c in val if c.isdigit())
            if digits:
                return int(digits)
            return 30
        return int(float(val))
    except Exception:
        return 30

def kategori_risiko(jumlah: int) -> str:
    if jumlah < 20:
        return "Rendah"
    elif jumlah < 50:
        return "Sedang"
    else:
        return "Tinggi"

@app.post("/api/predict")
async def predict_dbd(
    file: UploadFile = File(...),
    default_tahun: Optional[int] = Form(None)
):
    global model, le_wilayah, le_risiko
    
    if model is None or le_wilayah is None or le_risiko is None:
        raise HTTPException(
            status_code=503,
            detail="AI models are not loaded. Please verify server startup logs."
        )
        
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files (.xlsx, .xls) are supported.")
        
    try:
        # Read the file content
        raw_bytes = await file.read()
        
        # Read first time to find header row index (must use BytesIO for pandas 3.x)
        df_temp = pd.read_excel(io.BytesIO(raw_bytes), header=None)
        header_idx = find_header_row(df_temp)
        
        # Re-read with proper header index
        df = pd.read_excel(io.BytesIO(raw_bytes), skiprows=header_idx)
        
        # Reset column names to cleaned strings for mapping
        cols_lower = [str(c).strip().lower() for c in df.columns]
        
        # Find column mappings dynamically based on content keywords
        col_mapping = {}
        for original_col in df.columns:
            clean_c = str(original_col).strip().lower()
            if clean_c in ['no', 'no.', 'no_']:
                col_mapping['No'] = original_col
            elif 'provinsi' in clean_c:
                col_mapping['Provinsi'] = original_col
            elif 'kabupaten' in clean_c or 'kab/kota' in clean_c or 'kota' in clean_c:
                col_mapping['Kabupaten'] = original_col
            elif 'desa domisili' in clean_c:
                col_mapping['Wilayah_Domisili'] = original_col
            elif 'desa' in clean_c:
                col_mapping['Desa'] = original_col
            elif 'dusun' in clean_c:
                col_mapping['Dusun'] = original_col
            elif 'alamat' in clean_c:
                col_mapping['Alamat'] = original_col
            elif 'negara' in clean_c:
                col_mapping['Negara'] = original_col
            elif 'usia' in clean_c or 'umur' in clean_c:
                col_mapping['Usia'] = original_col
            elif 'jenis kelamin' in clean_c or 'kelamin' in clean_c or 'gender' in clean_c:
                col_mapping['Jenis_Kelamin'] = original_col
            elif 'wilayah' in clean_c:
                col_mapping['Wilayah'] = original_col
            elif 'tahun' in clean_c:
                col_mapping['Tahun'] = original_col

        # Map and rename necessary columns
        final_cols = {}
        
        # Determine Wilayah column
        wilayah_source = col_mapping.get('Wilayah') or col_mapping.get('Wilayah_Domisili') or col_mapping.get('Desa')
        if not wilayah_source:
            raise HTTPException(
                status_code=400,
                detail="Could not find a 'Wilayah' or 'Desa' column in the uploaded Excel sheet."
            )
            
        # Determine age and gender
        age_source = col_mapping.get('Usia')
        gender_source = col_mapping.get('Jenis_Kelamin')
        if not age_source or not gender_source:
            raise HTTPException(
                status_code=400,
                detail="Excel must contain 'Usia' (Age) and 'Jenis Kelamin' (Gender) columns."
            )
            
        # Create standard dataframe
        clean_df = pd.DataFrame()
        clean_df['Wilayah'] = df[wilayah_source].fillna('-').astype(str).str.strip().str.upper()
        clean_df['Usia'] = df[age_source].apply(clean_age)
        clean_df['Jenis_Kelamin'] = df[gender_source].apply(clean_gender)
        
        # Handle year
        if 'Tahun' in col_mapping:
            clean_df['Tahun'] = pd.to_numeric(df[col_mapping['Tahun']], errors='coerce').fillna(2024).astype(int)
        else:
            year_val = default_tahun if default_tahun is not None else 2024
            clean_df['Tahun'] = year_val
            
        # Drop rows with invalid Wilayah
        clean_df = clean_df[clean_df['Wilayah'] != '-']
        clean_df = clean_df.dropna(subset=['Wilayah', 'Usia', 'Jenis_Kelamin'])
        
        if len(clean_df) == 0:
            raise HTTPException(
                status_code=400,
                detail="No valid rows left after cleaning. Make sure Wilayah, Usia, and Jenis Kelamin are not null."
            )
            
        # Aggregate the data like the training pipeline
        agregasi = clean_df.groupby(['Tahun', 'Wilayah']).agg({
            'Usia': 'mean',
            'Jenis_Kelamin': 'count'
        }).reset_index()
        
        agregasi.columns = ['Tahun', 'Wilayah', 'Rata_Usia', 'Jumlah_Kasus']
        
        # Calculate actual risk category from rules
        agregasi['Risiko'] = agregasi['Jumlah_Kasus'].apply(kategori_risiko)
        
        # Encode Wilayah safely using pre-loaded LabelEncoder classes
        wilayah_classes = list(le_wilayah.classes_)
        wilayah_map = {val.upper(): idx for idx, val in enumerate(wilayah_classes)}
        
        encoded_wilayah = []
        for w in agregasi['Wilayah']:
            w_upper = str(w).strip().upper()
            if w_upper in wilayah_map:
                encoded_wilayah.append(wilayah_map[w_upper])
            else:
                # String fuzzy match
                matched = False
                for c in wilayah_classes:
                    if w_upper in c or c in w_upper:
                        encoded_wilayah.append(wilayah_map[c])
                        matched = True
                        break
                if not matched:
                    encoded_wilayah.append(0) # Default fallback index
                    
        agregasi['Wilayah_Encoded'] = encoded_wilayah
        
        # Prepare input features X
        # Column names must match SVM features training: ['Tahun', 'Wilayah', 'Rata_Usia', 'Jumlah_Kasus']
        X = pd.DataFrame({
            'Tahun': agregasi['Tahun'],
            'Wilayah': agregasi['Wilayah_Encoded'],
            'Rata_Usia': agregasi['Rata_Usia'],
            'Jumlah_Kasus': agregasi['Jumlah_Kasus']
        })
        
        # Run predictions
        y_pred = model.predict(X)
        
        # Decode predicted risks back to labels
        agregasi['Prediksi'] = le_risiko.inverse_transform(y_pred)
        
        # Convert to records JSON list
        records = []
        for _, row in agregasi.iterrows():
            records.append({
                "Tahun": int(row['Tahun']),
                "Wilayah": str(row['Wilayah']),
                "Rata_Usia": round(float(row['Rata_Usia']), 2),
                "Jumlah_Kasus": int(row['Jumlah_Kasus']),
                "Risiko": str(row['Risiko']),
                "Prediksi": str(row['Prediksi'])
            })
            
        # Get raw preview (first 10 items of uploaded data for table preview)
        raw_preview = []
        preview_df = df.head(10).fillna('-')
        for _, row in preview_df.iterrows():
            preview_row = {}
            for col in preview_df.columns:
                val = row[col]
                # convert numpy/pandas types to standard python types
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
            "raw_total_cases": int(clean_df.shape[0]),
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
