import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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
  price: number | null;
  payment_status: string | null;
};

type Week = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
};

type Payment = {
  participant_id: string;
  amount: number | null;
};

type Expense = {
  amount: number | string | null;
};

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

function hasImportantNote(participant: Participant) {
  return Boolean(
    String(participant.allergies || "").trim() ||
      String(participant.medical_notes || "").trim() ||
      String(participant.comments || "").trim()
  );
}

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("campus_admin_session")?.value;

  if (!session) {
    redirect("/admin-login");
  }

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
      .select("id, participant_id, week_id, price, payment_status");

  const { data: weeksData, error: weeksError } = await supabaseAdmin
    .from("weeks")
    .select("id, name, start_date, end_date")
    .order("start_date", { ascending: true });

  const { data: paymentsData, error: paymentsError } = await supabaseAdmin
    .from("payments")
    .select("participant_id, amount");

  const { data: expensesData, error: expensesError } = await supabaseAdmin
    .from("expenses")
    .select("amount");

  if (participantsError) {
    return (
      <main className="min-h-screen bg-red-50 p-8">
        <h1 className="text-3xl font-bold text-red-700">
          Error carregant participants
        </h1>

        <pre className="mt-6 whitespace-pre-wrap rounded bg-white p-4 text-sm text-red-900">
          {JSON.stringify(participantsError, null, 2)}
        </pre>
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

  if (expensesError) {
    console.error("Error carregant despeses:", expensesError);
  }

  const participants = (participantsData || []) as unknown as Participant[];
  const tutors = (tutorsData || []) as unknown as Tutor[];
  const registrations = (registrationsData || []) as unknown as Registration[];
  const weeks = (weeksData || []) as unknown as Week[];
  const payments = (paymentsData || []) as unknown as Payment[];
  const expenses = (expensesData || []) as unknown as Expense[];

  function getTutor(participantId: string) {
    return tutors.find((tutor) => tutor.participant_id === participantId);
  }

  function getParticipantRegistrations(participantId: string) {
    return registrations.filter(
      (registration) => registration.participant_id === participantId
    );
  }

  function getParticipantWeeks(participantId: string) {
    const participantRegistrations =
      getParticipantRegistrations(participantId);

    return participantRegistrations
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

  const totalExpected = registrations.reduce(
    (sum, registration) => sum + Number(registration.price || 0),
    0
  );

  const totalPaid = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );

  const totalPending = Math.max(totalExpected - totalPaid, 0);

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  const expectedResult = totalExpected - totalExpenses;
  const realResult = totalPaid - totalExpenses;

  const participantsWithDebt = participants.filter((participant) => {
    const expected = getParticipantExpected(participant.id);
    const paid = getParticipantPaid(participant.id);

    return expected > paid;
  }).length;

  const participantsWithAlerts = participants.filter((participant) =>
    hasImportantNote(participant)
  ).length;

  const sortedParticipants = [...participants].sort((a, b) => {
    const nameA = `${a.last_name} ${a.first_name}`;
    const nameB = `${b.last_name} ${b.first_name}`;

    return nameA.localeCompare(nameB);
  });

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="bg-blue-900 px-6 py-8 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold">
                Panell administració Campus U.E. Cadaqués
              </h1>

              <p className="mt-2 text-blue-100">
                Control d’inscripcions, setmanes, pagaments, assistència,
                incidències i material.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/api/admin/export"
                className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700"
              >
                Exportar a Excel
              </a>

              <form action="/api/admin/logout" method="POST">
                <button
                  type="submit"
                  className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                >
                  Sortir
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Participants inscrits
              </p>

              <p className="mt-2 text-4xl font-bold text-slate-900">
                {participants.length}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Inscripcions setmanals: {registrations.length}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Pendent de cobrar
              </p>

              <p className="mt-2 text-4xl font-bold text-orange-700">
                {formatCurrency(totalPending)}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Famílies pendents: {participantsWithDebt}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Resultat real cobrat
              </p>

              <p
                className={`mt-2 text-4xl font-bold ${
                  realResult >= 0 ? "text-green-700" : "text-red-700"
                }`}
              >
                {formatCurrency(realResult)}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Cobrat: {formatCurrency(totalPaid)}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Observacions importants
              </p>

              <p className="mt-2 text-4xl font-bold text-amber-700">
                {participantsWithAlerts}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Al·lèrgies, mèdic o comentaris
              </p>
            </div>
          </div>

          <div className="mb-8 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Ingressos previstos
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-900">
                {formatCurrency(totalExpected)}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Ingressos cobrats
              </p>

              <p className="mt-2 text-3xl font-bold text-green-700">
                {formatCurrency(totalPaid)}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">Despeses</p>

              <p className="mt-2 text-3xl font-bold text-red-700">
                {formatCurrency(totalExpenses)}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Resultat previst
              </p>

              <p
                className={`mt-2 text-3xl font-bold ${
                  expectedResult >= 0 ? "text-green-700" : "text-red-700"
                }`}
              >
                {formatCurrency(expectedResult)}
              </p>
            </div>
          </div>

          <div className="mb-8 grid gap-6 lg:grid-cols-4">
            <div className="rounded-2xl bg-white p-6 shadow lg:col-span-1">
              <h2 className="mb-4 text-xl font-bold text-slate-900">
                Gestió esportiva
              </h2>

              <div className="grid gap-3">
                <a
                  href="/admin/weeks"
                  className="rounded-xl bg-blue-50 px-4 py-3 font-bold text-blue-900 hover:bg-blue-100"
                >
                  Setmanes, grups i assistència
                </a>

                <a
                  href="/admin/alerts"
                  className="rounded-xl bg-amber-50 px-4 py-3 font-bold text-amber-900 hover:bg-amber-100"
                >
                  Observacions importants
                </a>

                <a
                  href="/admin/incidents"
                  className="rounded-xl bg-red-50 px-4 py-3 font-bold text-red-900 hover:bg-red-100"
                >
                  Incidències
                </a>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow lg:col-span-1">
              <h2 className="mb-4 text-xl font-bold text-slate-900">
                Administració
              </h2>

              <div className="grid gap-3">
                <a
                  href="/admin/search"
                  className="rounded-xl bg-cyan-50 px-4 py-3 font-bold text-cyan-900 hover:bg-cyan-100"
                >
                  Cercador de participants
                </a>

                <a
                  href="/admin/shirts"
                  className="rounded-xl bg-fuchsia-50 px-4 py-3 font-bold text-fuchsia-900 hover:bg-fuchsia-100"
                >
                  Control de samarretes
                </a>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow lg:col-span-1">
              <h2 className="mb-4 text-xl font-bold text-slate-900">
                Economia
              </h2>

              <div className="grid gap-3">
                <a
                  href="/admin/payments"
                  className="rounded-xl bg-emerald-50 px-4 py-3 font-bold text-emerald-900 hover:bg-emerald-100"
                >
                  Cobraments
                </a>

                <a
                  href="/admin/pending-payments"
                  className="rounded-xl bg-orange-50 px-4 py-3 font-bold text-orange-900 hover:bg-orange-100"
                >
                  Pendents de cobrament
                </a>

                <a
                  href="/admin/expenses"
                  className="rounded-xl bg-red-50 px-4 py-3 font-bold text-red-900 hover:bg-red-100"
                >
                  Despeses
                </a>

                <a
                  href="/admin/finance"
                  className="rounded-xl bg-violet-50 px-4 py-3 font-bold text-violet-900 hover:bg-violet-100"
                >
                  Resum econòmic
                </a>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow lg:col-span-1">
              <h2 className="mb-4 text-xl font-bold text-slate-900">
                Sistema
              </h2>

              <div className="grid gap-3">
                <a
                  href="/api/admin/export"
                  className="rounded-xl bg-green-50 px-4 py-3 font-bold text-green-900 hover:bg-green-100"
                >
                  Exportar tota la informació
                </a>

                <a
                  href="/"
                  className="rounded-xl bg-slate-50 px-4 py-3 font-bold text-slate-900 hover:bg-slate-100"
                >
                  Veure formulari públic
                </a>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow">
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Participants inscrits
              </h2>

              <p className="mt-1 text-slate-600">
                Llistat general de nens i nenes inscrits al campus.
              </p>
            </div>

            {sortedParticipants.length === 0 ? (
              <div className="p-6 text-slate-600">
                Encara no hi ha cap inscripció.
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
                    {sortedParticipants.map((participant) => {
                      const tutor = getTutor(participant.id);
                      const participantWeeks = getParticipantWeeks(
                        participant.id
                      );

                      const expected = getParticipantExpected(participant.id);
                      const paid = getParticipantPaid(participant.id);
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