import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const id = String(formData.get("id") || "").trim();
    const name = String(formData.get("name") || "").trim();
    const startDate = String(formData.get("start_date") || "").trim();
    const endDate = String(formData.get("end_date") || "").trim();
    const priceRaw = String(formData.get("price") || "").trim();

    const maxParticipantsRaw = String(
      formData.get("max_participants") ||
        formData.get("participant_limit") ||
        formData.get("capacity") ||
        ""
    ).trim();

    const activeRaw = formData.get("active");

    if (!id) {
      return NextResponse.json(
        { error: "Falta l'identificador de la setmana." },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Falta el nom de la setmana." },
        { status: 400 }
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Falten les dates de la setmana." },
        { status: 400 }
      );
    }

    const price = Number(priceRaw || 0);

    if (Number.isNaN(price) || price < 0) {
      return NextResponse.json(
        { error: "El preu no és vàlid." },
        { status: 400 }
      );
    }

    let maxParticipants: number | null = null;

    if (maxParticipantsRaw) {
      const parsedMaxParticipants = Number(maxParticipantsRaw);

      if (
        Number.isNaN(parsedMaxParticipants) ||
        !Number.isInteger(parsedMaxParticipants) ||
        parsedMaxParticipants < 1
      ) {
        return NextResponse.json(
          { error: "El límit de participants no és vàlid." },
          { status: 400 }
        );
      }

      maxParticipants = parsedMaxParticipants;
    }

    const active =
      activeRaw === "on" ||
      activeRaw === "true" ||
      activeRaw === "1" ||
      activeRaw === "si" ||
      activeRaw === "sí";

    const { error } = await supabaseAdmin
      .from("weeks")
      .update({
        name,
        start_date: startDate,
        end_date: endDate,
        price,
        active,
        max_participants: maxParticipants,
      })
      .eq("id", id);

    if (error) {
      console.error("Error actualitzant setmana:", error);

      return NextResponse.json(
        {
          error: "No s'ha pogut actualitzar la setmana.",
          supabase_error: error,
        },
        { status: 500 }
      );
    }
    return NextResponse.redirect(new URL("/admin/weeks", request.url), {
      status: 303,
    });
  } catch (error) {
    console.error("Error inesperat actualitzant setmana:", error);

    return NextResponse.json(
      { error: "Error inesperat actualitzant la setmana." },
      { status: 500 }
    );
  }
}