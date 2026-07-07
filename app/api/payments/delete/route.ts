import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function updatePaymentStatus(participantId: string) {
  const { data: registrations } = await supabaseAdmin
    .from("registrations")
    .select("id, price")
    .eq("participant_id", participantId);

  const { data: payments } = await supabaseAdmin
    .from("payments")
    .select("amount")
    .eq("participant_id", participantId);

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
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const paymentId = String(formData.get("payment_id") || "").trim();
    const participantId = String(formData.get("participant_id") || "").trim();

    if (!paymentId || !participantId) {
      return NextResponse.json(
        { error: "Falta el pagament o el participant." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("payments")
      .delete()
      .eq("id", paymentId)
      .eq("participant_id", participantId);

    if (error) {
      console.error("Error esborrant pagament:", error);

      return NextResponse.json(
        { error: "Error esborrant el pagament." },
        { status: 500 }
      );
    }

    await updatePaymentStatus(participantId);

    return Response.redirect(
      new URL(`/admin/participants/${participantId}`, request.url),
      303
    );
  } catch (error) {
    console.error("Error inesperat:", error);

    return NextResponse.json(
      { error: "Error inesperat esborrant el pagament." },
      { status: 500 }
    );
  }
}