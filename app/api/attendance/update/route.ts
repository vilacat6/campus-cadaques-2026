import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const weekId = String(formData.get("week_id") || "").trim();
    const attendanceDate = String(formData.get("attendance_date") || "").trim();

    const participantIds = formData
      .getAll("participant_ids")
      .map(String)
      .filter(Boolean);

    if (!weekId) {
      return NextResponse.json(
        { error: "Falta la setmana." },
        { status: 400 }
      );
    }

    if (!attendanceDate) {
      return NextResponse.json(
        { error: "Falta la data d'assistència." },
        { status: 400 }
      );
    }

    if (participantIds.length === 0) {
      return NextResponse.json(
        { error: "No hi ha participants per actualitzar." },
        { status: 400 }
      );
    }

    const attendanceRows = participantIds.map((participantId) => {
      const status = String(
        formData.get(`status_${participantId}`) || "present"
      ).trim();

      const notes = String(
        formData.get(`notes_${participantId}`) || ""
      ).trim();

      return {
        week_id: weekId,
        participant_id: participantId,
        attendance_date: attendanceDate,
        status,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      };
    });

    const { error } = await supabaseAdmin.from("attendance").upsert(
      attendanceRows,
      {
        onConflict: "week_id,participant_id,attendance_date",
      }
    );

    if (error) {
      console.error("Error guardant assistència:", error);

      return NextResponse.json(
        { error: "Error guardant l'assistència." },
        { status: 500 }
      );
    }

    return Response.redirect(
      new URL(
        `/admin/weeks/${weekId}/attendance?date=${attendanceDate}`,
        request.url
      ),
      303
    );
  } catch (error) {
    console.error("Error inesperat:", error);

    return NextResponse.json(
      { error: "Error inesperat guardant l'assistència." },
      { status: 500 }
    );
  }
}