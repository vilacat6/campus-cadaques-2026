import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const incidentId = String(formData.get("incident_id") || "").trim();
    const participantId = String(formData.get("participant_id") || "").trim();
    const incidentDate = String(formData.get("incident_date") || "").trim();
    const incidentType = String(formData.get("incident_type") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const familyNotified = formData.get("family_notified") === "on";
    const internalNotes = String(formData.get("internal_notes") || "").trim();

    if (!incidentId) {
      return NextResponse.json(
        { error: "Falta l'identificador de la incidència." },
        { status: 400 }
      );
    }

    if (!participantId) {
      return NextResponse.json(
        { error: "Falta seleccionar el participant." },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        { error: "Falta escriure la descripció de la incidència." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("incidents")
      .update({
        participant_id: participantId,
        incident_date: incidentDate || new Date().toISOString().slice(0, 10),
        incident_type: incidentType || "Altres",
        description,
        family_notified: familyNotified,
        internal_notes: internalNotes || null,
      })
      .eq("id", incidentId);

    if (error) {
      console.error("Error editant incidència:", error);

      return NextResponse.json(
        {
          error: "Error editant la incidència.",
          supabase_error: error,
        },
        { status: 500 }
      );
    }

    return NextResponse.redirect(new URL("/admin/incidents", request.url), {
      status: 303,
    });
  } catch (error) {
    console.error("Error inesperat editant incidència:", error);

    return NextResponse.json(
      { error: "Error inesperat editant la incidència." },
      { status: 500 }
    );
  }
}