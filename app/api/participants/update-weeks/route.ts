import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  return new Response("Ruta update-weeks funciona correctament", {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

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

    const participantId = String(formData.get("participant_id") || "").trim();
    const weekIds = formData.getAll("week_ids").map(String).filter(Boolean);

    if (!participantId) {
      return NextResponse.json(
        { error: "Falta el participant." },
        { status: 400 }
      );
    }

    if (weekIds.length === 0) {
      return NextResponse.json(
        { error: "Has de seleccionar almenys una setmana." },
        { status: 400 }
      );
    }

    const { data: currentRegistrations, error: currentError } =
      await supabaseAdmin
        .from("registrations")
        .select("id, week_id")
        .eq("participant_id", participantId);

    if (currentError) {
      console.error("Error llegint inscripcions actuals:", currentError);

      return NextResponse.json(
        { error: "Error llegint les setmanes actuals." },
        { status: 500 }
      );
    }

    const { data: selectedWeeks, error: weeksError } = await supabaseAdmin
      .from("weeks")
      .select("id, price")
      .in("id", weekIds);

    if (weeksError || !selectedWeeks) {
      console.error("Error llegint setmanes seleccionades:", weeksError);

      return NextResponse.json(
        { error: "Error llegint les setmanes seleccionades." },
        { status: 500 }
      );
    }

    const currentWeekIds = new Set(
      (currentRegistrations || []).map((registration) =>
        String(registration.week_id)
      )
    );

    const selectedWeekIds = new Set(
      selectedWeeks.map((week) => String(week.id))
    );

    const weekIdsToDelete =
      currentRegistrations
        ?.filter(
          (registration) =>
            !selectedWeekIds.has(String(registration.week_id))
        )
        .map((registration) => String(registration.week_id)) || [];

    const weeksToAdd = selectedWeeks.filter(
      (week) => !currentWeekIds.has(String(week.id))
    );

    if (weekIdsToDelete.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from("registrations")
        .delete()
        .eq("participant_id", participantId)
        .in("week_id", weekIdsToDelete);

      if (deleteError) {
        console.error("Error eliminant setmanes:", deleteError);

        return NextResponse.json(
          { error: "Error eliminant setmanes de l'inscrit." },
          { status: 500 }
        );
      }
    }

    if (weeksToAdd.length > 0) {
      const newRegistrations = weeksToAdd.map((week) => ({
        participant_id: participantId,
        week_id: week.id,
        price: Number(week.price || 0),
        payment_status: "pendent",
      }));

      const { error: insertError } = await supabaseAdmin
        .from("registrations")
        .insert(newRegistrations);

      if (insertError) {
        console.error("Error afegint setmanes:", insertError);

        return NextResponse.json(
          { error: "Error afegint setmanes a l'inscrit." },
          { status: 500 }
        );
      }
    }

    await updatePaymentStatus(participantId);

    return Response.redirect(
      new URL(`/admin/participants/${participantId}`, request.url),
      303
    );
  } catch (error) {
    console.error("Error inesperat:", error);

    return NextResponse.json(
      { error: "Error inesperat actualitzant setmanes." },
      { status: 500 }
    );
  }
}