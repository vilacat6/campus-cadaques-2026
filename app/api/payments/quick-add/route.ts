import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const participantId = String(formData.get("participant_id") || "").trim();
    const amountRaw = String(formData.get("amount") || "0").replace(",", ".");
    const paymentDate = String(formData.get("payment_date") || "").trim();
    const paymentMethod = String(formData.get("payment_method") || "").trim();
    const notes = String(formData.get("notes") || "").trim();

    const amount = Number(amountRaw);

    if (!participantId) {
      return NextResponse.json(
        { error: "Falta el participant." },
        { status: 400 }
      );
    }

    if (Number.isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "L'import del pagament no és correcte." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("payments").insert({
      participant_id: participantId,
      amount,
      payment_date: paymentDate || new Date().toISOString().slice(0, 10),
      payment_method: paymentMethod || null,
      notes: notes || null,
    });

    if (error) {
      console.error("Error afegint pagament ràpid:", error);

      return NextResponse.json(
        {
          error: "Error afegint el pagament.",
          supabase_error: error,
        },
        { status: 500 }
      );
    }

    return NextResponse.redirect(new URL("/admin/payments", request.url), {
      status: 303,
    });
  } catch (error) {
    console.error("Error inesperat afegint pagament ràpid:", error);

    return NextResponse.json(
      { error: "Error inesperat afegint el pagament." },
      { status: 500 }
    );
  }
}   