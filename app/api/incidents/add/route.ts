import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const participantId = String(formData.get("participant_id") || "").trim();
    const incidentDate = String(formData.get("incident_date") || "").trim();
    const incidentType = String(formData.get("incident_type") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const familyNotified = formData.get("family_notified") === "on";
    const internalNotes = String(formData.get("internal_notes") || "").trim();

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

    const { error } = await supabaseAdmin.from("incidents").insert({
      participant_id: participantId,
      incident_date: incidentDate || new Date().toISOString().slice(0, 10),
      incident_type: incidentType || "Altres",
      description,
      family_notified: familyNotified,
      internal_notes: internalNotes || null,
    });

    if (error) {
      console.error("Error afegint incidència:", error);

      return NextResponse.json(
        {
          error: "Error afegint la incidència.",
          supabase_error: error,
        },
        { status: 500 }
      );
    }

    return NextResponse.redirect(new URL("/admin/incidents", request.url), {
      status: 303,
    });
  } catch (error) {
    console.error("Error inesperat afegint incidència:", error);

    return NextResponse.json(
      { error: "Error inesperat afegint la incidència." },
      { status: 500 }
    );
  }
}