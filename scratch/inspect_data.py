import pandas as pd
import glob
import os

file_paths = {
    2019: 'dataset/MALARIA2019.xlsx',
    2020: 'dataset/MALARIA2020.xlsx',
    2021: 'dataset/MALARIA2021.xlsx',
    2022: 'dataset/MALARIA2022.xlsx',
    2023: 'dataset/MALARIA2023.xlsx',
    2024: 'dataset/MALARIA2024.xlsx',
}

for year, path in file_paths.items():
    if os.path.exists(path):
        df = pd.read_excel(path, nrows=5)
        print(f"Year {year} ({path}):")
        print(df.columns.tolist())
        print(df.head(2))
        print("-" * 50)
    else:
        print(f"File not found: {path}")
