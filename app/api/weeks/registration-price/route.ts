import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const registrationId = String(formData.get("registration_id") || "").trim();
    const weekId = String(formData.get("week_id") || "").trim();
    const priceRaw = String(formData.get("price") || "")
      .replace(",", ".")
      .trim();

    if (!registrationId || !weekId) {
      return NextResponse.json(
        { error: "Falten dades per actualitzar el preu." },
        { status: 400 }
      );
    }

    const price = Number(priceRaw);

    if (Number.isNaN(price) || price < 0) {
      return NextResponse.json(
        { error: "El preu introduït no és vàlid." },
        { status: 400 }
      );
    }

    const { error: registrationError } = await supabaseAdmin
      .from("registrations")
      .update({
        price,
      })
      .eq("id", registrationId);

    if (registrationError) {
      return NextResponse.json(
        {
          error: "No s'ha pogut actualitzar el preu de la inscripció.",
          supabase_error: registrationError,
        },
        { status: 500 }
      );
    }

    const { error: paymentError } = await supabaseAdmin
      .from("payments")
      .update({
        amount: price,
      })
      .eq("registration_id", registrationId);

    if (paymentError) {
      return NextResponse.json(
        {
          error:
            "S'ha actualitzat el preu, però no s'ha pogut actualitzar el pagament vinculat.",
          supabase_error: paymentError,
        },
        { status: 500 }
      );
    }

    return NextResponse.redirect(new URL(`/admin/weeks/${weekId}`, request.url), {
      status: 303,
    });
  } catch (error) {
    console.error("Error inesperat actualitzant preu individual:", error);

    return NextResponse.json(
      { error: "Error inesperat actualitzant el preu individual." },
      { status: 500 }
    );
  }
}