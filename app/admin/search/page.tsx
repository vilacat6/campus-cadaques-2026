import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

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
};

type Registration = {
  id: string;
  participant_id: string;
  week_id: string;
  price: number | string | null;
};

type Week = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
};

type Payment = {
  participant_id: string;
  amount: number | string | null;
};

type PageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

function formatDate(date: string) {
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

function getStatusClass(status: string) {
  if (status === "pagat") {
    return "bg-green-100 text-green-800";
  }

  if (status === "parcial") {
    return "bg-orange-100 text-orange-800";
  }

  return "bg-slate-100 text-slate-700";
}

export default async function AdminSearchPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const searchText = String(query.q || "").trim();
  const cleanSearchText = searchText.toLowerCase();

  const { data: participantsData, error: participantsError } =
    await supabaseAdmin
      .from("participants")
      .select(
        "id, first_name, last_name, birth_date, city, shirt_size, medical_notes, allergies, comments"
      )
      .order("last_name", { ascending: true });

  const { data: tutorsData, error: tutorsError } = await supabaseAdmin
    .from("tutors")
    .select("participant_id, tutor_name, phone_1, phone_2, email");

  const { data: registrationsData, error: registrationsError } =
    await supabaseAdmin
      .from("registrations")
      .select("id, participant_id, week_id, price");

  const { data: weeksData, error: weeksError } = await supabaseAdmin
    .from("weeks")
    .select("id, name, start_date, end_date")
    .order("start_date", { ascending: true });

  const { data: paymentsData, error: paymentsError } = await supabaseAdmin
    .from("payments")
    .select("participant_id, amount");

  if (participantsError) {
    return (
      <main className="min-h-screen bg-red-50 p-8">
        <h1 className="text-3xl font-bold text-red-700">
          Error carregant participants
        </h1>

        <pre className="mt-6 whitespace-pre-wrap rounded bg-white p-4 text-sm text-red-900">
          {JSON.stringify(participantsError, null, 2)}
        </pre>

        <a
          href="/admin"
          className="mt-6 inline-block rounded-xl bg-blue-800 px-5 py-3 font-bold text-white"
        >
          Tornar al panell
        </a>
      </main>
    );
  }

  if (tutorsError) {
    console.error("Error carregant tutors:", tutorsError);
  }

  if (registrationsError) {
    console.error("Error carregant inscripcions:", registrationsError);
  }

  if (weeksError) {
    console.error("Error carregant setmanes:", weeksError);
  }

  if (paymentsError) {
    console.error("Error carregant pagaments:", paymentsError);
  }

  const participants = (participantsData || []) as unknown as Participant[];
  const tutors = (tutorsData || []) as unknown as Tutor[];
  const registrations = (registrationsData || []) as unknown as Registration[];
  const weeks = (weeksData || []) as unknown as Week[];
  const payments = (paymentsData || []) as unknown as Payment[];

  function getTutor(participantId: string) {
    return tutors.find((tutor) => tutor.participant_id === participantId);
  }

  function getParticipantRegistrations(participantId: string) {
    return registrations.filter(
      (registration) => registration.participant_id === participantId
    );
  }

  function getParticipantWeeks(participantId: string) {
    return getParticipantRegistrations(participantId)
      .map((registration) =>
        weeks.find((week) => week.id === registration.week_id)
      )
      .filter((week): week is Week => Boolean(week))
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  }

  function getParticipantExpected(participantId: string) {
    return getParticipantRegistrations(participantId).reduce(
      (sum, registration) => sum + Number(registration.price || 0),
      0
    );
  }

  function getParticipantPaid(participantId: string) {
    return payments
      .filter((payment) => payment.participant_id === participantId)
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  }

  const filteredParticipants = participants
    .filter((participant) => {
      if (!cleanSearchText) {
        return true;
      }

      const tutor = getTutor(participant.id);
      const participantWeeks = getParticipantWeeks(participant.id);

      const searchableText = [
        participant.first_name,
        participant.last_name,
        participant.city,
        participant.shirt_size,
        participant.medical_notes,
        participant.allergies,
        participant.comments,
        tutor?.tutor_name,
        tutor?.phone_1,
        tutor?.phone_2,
        tutor?.email,
        ...participantWeeks.map((week) => week.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(cleanSearchText);
    })
    .sort((a, b) => {
      const nameA = `${a.last_name} ${a.first_name}`;
      const nameB = `${b.last_name} ${b.first_name}`;

      return nameA.localeCompare(nameB);
    });

  const totalExpected = filteredParticipants.reduce(
    (sum, participant) => sum + getParticipantExpected(participant.id),
    0
  );

  const totalPaid = filteredParticipants.reduce(
    (sum, participant) => sum + getParticipantPaid(participant.id),
    0
  );

  const totalPending = Math.max(totalExpected - totalPaid, 0);

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="bg-blue-900 px-6 py-8 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap gap-3">
            <a
              href="/admin"
              className="rounded-xl bg-blue-800 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
            >
              ← Tornar al panell
            </a>

            <a
              href="/admin/payments"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
            >
              Cobraments
            </a>

            <a
              href="/admin/weeks"
              className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-blue-900 hover:bg-blue-50"
            >
              Setmanes
            </a>
          </div>

          <h1 className="mt-4 text-4xl font-bold">Cercador de participants</h1>

          <p className="mt-2 text-blue-100">
            Busca ràpidament nens, tutors, telèfons, emails o setmanes.
          </p>
        </div>
      </section>

      <section className="px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 rounded-2xl bg-white p-6 shadow">
            <form action="/admin/search" method="GET" className="flex gap-3">
              <input
                name="q"
                defaultValue={searchText}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg"
                placeholder="Buscar per nom, cognom, tutor, telèfon, email, poble, setmana..."
              />

              <button
                type="submit"
                className="rounded-xl bg-blue-800 px-6 py-3 font-bold text-white hover:bg-blue-900"
              >
                Buscar
              </button>

              {searchText && (
                <a
                  href="/admin/search"
                  className="rounded-xl bg-slate-100 px-6 py-3 font-bold text-slate-800 hover:bg-slate-200"
                >
                  Netejar
                </a>
              )}
            </form>
          </div>

          <div className="mb-8 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">Resultats</p>

              <p className="mt-2 text-4xl font-bold text-slate-900">
                {filteredParticipants.length}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Total a cobrar
              </p>

              <p className="mt-2 text-4xl font-bold text-slate-900">
                {formatCurrency(totalExpected)}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Total cobrat
              </p>

              <p className="mt-2 text-4xl font-bold text-green-700">
                {formatCurrency(totalPaid)}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Pendent de cobrar
              </p>

              <p className="mt-2 text-4xl font-bold text-orange-700">
                {formatCurrency(totalPending)}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow">
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Resultats de la cerca
              </h2>

              <p className="mt-1 text-slate-600">
                {searchText
                  ? `Resultats per: "${searchText}"`
                  : "Mostrant tots els participants."}
              </p>
            </div>

            {filteredParticipants.length === 0 ? (
              <div className="p-6 text-slate-600">
                No s’ha trobat cap participant amb aquesta cerca.
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
                      <th className="border-b p-4">Setmanes</th>
                      <th className="border-b p-4">Pagament</th>
                      <th className="border-b p-4">Observacions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredParticipants.map((participant) => {
                      const tutor = getTutor(participant.id);
                      const participantWeeks = getParticipantWeeks(
                        participant.id
                      );

                      const expected = getParticipantExpected(participant.id);
                      const paid = getParticipantPaid(participant.id);
                      const pending = Math.max(expected - paid, 0);
                      const status = getPaymentStatus(expected, paid);

                      return (
                        <tr key={participant.id} className="align-top">
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
                            {participantWeeks.length === 0 ? (
                              <span className="text-slate-500">-</span>
                            ) : (
                              <div className="space-y-1">
                                {participantWeeks.map((week) => (
                                  <a
                                    key={`${participant.id}-${week.id}`}
                                    href={`/admin/weeks/${week.id}`}
                                    className="block rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-100"
                                  >
                                    {week.name}
                                    <span className="ml-1 font-normal text-blue-600">
                                      ({formatDate(week.start_date)})
                                    </span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </td>

                          <td className="border-b p-4">
                            <p className="font-semibold">
                              Total: {formatCurrency(expected)}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Pagat: {formatCurrency(paid)}
                            </p>

                            <p className="mt-1 text-xs text-orange-700">
                              Pendent: {formatCurrency(pending)}
                            </p>

                            <p
                              className={`mt-1 inline-block rounded px-2 py-1 text-xs font-bold ${getStatusClass(
                                status
                              )}`}
                            >
                              {status}
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