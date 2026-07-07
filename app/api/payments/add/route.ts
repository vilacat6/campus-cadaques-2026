import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const participantId = String(formData.get("participant_id") || "").trim();
    const amountRaw = String(formData.get("amount") || "").replace(",", ".");
    const paymentMethod = String(formData.get("payment_method") || "").trim();
    const paymentDate = String(formData.get("payment_date") || "");
    const notes = String(formData.get("notes") || "").trim();

    const amount = Number(amountRaw);

    if (!participantId) {
      return NextResponse.json(
        { error: "Falta el participant." },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "L'import del pagament no és correcte." },
        { status: 400 }
      );
    }

    const { error: paymentError } = await supabaseAdmin.from("payments").insert({
      participant_id: participantId,
      amount,
      payment_method: paymentMethod || null,
      payment_date: paymentDate || new Date().toISOString().slice(0, 10),
      notes: notes || null,
    });

    if (paymentError) {
      console.error("Error payment:", paymentError);

      return NextResponse.json(
        { error: "Error guardant el pagament." },
        { status: 500 }
      );
    }

    const { data: registrations, error: registrationsError } =
      await supabaseAdmin
        .from("registrations")
        .select("id, price")
        .eq("participant_id", participantId);

    if (registrationsError) {
      console.error("Error registrations:", registrationsError);
    }

    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from("payments")
      .select("amount")
      .eq("participant_id", participantId);

    if (paymentsError) {
      console.error("Error payments:", paymentsError);
    }

    const totalDue =
      registrations?.reduce(
        (sum, registration) => sum + Number(registration.price || 0),
        0
      ) || 0;

    const totalPaid =
      payments?.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) ||
      0;

    let paymentStatus = "pendent";

    if (totalPaid >= totalDue && totalDue > 0) {
      paymentStatus = "pagat";
    } else if (totalPaid > 0) {
      paymentStatus = "parcial";
    }

    await supabaseAdmin
      .from("registrations")
      .update({ payment_status: paymentStatus })
      .eq("participant_id", participantId);

    return Response.redirect(
      new URL(`/admin/participants/${participantId}`, request.url),
      303
    );
  } catch (error) {
    console.error("Error inesperat:", error);

    return NextResponse.json(
      { error: "Error inesperat guardant el pagament." },
      { status: 500 }
    );
  }
}