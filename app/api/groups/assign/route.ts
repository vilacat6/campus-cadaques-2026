import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const groupId = String(formData.get("group_id") || "").trim();
    const weekId = String(formData.get("week_id") || "").trim();

    if (!groupId || !weekId) {
      return NextResponse.json(
        { error: "Falta el grup o la setmana." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("groups")
      .delete()
      .eq("id", groupId)
      .eq("week_id", weekId);

    if (error) {
      console.error("Error esborrant grup:", error);

      return NextResponse.json(
        { error: "Error esborrant el grup." },
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
      { error: "Error inesperat esborrant el grup." },
      { status: 500 }
    );
  }
}