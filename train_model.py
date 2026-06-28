import pandas as pd
import numpy as np
import os
import joblib
from sklearn.svm import SVC
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report, accuracy_score
from sklearn.pipeline import Pipeline
import warnings
warnings.filterwarnings('ignore')

print("=" * 60)
print("LANGKAH 1: MEMUAT DATA")
print("=" * 60)

file_paths = {
    2019: 'dataset/MALARIA2019.xlsx',
    2020: 'dataset/MALARIA2020.xlsx',
    2021: 'dataset/MALARIA2021.xlsx',
    2022: 'dataset/MALARIA2022.xlsx',
    2023: 'dataset/MALARIA2023.xlsx',
    2024: 'dataset/MALARIA2024.xlsx',
}

dfs = []
for tahun, path in file_paths.items():
    if not os.path.exists(path):
        print(f"Warning: File {path} tidak ditemukan!")
        continue
    df = pd.read_excel(path)
    df['Tahun'] = tahun
    df = df.rename(columns={
        'No.': 'No',
        'Provinsi Pencatat': 'Provinsi',
        'Kabupaten Pencatat': 'Kabupaten',
    })
    cols = ['Tahun', 'Usia', 'Jenis Kelamin', 'Golongan Darah']
    df = df[[c for c in cols if c in df.columns]]
    dfs.append(df)

if not dfs:
    raise ValueError("Tidak ada data excel malaria yang berhasil dimuat!")

data = pd.concat(dfs, ignore_index=True)
print(f"Total data gabungan : {data.shape[0]} baris")
print(f"Distribusi per tahun:\n{data['Tahun'].value_counts().sort_index()}\n")

# ============================================================
# 2. PREPROCESSING
# ============================================================
print("=" * 60)
print("LANGKAH 2: PREPROCESSING")
print("=" * 60)

data['Jenis Kelamin'] = data['Jenis Kelamin'].astype(str).str.strip().str.title()
data['Golongan Darah'] = data['Golongan Darah'].astype(str).str.strip().str.upper()
data = data[data['Jenis Kelamin'].isin(['Laki Laki', 'Perempuan'])]
data = data[data['Golongan Darah'].isin(['A', 'B', 'O', 'AB'])]
data = data.dropna()
print(f"Data bersih: {data.shape[0]} baris")

# TARGET: 4 Kelompok Risiko Usia
data['Risiko'] = pd.cut(
    data['Usia'],
    bins=[0, 5, 17, 45, 200],
    labels=['Balita (0-5)', 'Remaja (6-17)', 'Dewasa (18-45)', 'Lansia (46+)'],
    include_lowest=True
)
print(f"\nDistribusi target (Kelompok Risiko):")
print(data['Risiko'].value_counts())

# Label Encoding
le_jk     = LabelEncoder()
le_gd     = LabelEncoder()
le_risiko = LabelEncoder()

data['JK_enc'] = le_jk.fit_transform(data['Jenis Kelamin'])
data['GD_enc'] = le_gd.fit_transform(data['Golongan Darah'])
data['Target'] = le_risiko.fit_transform(data['Risiko'])

print(f"\nEncoding Jenis Kelamin : {dict(zip(le_jk.classes_, le_jk.transform(le_jk.classes_)))}")
print(f"Encoding Golongan Darah: {dict(zip(le_gd.classes_, le_gd.transform(le_gd.classes_)))}")
print(f"Encoding Risiko        : {dict(zip(le_risiko.classes_, le_risiko.transform(le_risiko.classes_)))}")

# Feature Engineering
data['Usia2']      = data['Usia'] ** 2
data['JK_GD']      = data['JK_enc'] * data['GD_enc']
data['Usia_Tahun'] = data['Usia'] * (data['Tahun'] - 2018)
data['Tahun_rel']  = data['Tahun'] - 2019

FITUR = ['Usia', 'Usia2', 'JK_enc', 'GD_enc', 'Tahun_rel', 'JK_GD', 'Usia_Tahun']
X = data[FITUR]
y = data['Target']

print(f"\nFitur yang digunakan: {FITUR}")

# ============================================================
# 3. SPLIT DATA
# ============================================================
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"\nData Training : {X_train.shape[0]} sampel")
print(f"Data Testing  : {X_test.shape[0]} sampel")

# ============================================================
# 4. TRAINING MODEL SVM
# ============================================================
print("\n" + "=" * 60)
print("LANGKAH 3: TRAINING MODEL SVM")
print("=" * 60)

model = Pipeline([
    ('scaler', StandardScaler()),
    ('svm', SVC(kernel='rbf', C=0.01, gamma='scale',
                probability=True, random_state=42))
])

model.fit(X_train, y_train)
print("Model SVM berhasil dilatih!")

# ============================================================
# 5. EVALUASI MODEL
# ============================================================
print("\n" + "=" * 60)
print("LANGKAH 4: EVALUASI MODEL")
print("=" * 60)

y_pred = model.predict(X_test)
acc    = accuracy_score(y_test, y_pred)

print(f"\nAkurasi: {acc:.4f} ({acc*100:.2f}%)")
print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=le_risiko.classes_))

# Simpan model dan encoder ke folder model/
model_dir = 'model'
os.makedirs(model_dir, exist_ok=True)

joblib.dump(model, os.path.join(model_dir, 'model_svm_malaria.pkl'))
joblib.dump(le_jk, os.path.join(model_dir, 'encoder_jk.pkl'))
joblib.dump(le_gd, os.path.join(model_dir, 'encoder_gd.pkl'))
joblib.dump(le_risiko, os.path.join(model_dir, 'encoder_risiko.pkl'))

print(f"\nModel dan encoder berhasil disimpan ke folder '{model_dir}'")
