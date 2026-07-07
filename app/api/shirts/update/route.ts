import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const participantId = String(formData.get("participant_id") || "").trim();
    const shirtDelivered = formData.get("shirt_delivered") === "on";
    const shirtDeliveredDate = String(
      formData.get("shirt_delivered_date") || ""
    ).trim();
    const shirtNotes = String(formData.get("shirt_notes") || "").trim();

    if (!participantId) {
      return NextResponse.json(
        { error: "Falta l'identificador del participant." },
        { status: 400 }
      );
    }

    const finalDeliveredDate = shirtDelivered
      ? shirtDeliveredDate || new Date().toISOString().slice(0, 10)
      : null;

    const { error } = await supabaseAdmin
      .from("participants")
      .update({
        shirt_delivered: shirtDelivered,
        shirt_delivered_date: finalDeliveredDate,
        shirt_notes: shirtNotes || null,
      })
      .eq("id", participantId);

    if (error) {
      console.error("Error actualitzant samarreta:", error);

      return NextResponse.json(
        {
          error: "Error actualitzant l'estat de la samarreta.",
          supabase_error: error,
        },
        { status: 500 }
      );
    }

    return NextResponse.redirect(new URL("/admin/shirts", request.url), {
      status: 303,
    });
  } catch (error) {
    console.error("Error inesperat actualitzant samarreta:", error);

    return NextResponse.json(
      { error: "Error inesperat actualitzant l'estat de la samarreta." },
      { status: 500 }
    );
  }
}