import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Week = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  price: number | string | null;
  active: boolean | null;
  max_participants: number | null;
};

type Registration = {
  id: string;
  participant_id: string;
  week_id: string;
  price: number | string | null;
  payment_status: string | null;
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
};

type Tutor = {
  participant_id: string;
  tutor_name: string | null;
  phone_1: string | null;
  phone_2: string | null;
  email: string | null;
};

type Payment = {
  id: string;
  participant_id: string;
  week_id: string | null;
  registration_id: string | null;
  amount: number | string | null;
  payment_date: string | null;
  payment_method: string | null;
  notes: string | null;
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

function isRegistrationPaid(registration: Registration, payment?: Payment) {
  const status = String(registration.payment_status || "").toLowerCase();

  return (
    status === "pagat" ||
    status === "paid" ||
    status === "cobrat" ||
    Boolean(payment)
  );
}

export default async function AdminWeekDetailPage({ params }: PageProps) {
  const { id } = await params;

  const { data: weekData, error: weekError } = await supabaseAdmin
    .from("weeks")
    .select("id, name, start_date, end_date, price, active, max_participants")
    .eq("id", id)
    .single();

  if (weekError || !weekData) {
    notFound();
  }

  const week = weekData as Week;

  const { data: registrationsData, error: registrationsError } =
    await supabaseAdmin
      .from("registrations")
      .select("id, participant_id, week_id, price, payment_status")
      .eq("week_id", id);

  if (registrationsError) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-6 shadow">
          <h1 className="text-2xl font-black text-red-700">
            Error carregant les inscripcions
          </h1>

          <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-red-50 p-4 text-sm text-red-900">
            {JSON.stringify(registrationsError, null, 2)}
          </pre>

          <a
            href="/admin/weeks"
            className="mt-6 inline-flex rounded-xl bg-slate-900 px-4 py-2 font-bold text-white"
          >
            Tornar a setmanes
          </a>
        </div>
      </main>
    );
  }

  const registrations = (registrationsData || []) as Registration[];

  const participantIds = registrations
    .map((registration) => registration.participant_id)
    .filter(Boolean);

  const { data: participantsData } =
    participantIds.length > 0
      ? await supabaseAdmin
          .from("participants")
          .select(
            "id, first_name, last_name, birth_date, city, shirt_size, allergies, medical_notes, comments, image_authorization"
          )
          .in("id", participantIds)
      : { data: [] };

  const { data: tutorsData } =
    participantIds.length > 0
      ? await supabaseAdmin
          .from("tutors")
          .select("participant_id, tutor_name, phone_1, phone_2, email")
          .in("participant_id", participantIds)
      : { data: [] };

  const { data: paymentsData } =
    registrations.length > 0
      ? await supabaseAdmin
          .from("payments")
          .select(
            "id, participant_id, week_id, registration_id, amount, payment_date, payment_method, notes"
          )
          .eq("week_id", id)
      : { data: [] };

  const participants = (participantsData || []) as Participant[];
  const tutors = (tutorsData || []) as Tutor[];
  const payments = (paymentsData || []) as Payment[];

  const participantsById = participants.reduce<Record<string, Participant>>(
    (acc, participant) => {
      acc[participant.id] = participant;
      return acc;
    },
    {}
  );

  const tutorsByParticipantId = tutors.reduce<Record<string, Tutor>>(
    (acc, tutor) => {
      acc[tutor.participant_id] = tutor;
      return acc;
    },
    {}
  );

  const paymentsByRegistrationId = payments.reduce<Record<string, Payment>>(
    (acc, payment) => {
      if (payment.registration_id) {
        acc[payment.registration_id] = payment;
      }

      return acc;
    },
    {}
  );

  const sortedRegistrations = [...registrations].sort((a, b) => {
    const participantA = participantsById[a.participant_id];
    const participantB = participantsById[b.participant_id];

    const nameA = `${participantA?.last_name || ""} ${
      participantA?.first_name || ""
    }`;
    const nameB = `${participantB?.last_name || ""} ${
      participantB?.first_name || ""
    }`;

    return nameA.localeCompare(nameB, "ca");
  });

  const paidRegistrations = registrations.filter((registration) =>
    isRegistrationPaid(registration, paymentsByRegistrationId[registration.id])
  );

  const pendingRegistrations = registrations.filter(
    (registration) =>
      !isRegistrationPaid(registration, paymentsByRegistrationId[registration.id])
  );

  const totalExpected = registrations.reduce((total, registration) => {
    return total + Number(registration.price || 0);
  }, 0);

  const totalPaid = paidRegistrations.reduce((total, registration) => {
    const payment = paymentsByRegistrationId[registration.id];

    if (payment) {
      return total + Number(payment.amount || 0);
    }

    return total + Number(registration.price || 0);
  }, 0);

  const totalPending = Math.max(totalExpected - totalPaid, 0);
  const maxParticipants = week.max_participants || null;
  const freePlaces =
    maxParticipants !== null
      ? Math.max(maxParticipants - registrations.length, 0)
      : null;

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-[#C62828] p-6 text-white shadow">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-red-100">
                Setmana del campus
              </p>

              <h1 className="mt-1 text-3xl font-black">{week.name}</h1>

              <p className="mt-2 text-red-50">
                Del {formatDate(week.start_date)} al{" "}
                {formatDate(week.end_date)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href="/admin/weeks"
                className="rounded-xl bg-white px-4 py-2 text-sm font-black text-[#C62828] shadow hover:bg-red-50"
              >
                Tornar a setmanes
              </a>

              <a
                href={`/admin/weeks/${week.id}/attendance`}
                className="rounded-xl border border-white/40 px-4 py-2 text-sm font-black text-white hover:bg-white/10"
              >
                Assistència
              </a>

              <a
                href={`/admin/weeks/${week.id}/groups`}
                className="rounded-xl border border-white/40 px-4 py-2 text-sm font-black text-white hover:bg-white/10"
              >
                Grups
              </a>

              <a
                href={`/admin/weeks/${week.id}/print`}
                className="rounded-xl border border-white/40 px-4 py-2 text-sm font-black text-white hover:bg-white/10"
              >
                Imprimir
              </a>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow">
            <p className="text-sm font-bold text-slate-500">Inscrits</p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              {registrations.length}
              {maxParticipants !== null ? (
                <span className="text-slate-400"> / {maxParticipants}</span>
              ) : null}
            </p>

            {freePlaces !== null ? (
              <p className="mt-1 text-xs font-bold text-slate-500">
                {freePlaces} places lliures
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow">
            <p className="text-sm font-bold text-slate-500">Pagats</p>
            <p className="mt-2 text-3xl font-black text-green-700">
              {paidRegistrations.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow">
            <p className="text-sm font-bold text-slate-500">Pendents</p>
            <p className="mt-2 text-3xl font-black text-orange-700">
              {pendingRegistrations.length}
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
            <p className="mt-2 text-3xl font-black text-orange-700">
              {formatCurrency(totalPending)}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-2xl font-black text-[#C62828]">
                Participants i pagaments
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Des d’aquí pots veure qui està inscrit aquesta setmana, modificar
                el preu aplicat a cada nen i marcar si el pagament ja s’ha
                rebut.
              </p>
            </div>

            <div className="rounded-2xl bg-[#FDECEC] px-4 py-3 text-sm font-black text-[#C62828]">
              Preu base setmana: {formatCurrency(Number(week.price || 0))}
            </div>
          </div>

          {sortedRegistrations.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-6 text-center text-slate-500">
              Encara no hi ha cap participant inscrit en aquesta setmana.
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="hidden grid-cols-12 gap-3 bg-slate-100 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500 md:grid">
                <div className="col-span-3">Participant</div>
                <div className="col-span-2">Tutor/a</div>
                <div className="col-span-2">Contacte</div>
                <div className="col-span-2">Preu aplicat</div>
                <div className="col-span-1">Estat</div>
                <div className="col-span-2 text-right">Acció</div>
              </div>

              <div className="divide-y divide-slate-200 bg-white">
                {sortedRegistrations.map((registration) => {
                  const participant = participantsById[registration.participant_id];
                  const tutor = tutorsByParticipantId[registration.participant_id];
                  const payment = paymentsByRegistrationId[registration.id];
                  const isPaid = isRegistrationPaid(registration, payment);
                  const age = calculateAge(participant?.birth_date || null);

                  return (
                    <article
                      key={registration.id}
                      className="grid gap-4 px-4 py-4 md:grid-cols-12 md:items-center"
                    >
                      <div className="md:col-span-3">
                        <a
                          href={`/admin/participants/${registration.participant_id}`}
                          className="font-black text-slate-900 hover:text-[#C62828]"
                        >
                          {participant
                            ? `${participant.first_name} ${participant.last_name}`
                            : "Participant no trobat"}
                        </a>

                        <p className="mt-1 text-xs text-slate-500">
                          {age !== null ? `${age} anys` : "Edat no disponible"}
                          {participant?.shirt_size
                            ? ` · Samarreta ${participant.shirt_size}`
                            : ""}
                        </p>

                        {participant?.image_authorization === false ? (
                          <p className="mt-1 inline-flex rounded-full bg-red-50 px-2 py-1 text-xs font-black text-red-700">
                            No fotos
                          </p>
                        ) : null}
                      </div>

                      <div className="md:col-span-2">
                        <p className="text-sm font-bold text-slate-700">
                          {tutor?.tutor_name || "-"}
                        </p>
                      </div>

                      <div className="md:col-span-2">
                        <p className="text-sm text-slate-700">
                          {tutor?.phone_1 || "-"}
                        </p>

                        {tutor?.email ? (
                          <p className="mt-1 break-all text-xs text-slate-500">
                            {tutor.email}
                          </p>
                        ) : null}
                      </div>

                      <div className="md:col-span-2">
                        <form
                          action="/api/weeks/registration-price"
                          method="POST"
                          className="flex flex-col gap-2"
                        >
                          <input
                            type="hidden"
                            name="registration_id"
                            value={registration.id}
                          />

                          <input
                            type="hidden"
                            name="week_id"
                            value={week.id}
                          />

                          <input
                            type="number"
                            name="price"
                            min="0"
                            step="0.01"
                            defaultValue={Number(registration.price || 0)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-[#C62828] focus:ring-2 focus:ring-[#FDECEC]"
                          />

                          <button
                            type="submit"
                            className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white shadow hover:bg-slate-700"
                          >
                            Guardar preu
                          </button>

                          {payment ? (
                            <p className="text-xs font-semibold text-slate-500">
                              Si canvies el preu, també s’actualitza el pagament
                              vinculat.
                            </p>
                          ) : null}
                        </form>
                      </div>

                      <div className="md:col-span-1">
                        {isPaid ? (
                          <div>
                            <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-800">
                              Pagat
                            </span>

                            {payment ? (
                              <p className="mt-2 text-xs text-slate-500">
                                {payment.payment_method || "No indicat"} ·{" "}
                                {formatDate(payment.payment_date)}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-800">
                            Pendent
                          </span>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        {isPaid ? (
                          <form
                            action="/api/weeks/payment"
                            method="POST"
                            className="flex justify-start md:justify-end"
                          >
                            <input
                              type="hidden"
                              name="action"
                              value="mark_pending"
                            />
                            <input
                              type="hidden"
                              name="registration_id"
                              value={registration.id}
                            />
                            <input
                              type="hidden"
                              name="participant_id"
                              value={registration.participant_id}
                            />
                            <input
                              type="hidden"
                              name="week_id"
                              value={week.id}
                            />

                            <button
                              type="submit"
                              className="rounded-xl bg-white px-3 py-2 text-xs font-black text-orange-700 ring-1 ring-orange-200 hover:bg-orange-50"
                            >
                              Marcar pendent
                            </button>
                          </form>
                        ) : (
                          <form
                            action="/api/weeks/payment"
                            method="POST"
                            className="flex flex-col gap-2 md:items-end"
                          >
                            <input
                              type="hidden"
                              name="action"
                              value="mark_paid"
                            />
                            <input
                              type="hidden"
                              name="registration_id"
                              value={registration.id}
                            />
                            <input
                              type="hidden"
                              name="participant_id"
                              value={registration.participant_id}
                            />
                            <input
                              type="hidden"
                              name="week_id"
                              value={week.id}
                            />

                            <select
                              name="payment_method"
                              defaultValue="Bizum"
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-[#C62828] focus:ring-2 focus:ring-[#FDECEC] md:w-28"
                            >
                              <option value="Bizum">Bizum</option>
                              <option value="Efectiu">Efectiu</option>
                              <option value="Targeta">Targeta</option>
                              <option value="Transferència">
                                Transferència
                              </option>
                              <option value="Altres">Altres</option>
                            </select>

                            <button
                              type="submit"
                              className="rounded-xl bg-green-700 px-3 py-2 text-xs font-black text-white shadow hover:bg-green-800"
                            >
                              Marcar pagat
                            </button>
                          </form>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow">
          <h2 className="text-2xl font-black text-[#C62828]">
            Observacions importants
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {sortedRegistrations
              .map((registration) => participantsById[registration.participant_id])
              .filter((participant) => {
                return (
                  participant?.allergies ||
                  participant?.medical_notes ||
                  participant?.comments ||
                  participant?.image_authorization === false
                );
              })
              .map((participant) => (
                <div
                  key={participant.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="font-black text-slate-900">
                    {participant.first_name} {participant.last_name}
                  </p>

                  {participant.allergies ? (
                    <p className="mt-2 text-sm text-red-700">
                      <strong>Al·lèrgies:</strong> {participant.allergies}
                    </p>
                  ) : null}

                  {participant.medical_notes ? (
                    <p className="mt-2 text-sm text-orange-700">
                      <strong>Info mèdica:</strong>{" "}
                      {participant.medical_notes}
                    </p>
                  ) : null}

                  {participant.comments ? (
                    <p className="mt-2 text-sm text-slate-700">
                      <strong>Comentaris:</strong> {participant.comments}
                    </p>
                  ) : null}

                  {participant.image_authorization === false ? (
                    <p className="mt-2 text-sm font-black text-red-700">
                      No autoritza l’ús d’imatges.
                    </p>
                  ) : null}
                </div>
              ))}

            {sortedRegistrations.filter((registration) => {
              const participant = participantsById[registration.participant_id];

              return (
                participant?.allergies ||
                participant?.medical_notes ||
                participant?.comments ||
                participant?.image_authorization === false
              );
            }).length === 0 ? (
              <p className="text-sm text-slate-500">
                No consten observacions importants en aquesta setmana.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}