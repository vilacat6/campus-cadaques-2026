import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const expenseId = String(formData.get("expense_id") || "").trim();

    if (!expenseId) {
      return NextResponse.json(
        { error: "Falta l'identificador de la despesa." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("expenses")
      .delete()
      .eq("id", expenseId);

    if (error) {
      console.error("Error esborrant despesa:", error);

      return NextResponse.json(
        { error: "Error esborrant la despesa." },
        { status: 500 }
      );
    }

    return Response.redirect(new URL("/admin/expenses", request.url), 303);
  } catch (error) {
    console.error("Error inesperat:", error);

    return NextResponse.json(
      { error: "Error inesperat esborrant la despesa." },
      { status: 500 }
    );
  }
}