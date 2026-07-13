import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Participant = {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  city: string | null;
  shirt_size: string | null;
  allergies: string | null;
  medical_notes: string | null;
  comments: string | null;
  image_authorization: boolean | null;
  shirt_delivered: boolean | null;
  shirt_delivered_date: string | null;
  shirt_notes: string | null;
};

type Tutor = {
  id: string;
  participant_id: string;
  tutor_name: string | null;
  phone_1: string | null;
  phone_2: string | null;
  email: string | null;
};

type Registration = {
  id: string;
  participant_id: string;
  week_id: string;
  price: number | string | null;
  payment_status: string | null;
};

type Week = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
};

type Payment = {
  id: string;
  participant_id: string;
  amount: number | string | null;
  payment_date: string | null;
  payment_method: string | null;
  notes: string | null;
};

type Incident = {
  id: string;
  participant_id: string;
  incident_date: string | null;
  incident_type: string | null;
  description: string | null;
  family_notified: boolean | null;
  internal_notes: string | null;
};

function formatDate(date: string | null) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("ca-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ca-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function calculateAge(birthDate: string | null) {
  if (!birthDate) {
    return null;
  }

  const today = new Date();
  const birth = new Date(birthDate);

  let age = today.getFullYear() - birth.getFullYear();
  const monthDifference = today.getMonth() - birth.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birth.getDate())
  ) {
    age -= 1;
  }

  return age;
}

export default async function ParticipantDetailPage({ params }: PageProps) {
  const { id } = await params;

  const { data: participantData, error: participantError } = await supabaseAdmin
    .from("participants")
    .select("*")
    .eq("id", id)
    .single();

  if (participantError || !participantData) {
    notFound();
  }

  const participant = participantData as Participant;

  const { data: tutorData } = await supabaseAdmin
    .from("tutors")
    .select("*")
    .eq("participant_id", id)
    .maybeSingle();

  const { data: registrationsData } = await supabaseAdmin
    .from("registrations")
    .select("*")
    .eq("participant_id", id);

  const { data: paymentsData } = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("participant_id", id)
    .order("payment_date", { ascending: false });

  const { data: incidentsData } = await supabaseAdmin
    .from("incidents")
    .select("*")
    .eq("participant_id", id)
    .order("incident_date", { ascending: false });

  const tutor = tutorData as Tutor | null;
  const registrations = (registrationsData || []) as Registration[];
  const payments = (paymentsData || []) as Payment[];
  const incidents = (incidentsData || []) as Incident[];

  const weekIds = registrations
    .map((registration) => registration.week_id)
    .filter(Boolean);

  const { data: weeksData } =
    weekIds.length > 0
      ? await supabaseAdmin
          .from("weeks")
          .select("id, name, start_date, end_date")
          .in("id", weekIds)
      : { data: [] };

  const weeks = (weeksData || []) as Week[];

  const weeksById = weeks.reduce<Record<string, Week>>((acc, week) => {
    acc[week.id] = week;
    return acc;
  }, {});

  const totalToPay = registrations.reduce((total, registration) => {
    return total + Number(registration.price || 0);
  }, 0);

  const totalPaid = payments.reduce((total, payment) => {
    return total + Number(payment.amount || 0);
  }, 0);

  const pendingAmount = totalToPay - totalPaid;
  const age = calculateAge(participant.birth_date);

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-[#C62828] p-6 text-white shadow">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-red-100">
                Fitxa del participant
              </p>

              <h1 className="mt-1 text-3xl font-black">
                {participant.first_name} {participant.last_name}
              </h1>

              <p className="mt-2 text-red-50">
                Consulta les dades del menor, tutor/a, setmanes, pagaments,
                observacions i autoritzacions.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href="/admin"
                className="rounded-xl bg-white px-4 py-2 text-sm font-black text-[#C62828] shadow hover:bg-red-50"
              >
                Tornar al panell
              </a>

              <a
                href={`/admin/participants/${participant.id}/edit`}
                className="rounded-xl border border-white/40 px-4 py-2 text-sm font-black text-white hover:bg-white/10"
              >
                Editar participant
              </a>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow">
            <p className="text-sm font-bold text-slate-500">Edat</p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              {age !== null ? `${age} anys` : "-"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow">
            <p className="text-sm font-bold text-slate-500">Total inscripció</p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              {formatCurrency(totalToPay)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow">
            <p className="text-sm font-bold text-slate-500">Cobrat</p>
            <p className="mt-2 text-3xl font-black text-green-700">
              {formatCurrency(totalPaid)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow">
            <p className="text-sm font-bold text-slate-500">Pendent</p>
            <p
              className={
                pendingAmount > 0
                  ? "mt-2 text-3xl font-black text-orange-700"
                  : "mt-2 text-3xl font-black text-green-700"
              }
            >
              {formatCurrency(Math.max(pendingAmount, 0))}
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow">
              <h2 className="text-2xl font-black text-[#C62828]">
                Dades del menor
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-bold text-slate-500">Nom</p>
                  <p className="mt-1 font-black text-slate-900">
                    {participant.first_name} {participant.last_name}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-500">
                    Data de naixement
                  </p>
                  <p className="mt-1 font-black text-slate-900">
                    {formatDate(participant.birth_date)}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-500">
                    Població / municipi
                  </p>
                  <p className="mt-1 font-black text-slate-900">
                    {participant.city || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-500">
                    Talla samarreta
                  </p>
                  <p className="mt-1 font-black text-slate-900">
                    {participant.shirt_size || "-"}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow">
              <h2 className="text-2xl font-black text-[#C62828]">
                Setmanes inscrites
              </h2>

              {registrations.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  Aquest participant no té cap setmana assignada.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {registrations.map((registration) => {
                    const week = weeksById[registration.week_id];

                    return (
                      <div
                        key={registration.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-black text-slate-900">
                              {week?.name || "Setmana"}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {week
                                ? `Del ${formatDate(
                                    week.start_date
                                  )} al ${formatDate(week.end_date)}`
                                : "Dates no disponibles"}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-[#FDECEC] px-3 py-1 text-xs font-black text-[#C62828]">
                              {formatCurrency(Number(registration.price || 0))}
                            </span>

                            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700">
                              {registration.payment_status || "pendent"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow">
              <h2 className="text-2xl font-black text-[#C62828]">
                Informació mèdica i observacions
              </h2>

              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-700">
                    Al·lèrgies
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                    {participant.allergies || "No consta cap al·lèrgia."}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-700">
                    Informació mèdica rellevant
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                    {participant.medical_notes ||
                      "No consta informació mèdica rellevant."}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-700">
                    Comentaris
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                    {participant.comments || "No consten comentaris."}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow">
              <h2 className="text-2xl font-black text-red-800">
                Eliminar participant
              </h2>

              <p className="mt-2 text-sm text-red-700">
                Aquesta acció eliminarà definitivament el participant i totes
                les seves dades relacionades: setmanes, pagaments, assistència,
                grups, incidències i tutor/a.
              </p>

              <form
                action="/api/participants/delete"
                method="POST"
                className="mt-5 space-y-4"
              >
                <input
                  type="hidden"
                  name="participant_id"
                  value={participant.id}
                />

                <div>
                  <label className="mb-1 block text-sm font-black text-red-800">
                    Per confirmar, escriu ELIMINAR
                  </label>

                  <input
                    name="confirm_delete"
                    required
                    placeholder="ELIMINAR"
                    className="w-full rounded-xl border border-red-300 bg-white px-4 py-3 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-xl bg-red-700 px-5 py-3 text-sm font-black text-white shadow hover:bg-red-800"
                >
                  Eliminar definitivament aquest participant
                </button>
              </form>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow">
              <h2 className="text-2xl font-black text-[#C62828]">
                Tutor/a
              </h2>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-sm font-bold text-slate-500">
                    Nom i cognoms
                  </p>
                  <p className="mt-1 font-black text-slate-900">
                    {tutor?.tutor_name || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-500">
                    Telèfon principal
                  </p>
                  <p className="mt-1 font-black text-slate-900">
                    {tutor?.phone_1 || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-500">
                    Telèfon alternatiu
                  </p>
                  <p className="mt-1 font-black text-slate-900">
                    {tutor?.phone_2 || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-500">Email</p>
                  <p className="mt-1 break-all font-black text-slate-900">
                    {tutor?.email || "-"}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow">
              <h2 className="text-2xl font-black text-[#C62828]">
                Autoritzacions
              </h2>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-green-50 p-4">
                  <p className="text-sm font-black text-green-800">
                    Participació i urgències
                  </p>
                  <p className="mt-1 text-sm text-green-700">
                    Autorització obligatòria acceptada.
                  </p>
                </div>

                <div
                  className={
                    participant.image_authorization
                      ? "rounded-2xl bg-green-50 p-4"
                      : "rounded-2xl bg-red-50 p-4"
                  }
                >
                  <p
                    className={
                      participant.image_authorization
                        ? "text-sm font-black text-green-800"
                        : "text-sm font-black text-red-800"
                    }
                  >
                    Autorització d’imatge
                  </p>

                  <p
                    className={
                      participant.image_authorization
                        ? "mt-1 text-sm text-green-700"
                        : "mt-1 text-sm text-red-700"
                    }
                  >
                    {participant.image_authorization
                      ? "Sí autoritza l’ús d’imatges."
                      : "No autoritza l’ús d’imatges."}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow">
              <h2 className="text-2xl font-black text-[#C62828]">
                Samarreta
              </h2>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-sm font-bold text-slate-500">Talla</p>
                  <p className="mt-1 font-black text-slate-900">
                    {participant.shirt_size || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-500">
                    Entregada
                  </p>
                  <p
                    className={
                      participant.shirt_delivered
                        ? "mt-1 font-black text-green-700"
                        : "mt-1 font-black text-orange-700"
                    }
                  >
                    {participant.shirt_delivered ? "Sí" : "No"}
                  </p>
                </div>

                {participant.shirt_delivered_date ? (
                  <div>
                    <p className="text-sm font-bold text-slate-500">
                      Data entrega
                    </p>
                    <p className="mt-1 font-black text-slate-900">
                      {formatDate(participant.shirt_delivered_date)}
                    </p>
                  </div>
                ) : null}

                {participant.shirt_notes ? (
                  <div>
                    <p className="text-sm font-bold text-slate-500">Notes</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                      {participant.shirt_notes}
                    </p>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow">
              <h2 className="text-2xl font-black text-[#C62828]">
                Pagaments
              </h2>

              {payments.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  No consta cap pagament.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <p className="font-black text-slate-900">
                        {formatCurrency(Number(payment.amount || 0))}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {formatDate(payment.payment_date)}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        {payment.payment_method || "Sense mètode"}
                      </p>

                      {payment.notes ? (
                        <p className="mt-2 text-xs text-slate-500">
                          {payment.notes}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow">
              <h2 className="text-2xl font-black text-[#C62828]">
                Incidències
              </h2>

              {incidents.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  No consta cap incidència.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {incidents.map((incident) => (
                    <div
                      key={incident.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <p className="font-black text-slate-900">
                        {incident.incident_type || "Incidència"}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {formatDate(incident.incident_date)}
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                        {incident.description || "-"}
                      </p>

                      <p
                        className={
                          incident.family_notified
                            ? "mt-2 text-xs font-black text-green-700"
                            : "mt-2 text-xs font-black text-orange-700"
                        }
                      >
                        {incident.family_notified
                          ? "Família avisada"
                          : "Família no avisada"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}