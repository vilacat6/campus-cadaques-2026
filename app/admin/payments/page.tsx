import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type Participant = {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  city: string | null;
  shirt_size: string | null;
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
  id: string;
  participant_id: string;
  amount: number | string | null;
  payment_date: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string | null;
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

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
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

export default async function AdminPaymentsPage() {
  const { data: participantsData, error: participantsError } =
    await supabaseAdmin
      .from("participants")
      .select("id, first_name, last_name, birth_date, city, shirt_size")
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
    .select(
      "id, participant_id, amount, payment_date, payment_method, notes, created_at"
    )
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });

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

  function getParticipantPayments(participantId: string) {
    return payments.filter(
      (payment) => payment.participant_id === participantId
    );
  }

  function getParticipantPaid(participantId: string) {
    return getParticipantPayments(participantId).reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0
    );
  }

  const participantsWithRegistrations = participants.filter(
    (participant) => getParticipantRegistrations(participant.id).length > 0
  );

  const sortedParticipants = [...participantsWithRegistrations].sort((a, b) => {
    const pendingA = getParticipantExpected(a.id) - getParticipantPaid(a.id);
    const pendingB = getParticipantExpected(b.id) - getParticipantPaid(b.id);

    if (pendingA !== pendingB) {
      return pendingB - pendingA;
    }

    const nameA = `${a.last_name} ${a.first_name}`;
    const nameB = `${b.last_name} ${b.first_name}`;

    return nameA.localeCompare(nameB);
  });

  const totalExpected = registrations.reduce(
    (sum, registration) => sum + Number(registration.price || 0),
    0
  );

  const totalPaid = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );

  const totalPending = Math.max(totalExpected - totalPaid, 0);

  const paidParticipants = sortedParticipants.filter((participant) => {
    const expected = getParticipantExpected(participant.id);
    const paid = getParticipantPaid(participant.id);

    return expected > 0 && paid >= expected;
  }).length;

  const pendingParticipants = sortedParticipants.filter((participant) => {
    const expected = getParticipantExpected(participant.id);
    const paid = getParticipantPaid(participant.id);

    return expected > paid;
  }).length;

  const paymentMethodTotals = payments.reduce<Record<string, number>>(
    (groups, payment) => {
      const method = String(payment.payment_method || "").trim();
      const key = method || "Sense indicar";

      if (!groups[key]) {
        groups[key] = 0;
      }

      groups[key] += Number(payment.amount || 0);

      return groups;
    },
    {}
  );

  const sortedPaymentMethods = Object.entries(paymentMethodTotals).sort(
    ([, amountA], [, amountB]) => amountB - amountA
  );

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
              href="/admin/expenses"
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
            >
              Despeses
            </a>

            <a
              href="/api/admin/export"
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700"
            >
              Exportar a Excel
            </a>
          </div>

          <h1 className="mt-4 text-4xl font-bold">Cobraments ràpids</h1>

          <p className="mt-2 text-blue-100">
            Control ràpid de pagaments, pendents i imports cobrats.
          </p>
        </div>
      </section>

      <section className="px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 grid gap-4 md:grid-cols-5">
            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Participants amb inscripció
              </p>

              <p className="mt-2 text-4xl font-bold text-slate-900">
                {sortedParticipants.length}
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

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Famílies pendents
              </p>

              <p className="mt-2 text-4xl font-bold text-red-700">
                {pendingParticipants}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Pagades: {paidParticipants}
              </p>
            </div>
          </div>

          <div className="mb-8 rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-4 text-2xl font-bold text-slate-900">
              Resum per forma de pagament
            </h2>

            {sortedPaymentMethods.length === 0 ? (
              <p className="text-slate-600">Encara no hi ha pagaments.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-4">
                {sortedPaymentMethods.map(([method, amount]) => (
                  <div
                    key={method}
                    className="rounded-xl bg-slate-50 px-4 py-3"
                  >
                    <p className="text-sm font-medium text-slate-500">
                      {method}
                    </p>

                    <p className="mt-1 text-2xl font-bold text-green-700">
                      {formatCurrency(amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow">
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Cobraments per participant
              </h2>

              <p className="mt-1 text-slate-600">
                Ordenat primer pels participants amb més import pendent.
              </p>
            </div>

            {sortedParticipants.length === 0 ? (
              <div className="p-6 text-slate-600">
                Encara no hi ha cap participant inscrit.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {sortedParticipants.map((participant) => {
                  const tutor = getTutor(participant.id);
                  const participantWeeks = getParticipantWeeks(participant.id);
                  const participantPayments = getParticipantPayments(
                    participant.id
                  );

                  const expected = getParticipantExpected(participant.id);
                  const paid = getParticipantPaid(participant.id);
                  const pending = Math.max(expected - paid, 0);
                  const status = getPaymentStatus(expected, paid);

                  return (
                    <div key={participant.id} className="p-6">
                      <div className="grid gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-4">
                          <a
                            href={`/admin/participants/${participant.id}`}
                            className="text-xl font-bold text-blue-800 hover:underline"
                          >
                            {participant.first_name} {participant.last_name}
                          </a>

                          <p className="mt-1 text-sm text-slate-500">
                            {participant.city || "-"} ·{" "}
                            {calculateAge(participant.birth_date)} anys · Talla{" "}
                            {participant.shirt_size || "-"}
                          </p>

                          <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm">
                            <p>
                              <strong>Tutor:</strong>{" "}
                              {tutor?.tutor_name || "-"}
                            </p>

                            <p>
                              <strong>Telèfon:</strong>{" "}
                              {tutor?.phone_1 || "-"}
                            </p>

                            {tutor?.phone_2 && (
                              <p>
                                <strong>Telèfon 2:</strong> {tutor.phone_2}
                              </p>
                            )}

                            <p>
                              <strong>Email:</strong> {tutor?.email || "-"}
                            </p>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {participantWeeks.map((week) => (
                              <a
                                key={week.id}
                                href={`/admin/weeks/${week.id}`}
                                className="rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-100"
                              >
                                {week.name}
                              </a>
                            ))}
                          </div>
                        </div>

                        <div className="lg:col-span-3">
                          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                            <div className="rounded-xl bg-slate-50 p-4">
                              <p className="text-sm text-slate-500">
                                Total a pagar
                              </p>

                              <p className="text-2xl font-bold text-slate-900">
                                {formatCurrency(expected)}
                              </p>
                            </div>

                            <div className="rounded-xl bg-green-50 p-4">
                              <p className="text-sm text-green-700">
                                Total pagat
                              </p>

                              <p className="text-2xl font-bold text-green-800">
                                {formatCurrency(paid)}
                              </p>
                            </div>

                            <div className="rounded-xl bg-orange-50 p-4">
                              <p className="text-sm text-orange-700">
                                Pendent
                              </p>

                              <p className="text-2xl font-bold text-orange-800">
                                {formatCurrency(pending)}
                              </p>

                              <p
                                className={`mt-2 inline-block rounded px-2 py-1 text-xs font-bold ${getStatusClass(
                                  status
                                )}`}
                              >
                                {status}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="lg:col-span-5">
                          <div className="rounded-2xl border border-slate-200 p-4">
                            <h3 className="mb-3 text-lg font-bold text-slate-900">
                              Afegir pagament
                            </h3>

                            <form
                              action="/api/payments/quick-add"
                              method="POST"
                              className="grid gap-3 md:grid-cols-2"
                            >
                              <input
                                type="hidden"
                                name="participant_id"
                                value={participant.id}
                              />

                              <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                  Import
                                </label>

                                <input
                                  type="number"
                                  step="0.01"
                                  name="amount"
                                  defaultValue={
                                    pending > 0 ? pending.toFixed(2) : ""
                                  }
                                  required
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                  Data
                                </label>

                                <input
                                  type="date"
                                  name="payment_date"
                                  defaultValue={todayDateInput()}
                                  required
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                  Forma de pagament
                                </label>

                                <select
                                  name="payment_method"
                                  defaultValue=""
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                                >
                                  <option value="">Sense indicar</option>
                                  <option value="Efectiu">Efectiu</option>
                                  <option value="Transferència">
                                    Transferència
                                  </option>
                                  <option value="Targeta">Targeta</option>
                                  <option value="Bizum">Bizum</option>
                                  <option value="Domiciliació">
                                    Domiciliació
                                  </option>
                                  <option value="Altres">Altres</option>
                                </select>
                              </div>

                              <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                  Notes
                                </label>

                                <input
                                  name="notes"
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                                  placeholder="Opcional"
                                />
                              </div>

                              <div className="md:col-span-2">
                                <button
                                  type="submit"
                                  className="rounded-xl bg-blue-800 px-5 py-3 font-bold text-white hover:bg-blue-900"
                                >
                                  Guardar pagament
                                </button>
                              </div>
                            </form>
                          </div>

                          <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                            <h3 className="mb-3 text-lg font-bold text-slate-900">
                              Historial de pagaments
                            </h3>

                            {participantPayments.length === 0 ? (
                              <p className="text-sm text-slate-500">
                                Encara no hi ha pagaments registrats.
                              </p>
                            ) : (
                              <div className="space-y-4">
                                {participantPayments.map((payment) => (
                                  <div
                                    key={payment.id}
                                    className="rounded-xl bg-slate-50 p-4 text-sm"
                                  >
                                    <form
                                      action="/api/payments/quick-update"
                                      method="POST"
                                      className="grid gap-3 md:grid-cols-2"
                                    >
                                      <input
                                        type="hidden"
                                        name="payment_id"
                                        value={payment.id}
                                      />

                                      <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-700">
                                          Import
                                        </label>

                                        <input
                                          type="number"
                                          step="0.01"
                                          name="amount"
                                          defaultValue={Number(
                                            payment.amount || 0
                                          ).toFixed(2)}
                                          required
                                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                                        />
                                      </div>

                                      <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-700">
                                          Data
                                        </label>

                                        <input
                                          type="date"
                                          name="payment_date"
                                          defaultValue={
                                            payment.payment_date ||
                                            todayDateInput()
                                          }
                                          required
                                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                                        />
                                      </div>

                                      <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-700">
                                          Forma de pagament
                                        </label>

                                        <select
                                          name="payment_method"
                                          defaultValue={
                                            payment.payment_method || ""
                                          }
                                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                                        >
                                          <option value="">
                                            Sense indicar
                                          </option>
                                          <option value="Efectiu">
                                            Efectiu
                                          </option>
                                          <option value="Transferència">
                                            Transferència
                                          </option>
                                          <option value="Targeta">
                                            Targeta
                                          </option>
                                          <option value="Bizum">Bizum</option>
                                          <option value="Domiciliació">
                                            Domiciliació
                                          </option>
                                          <option value="Altres">Altres</option>
                                        </select>
                                      </div>

                                      <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-700">
                                          Notes
                                        </label>

                                        <input
                                          name="notes"
                                          defaultValue={payment.notes || ""}
                                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                                        />
                                      </div>

                                      <div className="flex flex-wrap gap-2 md:col-span-2">
                                        <button
                                          type="submit"
                                          className="rounded-lg bg-blue-800 px-4 py-2 text-xs font-bold text-white hover:bg-blue-900"
                                        >
                                          Guardar canvis
                                        </button>

                                        <span className="rounded-lg bg-green-100 px-3 py-2 text-xs font-bold text-green-800">
                                          {formatCurrency(
                                            Number(payment.amount || 0)
                                          )}{" "}
                                          · {formatDate(payment.payment_date)}
                                        </span>
                                      </div>
                                    </form>

                                    <form
                                      action="/api/payments/quick-delete"
                                      method="POST"
                                      className="mt-3"
                                    >
                                      <input
                                        type="hidden"
                                        name="payment_id"
                                        value={payment.id}
                                      />

                                      <button
                                        type="submit"
                                        className="rounded-lg bg-red-100 px-3 py-2 text-xs font-bold text-red-800 hover:bg-red-200"
                                      >
                                        Esborrar pagament
                                      </button>
                                    </form>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}