import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const incidentId = String(formData.get("incident_id") || "").trim();

    if (!incidentId) {
      return NextResponse.json(
        { error: "Falta l'identificador de la incidència." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("incidents")
      .delete()
      .eq("id", incidentId);

    if (error) {
      console.error("Error esborrant incidència:", error);

      return NextResponse.json(
        {
          error: "Error esborrant la incidència.",
          supabase_error: error,
        },
        { status: 500 }
      );
    }

    return NextResponse.redirect(new URL("/admin/incidents", request.url), {
      status: 303,
    });
  } catch (error) {
    console.error("Error inesperat esborrant incidència:", error);

    return NextResponse.json(
      { error: "Error inesperat esborrant la incidència." },
      { status: 500 }
    );
  }
}