import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type Week = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  price: number | null;
  max_places: number | null;
  active: boolean | null;
};

type Registration = {
  id: string;
  participant_id: string;
  price: number | null;
  payment_status: string | null;
};

type Participant = {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  city: string | null;
  shirt_size: string | null;
  medical_notes: string | null;
  allergies: string | null;
  comments: string | null;
};

type Tutor = {
  participant_id: string;
  tutor_name: string | null;
  phone_1: string | null;
  phone_2: string | null;
  email: string | null;
  dni: string | null;
};

type Payment = {
  participant_id: string;
  amount: number | null;
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ca-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

function calculateAge(birthDate: string) {
  const birth = new Date(birthDate);
  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();
  const monthDifference = today.getMonth() - birth.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age;
}

function getPaymentStatus(totalAmount: number, totalPaid: number) {
  if (totalAmount > 0 && totalPaid >= totalAmount) {
    return "pagat";
  }

  if (totalPaid > 0) {
    return "parcial";
  }

  return "pendent";
}

export default async function WeekParticipantsPage({ params }: PageProps) {
  const { id } = await params;

  const { data: weekData, error: weekError } = await supabaseAdmin
    .from("weeks")
    .select("id, name, start_date, end_date, price, max_places, active")
    .eq("id", id)
    .single();

  const { data: registrationsData, error: registrationsError } =
    await supabaseAdmin
      .from("registrations")
      .select("id, participant_id, price, payment_status")
      .eq("week_id", id);

  if (weekError || !weekData) {
    return (
      <main className="min-h-screen bg-red-50 p-8">
        <h1 className="text-3xl font-bold text-red-700">
          No s’ha pogut carregar la setmana
        </h1>

        <pre className="mt-6 whitespace-pre-wrap rounded bg-white p-4 text-sm text-red-900">
          {JSON.stringify(weekError, null, 2)}
        </pre>

        <a
          href="/admin/weeks"
          className="mt-6 inline-block rounded-xl bg-blue-800 px-5 py-3 font-bold text-white"
        >
          Tornar a setmanes
        </a>
      </main>
    );
  }

  if (registrationsError) {
    return (
      <main className="min-h-screen bg-red-50 p-8">
        <h1 className="text-3xl font-bold text-red-700">
          Error carregant inscrits
        </h1>

        <pre className="mt-6 whitespace-pre-wrap rounded bg-white p-4 text-sm text-red-900">
          {JSON.stringify(registrationsError, null, 2)}
        </pre>

        <a
          href="/admin/weeks"
          className="mt-6 inline-block rounded-xl bg-blue-800 px-5 py-3 font-bold text-white"
        >
          Tornar a setmanes
        </a>
      </main>
    );
  }

  const week = weekData as unknown as Week;
  const registrations = (registrationsData || []) as unknown as Registration[];

  const participantIds = Array.from(
    new Set(registrations.map((registration) => registration.participant_id))
  );

  let participants: Participant[] = [];
  let tutors: Tutor[] = [];
  let payments: Payment[] = [];

  if (participantIds.length > 0) {
    const { data: participantsData, error: participantsError } =
      await supabaseAdmin
        .from("participants")
        .select(
          "id, first_name, last_name, birth_date, city, shirt_size, medical_notes, allergies, comments"
        )
        .in("id", participantIds);

    const { data: tutorsData, error: tutorsError } = await supabaseAdmin
      .from("tutors")
      .select("participant_id, tutor_name, phone_1, phone_2, email, dni")
      .in("participant_id", participantIds);

    const { data: paymentsData, error: paymentsError } = await supabaseAdmin
      .from("payments")
      .select("participant_id, amount")
      .in("participant_id", participantIds);

    if (participantsError) {
      console.error("Error carregant participants:", participantsError);
    }

    if (tutorsError) {
      console.error("Error carregant tutors:", tutorsError);
    }

    if (paymentsError) {
      console.error("Error carregant pagaments:", paymentsError);
    }

    participants = (participantsData || []) as unknown as Participant[];
    tutors = (tutorsData || []) as unknown as Tutor[];
    payments = (paymentsData || []) as unknown as Payment[];
  }

  function getParticipant(participantId: string) {
    return participants.find((participant) => participant.id === participantId);
  }

  function getTutor(participantId: string) {
    return tutors.find((tutor) => tutor.participant_id === participantId);
  }

  function getTotalPaid(participantId: string) {
    return payments
      .filter((payment) => payment.participant_id === participantId)
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  }

  const sortedRegistrations = [...registrations].sort((a, b) => {
    const participantA = getParticipant(a.participant_id);
    const participantB = getParticipant(b.participant_id);

    const nameA = `${participantA?.last_name || ""} ${
      participantA?.first_name || ""
    }`;

    const nameB = `${participantB?.last_name || ""} ${
      participantB?.first_name || ""
    }`;

    return nameA.localeCompare(nameB);
  });

  const registeredCount = registrations.length;

  const freePlaces =
    week.max_places === null
      ? null
      : Math.max(week.max_places - registeredCount, 0);

  const totalExpected = registrations.reduce(
    (sum, registration) => sum + Number(registration.price || 0),
    0
  );

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="bg-blue-900 px-6 py-8 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap gap-3">
            <a
              href="/admin/weeks"
              className="rounded-xl bg-blue-800 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
            >
              ← Tornar a setmanes
            </a>

            <a
              href="/admin"
              className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-blue-900 hover:bg-blue-50"
            >
              Tornar al panell
            </a>

            <a
              href={`/admin/weeks/${week.id}/groups`}
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700"
            >
              Gestionar grups
            </a>

            <a
              href={`/admin/weeks/${week.id}/attendance`}
              className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600"
            >
              Control assistència
            </a>

            <a
              href={`/admin/weeks/${week.id}/attendance-summary`}
              className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700"
            >
              Resum assistència
            </a>

            <a
              href={`/admin/weeks/${week.id}/print`}
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-900"
            >
              Imprimir llistat
            </a>
          </div>

          <h1 className="mt-4 text-4xl font-bold">{week.name}</h1>

          <p className="mt-2 text-blue-100">
            Del {formatDate(week.start_date)} al {formatDate(week.end_date)}
          </p>
        </div>
      </section>

      <section className="px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Inscrits aquesta setmana
              </p>

              <p className="mt-2 text-4xl font-bold text-slate-900">
                {registeredCount}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Places màximes
              </p>

              <p className="mt-2 text-4xl font-bold text-slate-900">
                {week.max_places ?? "—"}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Places lliures
              </p>

              <p className="mt-2 text-4xl font-bold text-green-700">
                {freePlaces ?? "—"}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Ingressos previstos
              </p>

              <p className="mt-2 text-4xl font-bold text-slate-900">
                {totalExpected.toFixed(2)} €
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow">
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Inscrits de la setmana
              </h2>

              <p className="mt-1 text-slate-600">
                Llistat ordenat alfabèticament.
              </p>
            </div>

            {sortedRegistrations.length === 0 ? (
              <div className="p-6 text-slate-600">
                Encara no hi ha cap inscrit en aquesta setmana.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="border-b p-4">Nen/a</th>
                      <th className="border-b p-4">Edat</th>
                      <th className="border-b p-4">Talla</th>
                      <th className="border-b p-4">Tutor</th>
                      <th className="border-b p-4">Contacte</th>
                      <th className="border-b p-4">Observacions</th>
                      <th className="border-b p-4">Pagament</th>
                    </tr>
                  </thead>

                  <tbody>
                    {sortedRegistrations.map((registration) => {
                      const participant = getParticipant(
                        registration.participant_id
                      );

                      const tutor = getTutor(registration.participant_id);
                      const paid = getTotalPaid(registration.participant_id);

                      const status = getPaymentStatus(
                        Number(registration.price || 0),
                        paid
                      );

                      if (!participant) {
                        return (
                          <tr key={registration.id}>
                            <td className="border-b p-4" colSpan={7}>
                              Participant no trobat
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={registration.id} className="align-top">
                          <td className="border-b p-4">
                            <a
                              href={`/admin/participants/${participant.id}`}
                              className="font-semibold text-blue-800 hover:underline"
                            >
                              {participant.first_name} {participant.last_name}
                            </a>

                            <p className="mt-1 text-xs text-slate-500">
                              {participant.city || "-"}
                            </p>
                          </td>

                          <td className="border-b p-4">
                            {calculateAge(participant.birth_date)} anys
                          </td>

                          <td className="border-b p-4">
                            {participant.shirt_size || "-"}
                          </td>

                          <td className="border-b p-4">
                            {tutor?.tutor_name || "-"}
                          </td>

                          <td className="border-b p-4">
                            <p>{tutor?.phone_1 || "-"}</p>

                            {tutor?.phone_2 && (
                              <p className="text-slate-500">
                                {tutor.phone_2}
                              </p>
                            )}

                            <p className="text-slate-500">
                              {tutor?.email || "-"}
                            </p>
                          </td>

                          <td className="border-b p-4">
                            {participant.allergies && (
                              <p className="mb-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
                                Al·lèrgies: {participant.allergies}
                              </p>
                            )}

                            {participant.medical_notes && (
                              <p className="mb-1 rounded bg-red-50 px-2 py-1 text-xs text-red-800">
                                Mèdic: {participant.medical_notes}
                              </p>
                            )}

                            {participant.comments && (
                              <p className="rounded bg-slate-50 px-2 py-1 text-xs text-slate-700">
                                {participant.comments}
                              </p>
                            )}

                            {!participant.allergies &&
                              !participant.medical_notes &&
                              !participant.comments && (
                                <span className="text-slate-500">-</span>
                              )}
                          </td>

                          <td className="border-b p-4">
                            <p className="font-semibold">
                              {Number(registration.price || 0).toFixed(2)} €
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Pagat total: {paid.toFixed(2)} €
                            </p>

                            <p
                              className={`mt-1 inline-block rounded px-2 py-1 text-xs font-bold ${
                                status === "pagat"
                                  ? "bg-green-100 text-green-800"
                                  : status === "parcial"
                                    ? "bg-orange-100 text-orange-800"
                                    : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {status}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}