import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const concept = String(formData.get("concept") || "").trim();
    const category = String(formData.get("category") || "").trim();
    const amountRaw = String(formData.get("amount") || "0").replace(",", ".");
    const expenseDate = String(formData.get("expense_date") || "").trim();
    const paymentMethod = String(formData.get("payment_method") || "").trim();
    const notes = String(formData.get("notes") || "").trim();

    const amount = Number(amountRaw);

    if (!concept) {
      return NextResponse.json(
        { error: "Falta el concepte de la despesa." },
        { status: 400 }
      );
    }

    if (Number.isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "L'import de la despesa no és correcte." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("expenses").insert({
      concept,
      category: category || "Sense categoria",
      amount,
      expense_date: expenseDate || new Date().toISOString().slice(0, 10),
      payment_method: paymentMethod || null,
      notes: notes || null,
    });

    if (error) {
      console.error("Error afegint despesa:", error);

      return NextResponse.json(
        {
          error: "Error afegint la despesa.",
          supabase_error: error,
        },
        { status: 500 }
      );
    }

    return NextResponse.redirect(new URL("/admin/expenses", request.url), {
      status: 303,
    });
  } catch (error) {
    console.error("Error inesperat:", error);

    return NextResponse.json(
      { error: "Error inesperat afegint la despesa." },
      { status: 500 }
    );
  }
}