import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // In a real application, you would check this against a database
    // For this dashboard, we check against a hardcoded set of admin credentials
    if (username === "admin" && password === "admin123") {
      // Simulate generating a JWT or token
      const token = "mock_jwt_token_for_malaria_ai_admin_" + Date.now();
      
      return NextResponse.json({
        success: true,
        message: "Login berhasil",
        username: username,
        token: token
      });
    }

    return NextResponse.json(
      { success: false, message: "Username atau password salah!" },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
