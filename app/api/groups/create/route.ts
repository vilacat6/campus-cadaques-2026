import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const weekId = String(formData.get("week_id") || "").trim();
    const name = String(formData.get("name") || "").trim();
    const description = String(formData.get("description") || "").trim();

    if (!weekId) {
      return NextResponse.json(
        { error: "Falta la setmana." },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Falta el nom del grup." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("groups").insert({
      week_id: weekId,
      name,
      description: description || null,
    });

    if (error) {
      console.error("Error creant grup:", error);

      return NextResponse.json(
        { error: "Error creant el grup." },
        { status: 500 }
      );
    }

    return Response.redirect(
      new URL(`/admin/weeks/${weekId}/groups`, request.url),
      303
    );
  } catch (error) {
    console.error("Error inesperat:", error);

    return NextResponse.json(
      { error: "Error inesperat creant el grup." },
      { status: 500 }
    );
  }
}