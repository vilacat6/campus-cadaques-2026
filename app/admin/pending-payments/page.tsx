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
  participant_id: string;
  amount: number | string | null;
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

function getWhatsappNumber(phone: string | null) {
  const digits = String(phone || "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("0034") && digits.length >= 13) {
    return `34${digits.slice(4)}`;
  }

  if (digits.startsWith("34") && digits.length >= 11) {
    return digits;
  }

  if (digits.length === 9) {
    return `34${digits}`;
  }

  return digits;
}

function createWhatsappMessage(participantName: string, pending: number) {
  return encodeURIComponent(
    `Hola, us recordem que teniu pendent de pagament ${formatCurrency(
      pending
    )} del Campus U.E. Cadaqués. Gràcies.`
  );
}

export default async function AdminPendingPaymentsPage() {
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
    .select("participant_id, amount");

  if (participantsError) {
    return (
      <main className="min-h-screen bg-red-50 p-8">
        <h1 className="text-3xl font-bold text-red-700">
          Error carregant pendents de cobrament
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

  const participantsWithDebt = participants
    .map((participant) => {
      const expected = getParticipantExpected(participant.id);
      const paid = getParticipantPaid(participant.id);
      const pending = Math.max(expected - paid, 0);

      return {
        participant,
        expected,
        paid,
        pending,
        tutor: getTutor(participant.id),
        weeks: getParticipantWeeks(participant.id),
      };
    })
    .filter((item) => item.pending > 0)
    .sort((a, b) => {
      if (a.pending !== b.pending) {
        return b.pending - a.pending;
      }

      const nameA = `${a.participant.last_name} ${a.participant.first_name}`;
      const nameB = `${b.participant.last_name} ${b.participant.first_name}`;

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

  const totalPending = participantsWithDebt.reduce(
    (sum, item) => sum + item.pending,
    0
  );

  const totalFamiliesWithDebt = participantsWithDebt.length;

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
              href="/admin/search"
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-600"
            >
              Cercador
            </a>

            <a
              href="/api/admin/export"
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700"
            >
              Exportar a Excel
            </a>
          </div>

          <h1 className="mt-4 text-4xl font-bold">Pendents de cobrament</h1>

          <p className="mt-2 text-blue-100">
            Famílies amb imports pendents de pagar.
          </p>
        </div>
      </section>

      <section className="px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Famílies pendents
              </p>

              <p className="mt-2 text-4xl font-bold text-red-700">
                {totalFamiliesWithDebt}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Total pendent
              </p>

              <p className="mt-2 text-4xl font-bold text-orange-700">
                {formatCurrency(totalPending)}
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
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow">
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Llistat de pendents
              </h2>

              <p className="mt-1 text-slate-600">
                Ordenat de més import pendent a menys import pendent.
              </p>
            </div>

            {participantsWithDebt.length === 0 ? (
              <div className="p-6 text-slate-600">
                No hi ha cap família pendent de pagament.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {participantsWithDebt.map((item) => {
                  const participant = item.participant;
                  const tutor = item.tutor;
                  const phone = tutor?.phone_1 || tutor?.phone_2 || "";
                  const whatsappNumber = getWhatsappNumber(phone);
                  const participantName = `${participant.first_name} ${participant.last_name}`;
                  const whatsappMessage = createWhatsappMessage(
                    participantName,
                    item.pending
                  );

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
                              <strong>Telèfon:</strong> {phone || "-"}
                            </p>

                            <p>
                              <strong>Email:</strong> {tutor?.email || "-"}
                            </p>
                          </div>
                        </div>

                        <div className="lg:col-span-3">
                          <h3 className="mb-3 font-bold text-slate-900">
                            Setmanes inscrites
                          </h3>

                          {item.weeks.length === 0 ? (
                            <p className="text-sm text-slate-500">
                              No té setmanes assignades.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {item.weeks.map((week) => (
                                <a
                                  key={week.id}
                                  href={`/admin/weeks/${week.id}`}
                                  className="block rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100"
                                >
                                  {week.name}

                                  <span className="block text-xs font-normal text-blue-600">
                                    {formatDate(week.start_date)} -{" "}
                                    {formatDate(week.end_date)}
                                  </span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="lg:col-span-3">
                          <div className="grid gap-3">
                            <div className="rounded-xl bg-slate-50 p-4">
                              <p className="text-sm text-slate-500">
                                Total a pagar
                              </p>

                              <p className="text-2xl font-bold text-slate-900">
                                {formatCurrency(item.expected)}
                              </p>
                            </div>

                            <div className="rounded-xl bg-green-50 p-4">
                              <p className="text-sm text-green-700">Pagat</p>

                              <p className="text-2xl font-bold text-green-800">
                                {formatCurrency(item.paid)}
                              </p>
                            </div>

                            <div className="rounded-xl bg-orange-50 p-4">
                              <p className="text-sm text-orange-700">
                                Pendent
                              </p>

                              <p className="text-3xl font-black text-orange-800">
                                {formatCurrency(item.pending)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="lg:col-span-2">
                          <div className="rounded-2xl border border-slate-200 p-4">
                            <h3 className="mb-3 font-bold text-slate-900">
                              Accions
                            </h3>

                            <div className="space-y-3">
                              <a
                                href={`/admin/payments`}
                                className="block rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-emerald-700"
                              >
                                Registrar pagament
                              </a>

                              {whatsappNumber ? (
                                <a
                                  href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block rounded-xl bg-green-500 px-4 py-3 text-center text-sm font-bold text-white hover:bg-green-600"
                                >
                                  WhatsApp
                                </a>
                              ) : (
                                <div className="rounded-xl bg-slate-100 px-4 py-3 text-center text-sm font-bold text-slate-500">
                                  Sense WhatsApp
                                </div>
                              )}

                              {tutor?.email ? (
                                <a
                                  href={`mailto:${tutor.email}?subject=${encodeURIComponent(
                                    "Pagament pendent Campus U.E. Cadaqués"
                                  )}&body=${createWhatsappMessage(
                                    participantName,
                                    item.pending
                                  )}`}
                                  className="block rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-blue-700"
                                >
                                  Email
                                </a>
                              ) : (
                                <div className="rounded-xl bg-slate-100 px-4 py-3 text-center text-sm font-bold text-slate-500">
                                  Sense email
                                </div>
                              )}
                            </div>
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