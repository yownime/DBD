import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dashboard Prediksi DBD — AI SVM Analytics",
  description:
    "Sistem dashboard analitik penyebaran Demam Berdarah Dengue (DBD) berbasis AI Support Vector Machine (SVM). Visualisasi data historis 2019-2024 dan prediksi risiko wilayah secara realtime.",
  keywords: [
    "DBD",
    "Demam Berdarah",
    "Dashboard Kesehatan",
    "SVM",
    "Machine Learning",
    "Prediksi Penyakit",
    "Analitik Medis",
  ],
  authors: [{ name: "DBD AI Analytics Team" }],
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
