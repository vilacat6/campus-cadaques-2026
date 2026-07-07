import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const participantId = String(formData.get("participant_id") || "").trim();

    const firstName = String(formData.get("first_name") || "").trim();
    const lastName = String(formData.get("last_name") || "").trim();
    const birthDate = String(formData.get("birth_date") || "");
    const city = String(formData.get("city") || "").trim();
    const shirtSize = String(formData.get("shirt_size") || "").trim();
    const medicalNotes = String(formData.get("medical_notes") || "").trim();
    const allergies = String(formData.get("allergies") || "").trim();
    const comments = String(formData.get("comments") || "").trim();

    const tutorName = String(formData.get("tutor_name") || "").trim();
    const phone1 = String(formData.get("phone_1") || "").trim();
    const phone2 = String(formData.get("phone_2") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const dni = String(formData.get("dni") || "").trim();

    const imageConsent = formData.get("image_consent") === "on";
    const medicalAuthorization =
      formData.get("medical_authorization") === "on";
    const dataConsent = formData.get("data_consent") === "on";

    if (!participantId) {
      return NextResponse.json(
        { error: "Falta l'identificador del participant." },
        { status: 400 }
      );
    }

    if (!firstName || !lastName || !birthDate) {
      return NextResponse.json(
        { error: "Falten dades obligatòries del nen/a." },
        { status: 400 }
      );
    }

    if (!tutorName || !phone1 || !email) {
      return NextResponse.json(
        { error: "Falten dades obligatòries del tutor." },
        { status: 400 }
      );
    }

    if (!medicalAuthorization || !dataConsent) {
      return NextResponse.json(
        { error: "Cal acceptar les autoritzacions obligatòries." },
        { status: 400 }
      );
    }

    const { error: participantError } = await supabaseAdmin
      .from("participants")
      .update({
        first_name: firstName,
        last_name: lastName,
        birth_date: birthDate,
        city,
        shirt_size: shirtSize,
        medical_notes: medicalNotes,
        allergies,
        comments,
        image_consent: imageConsent,
        medical_authorization: medicalAuthorization,
        data_consent: dataConsent,
      })
      .eq("id", participantId);

    if (participantError) {
      console.error("Error actualitzant participant:", participantError);

      return NextResponse.json(
        { error: "Error actualitzant les dades del participant." },
        { status: 500 }
      );
    }

    const { data: existingTutors, error: tutorReadError } = await supabaseAdmin
      .from("tutors")
      .select("participant_id")
      .eq("participant_id", participantId);

    if (tutorReadError) {
      console.error("Error llegint tutor:", tutorReadError);

      return NextResponse.json(
        { error: "Error llegint les dades del tutor." },
        { status: 500 }
      );
    }

    if (existingTutors && existingTutors.length > 0) {
      const { error: tutorUpdateError } = await supabaseAdmin
        .from("tutors")
        .update({
          tutor_name: tutorName,
          phone_1: phone1,
          phone_2: phone2,
          email,
          dni,
        })
        .eq("participant_id", participantId);

      if (tutorUpdateError) {
        console.error("Error actualitzant tutor:", tutorUpdateError);

        return NextResponse.json(
          { error: "Error actualitzant les dades del tutor." },
          { status: 500 }
        );
      }
    } else {
      const { error: tutorInsertError } = await supabaseAdmin
        .from("tutors")
        .insert({
          participant_id: participantId,
          tutor_name: tutorName,
          phone_1: phone1,
          phone_2: phone2,
          email,
          dni,
        });

      if (tutorInsertError) {
        console.error("Error creant tutor:", tutorInsertError);

        return NextResponse.json(
          { error: "Error creant les dades del tutor." },
          { status: 500 }
        );
      }
    }

    return Response.redirect(
      new URL(`/admin/participants/${participantId}`, request.url),
      303
    );
  } catch (error) {
    console.error("Error inesperat:", error);

    return NextResponse.json(
      { error: "Error inesperat actualitzant l'inscrit." },
      { status: 500 }
    );
  }
}