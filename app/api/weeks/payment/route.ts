import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const action = String(formData.get("action") || "").trim();
    const registrationId = String(formData.get("registration_id") || "").trim();
    const participantId = String(formData.get("participant_id") || "").trim();
    const weekId = String(formData.get("week_id") || "").trim();
    const paymentMethod = String(formData.get("payment_method") || "").trim();

    if (!registrationId || !participantId || !weekId) {
      return NextResponse.json(
        { error: "Falten dades per actualitzar el pagament." },
        { status: 400 }
      );
    }

    if (action !== "mark_paid" && action !== "mark_pending") {
      return NextResponse.json(
        { error: "Acció de pagament no vàlida." },
        { status: 400 }
      );
    }

    const { data: registration, error: registrationError } =
      await supabaseAdmin
        .from("registrations")
        .select("id, participant_id, week_id, price, payment_status")
        .eq("id", registrationId)
        .single();

    if (registrationError || !registration) {
      return NextResponse.json(
        {
          error: "No s'ha trobat la inscripció.",
          supabase_error: registrationError,
        },
        { status: 404 }
      );
    }

    const { data: week } = await supabaseAdmin
      .from("weeks")
      .select("id, name")
      .eq("id", weekId)
      .maybeSingle();

    if (action === "mark_pending") {
      const { error: deletePaymentsError } = await supabaseAdmin
        .from("payments")
        .delete()
        .eq("registration_id", registrationId);

      if (deletePaymentsError) {
        return NextResponse.json(
          {
            error: "No s'ha pogut eliminar el pagament vinculat.",
            supabase_error: deletePaymentsError,
          },
          { status: 500 }
        );
      }

      const { error: updateRegistrationError } = await supabaseAdmin
        .from("registrations")
        .update({
          payment_status: "pendent",
        })
        .eq("id", registrationId);

      if (updateRegistrationError) {
        return NextResponse.json(
          {
            error: "No s'ha pogut marcar la inscripció com a pendent.",
            supabase_error: updateRegistrationError,
          },
          { status: 500 }
        );
      }

      return NextResponse.redirect(new URL(`/admin/weeks/${weekId}`, request.url), {
        status: 303,
      });
    }

    const amount = Number(registration.price || 0);

    const { error: deletePreviousPaymentError } = await supabaseAdmin
      .from("payments")
      .delete()
      .eq("registration_id", registrationId);

    if (deletePreviousPaymentError) {
      return NextResponse.json(
        {
          error: "No s'ha pogut netejar el pagament anterior.",
          supabase_error: deletePreviousPaymentError,
        },
        { status: 500 }
      );
    }

    const today = new Date().toISOString().slice(0, 10);

    const { error: insertPaymentError } = await supabaseAdmin
      .from("payments")
      .insert({
        participant_id: participantId,
        week_id: weekId,
        registration_id: registrationId,
        amount,
        payment_date: today,
        payment_method: paymentMethod || "No indicat",
        notes: `Pagament ${week?.name || "setmana"}`,
      });

    if (insertPaymentError) {
      return NextResponse.json(
        {
          error: "No s'ha pogut crear el pagament.",
          supabase_error: insertPaymentError,
        },
        { status: 500 }
      );
    }

    const { error: updateRegistrationError } = await supabaseAdmin
      .from("registrations")
      .update({
        payment_status: "pagat",
      })
      .eq("id", registrationId);

    if (updateRegistrationError) {
      return NextResponse.json(
        {
          error: "S'ha creat el pagament però no s'ha pogut actualitzar l'estat.",
          supabase_error: updateRegistrationError,
        },
        { status: 500 }
      );
    }

    return NextResponse.redirect(new URL(`/admin/weeks/${weekId}`, request.url), {
      status: 303,
    });
  } catch (error) {
    console.error("Error inesperat actualitzant pagament de setmana:", error);

    return NextResponse.json(
      { error: "Error inesperat actualitzant el pagament." },
      { status: 500 }
    );
  }
}