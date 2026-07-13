import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const participantId = String(formData.get("participant_id") || "").trim();
    const confirmDelete = String(formData.get("confirm_delete") || "").trim();

    if (!participantId) {
      return NextResponse.json(
        { error: "Falta l'identificador del participant." },
        { status: 400 }
      );
    }

    if (confirmDelete !== "ELIMINAR") {
      return NextResponse.json(
        {
          error:
            "Per eliminar el participant, cal escriure ELIMINAR al camp de confirmació.",
        },
        { status: 400 }
      );
    }

    await supabaseAdmin
      .from("attendance")
      .delete()
      .eq("participant_id", participantId);

    await supabaseAdmin
      .from("group_participants")
      .delete()
      .eq("participant_id", participantId);

    await supabaseAdmin
      .from("payments")
      .delete()
      .eq("participant_id", participantId);

    await supabaseAdmin
      .from("incidents")
      .delete()
      .eq("participant_id", participantId);

    await supabaseAdmin
      .from("registrations")
      .delete()
      .eq("participant_id", participantId);

    await supabaseAdmin
      .from("tutors")
      .delete()
      .eq("participant_id", participantId);

    const { error: participantError } = await supabaseAdmin
      .from("participants")
      .delete()
      .eq("id", participantId);

    if (participantError) {
      console.error("Error eliminant participant:", participantError);

      return NextResponse.json(
        {
          error: "No s'ha pogut eliminar el participant.",
          supabase_error: participantError,
        },
        { status: 500 }
      );
    }

    return NextResponse.redirect(new URL("/admin", request.url), {
      status: 303,
    });
  } catch (error) {
    console.error("Error inesperat eliminant participant:", error);

    return NextResponse.json(
      { error: "Error inesperat eliminant el participant." },
      { status: 500 }
    );
  }
}