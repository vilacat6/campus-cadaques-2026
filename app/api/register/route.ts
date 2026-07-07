import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const firstName = String(formData.get("first_name") || "").trim();
    const lastName = String(formData.get("last_name") || "").trim();
    const birthDate = String(formData.get("birth_date") || "").trim();
    const city = String(formData.get("city") || "").trim();
    const shirtSize = String(formData.get("shirt_size") || "").trim();

    const tutorName = String(formData.get("tutor_name") || "").trim();
    const phone1 = String(formData.get("phone_1") || "").trim();
    const phone2 = String(formData.get("phone_2") || "").trim();
    const email = String(formData.get("email") || "").trim();

    const allergies = String(formData.get("allergies") || "").trim();
    const medicalNotes = String(formData.get("medical_notes") || "").trim();
    const comments = String(formData.get("comments") || "").trim();

    const weekIds = formData
      .getAll("week_ids")
      .map((weekId) => String(weekId || "").trim())
      .filter(Boolean);

    const authorizationAccepted =
      formData.get("authorization") === "on" ||
      formData.get("participation_authorization") === "on";

    const dataProtectionAccepted =
      formData.get("data_protection") === "on" ||
      formData.get("privacy_policy") === "on" ||
      formData.get("privacy") === "on";

    const imageAuthorizationAccepted =
      formData.get("image_authorization") === "on";

    if (!firstName || !lastName || !birthDate) {
      return NextResponse.json(
        { error: "Falten dades del menor." },
        { status: 400 }
      );
    }

    if (!tutorName || !phone1 || !email) {
      return NextResponse.json(
        { error: "Falten dades del pare, mare o tutor/a." },
        { status: 400 }
      );
    }

    if (weekIds.length === 0) {
      return NextResponse.json(
        { error: "Cal seleccionar com a mínim una setmana." },
        { status: 400 }
      );
    }

    if (!authorizationAccepted || !dataProtectionAccepted) {
      return NextResponse.json(
        { error: "Cal acceptar les autoritzacions obligatòries." },
        { status: 400 }
      );
    }

    const { data: selectedWeeks, error: weeksError } = await supabaseAdmin
      .from("weeks")
      .select("id, price, active")
      .in("id", weekIds);

    if (weeksError) {
      console.error("Error carregant setmanes seleccionades:", weeksError);

      return NextResponse.json(
        {
          error: "Error comprovant les setmanes seleccionades.",
          supabase_error: weeksError,
        },
        { status: 500 }
      );
    }

    const activeSelectedWeeks = (selectedWeeks || []).filter(
      (week) => week.active
    );

    if (activeSelectedWeeks.length === 0) {
      return NextResponse.json(
        { error: "Les setmanes seleccionades no són vàlides." },
        { status: 400 }
      );
    }

    const { data: participant, error: participantError } = await supabaseAdmin
      .from("participants")
      .insert({
        first_name: firstName,
        last_name: lastName,
        birth_date: birthDate,
        city: city || null,
        shirt_size: shirtSize || null,
        allergies: allergies || null,
        medical_notes: medicalNotes || null,
        comments: comments || null,
        image_authorization: imageAuthorizationAccepted,
      })
      .select("id")
      .single();

    if (participantError || !participant) {
      console.error("Error creant participant:", participantError);

      return NextResponse.json(
        {
          error: "Error guardant les dades del participant.",
          supabase_error: participantError,
        },
        { status: 500 }
      );
    }

    const participantId = participant.id;

    const { error: tutorError } = await supabaseAdmin.from("tutors").insert({
      participant_id: participantId,
      tutor_name: tutorName,
      phone_1: phone1,
      phone_2: phone2 || null,
      email,
    });

    if (tutorError) {
      console.error("Error creant tutor:", tutorError);

      await supabaseAdmin.from("participants").delete().eq("id", participantId);

      return NextResponse.json(
        {
          error: "Error guardant les dades del tutor/a.",
          supabase_error: tutorError,
        },
        { status: 500 }
      );
    }

    const registrationsToInsert = activeSelectedWeeks.map((week) => ({
      participant_id: participantId,
      week_id: week.id,
      price: Number(week.price || 0),
      payment_status: "pendent",
    }));

    const { error: registrationsError } = await supabaseAdmin
      .from("registrations")
      .insert(registrationsToInsert);

    if (registrationsError) {
      console.error("Error creant inscripcions:", registrationsError);

      await supabaseAdmin
        .from("tutors")
        .delete()
        .eq("participant_id", participantId);

      await supabaseAdmin.from("participants").delete().eq("id", participantId);

      return NextResponse.json(
        {
          error: "Error guardant les setmanes seleccionades.",
          supabase_error: registrationsError,
        },
        { status: 500 }
      );
    }

    return NextResponse.redirect(
      new URL("/inscripcio-confirmada", request.url),
      {
        status: 303,
      }
    );
  } catch (error) {
    console.error("Error inesperat registrant inscripció:", error);

    return NextResponse.json(
      { error: "Error inesperat guardant la inscripció." },
      { status: 500 }
    );
  }
}