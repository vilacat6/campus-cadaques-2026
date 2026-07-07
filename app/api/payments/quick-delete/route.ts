import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const paymentId = String(formData.get("payment_id") || "").trim();

    if (!paymentId) {
      return NextResponse.json(
        { error: "Falta l'identificador del pagament." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("payments")
      .delete()
      .eq("id", paymentId);

    if (error) {
      console.error("Error esborrant pagament:", error);

      return NextResponse.json(
        {
          error: "Error esborrant el pagament.",
          supabase_error: error,
        },
        { status: 500 }
      );
    }

    return NextResponse.redirect(new URL("/admin/payments", request.url), {
      status: 303,
    });
  } catch (error) {
    console.error("Error inesperat esborrant pagament:", error);

    return NextResponse.json(
      { error: "Error inesperat esborrant el pagament." },
      { status: 500 }
    );
  }
}