import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type Participant = {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  city: string | null;
  shirt_size: string | null;
  shirt_delivered: boolean | null;
  shirt_delivered_date: string | null;
  shirt_notes: string | null;
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
};

type Week = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
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

function cleanSize(size: string | null) {
  const cleanValue = String(size || "").trim();

  if (!cleanValue) {
    return "Sense talla";
  }

  return cleanValue;
}

function getSizeClass(size: string | null) {
  const cleanValue = cleanSize(size).toLowerCase();

  if (cleanValue.includes("sense")) {
    return "bg-slate-100 text-slate-700";
  }

  if (cleanValue.includes("4") || cleanValue.includes("5")) {
    return "bg-blue-100 text-blue-800";
  }

  if (cleanValue.includes("6") || cleanValue.includes("7")) {
    return "bg-cyan-100 text-cyan-800";
  }

  if (cleanValue.includes("8") || cleanValue.includes("9")) {
    return "bg-green-100 text-green-800";
  }

  if (cleanValue.includes("10") || cleanValue.includes("11")) {
    return "bg-amber-100 text-amber-800";
  }

  if (cleanValue.includes("12") || cleanValue.includes("13")) {
    return "bg-orange-100 text-orange-800";
  }

  if (cleanValue.includes("14") || cleanValue.includes("15")) {
    return "bg-red-100 text-red-800";
  }

  return "bg-purple-100 text-purple-800";
}

export default async function AdminShirtsPage() {
  const { data: participantsData, error: participantsError } =
    await supabaseAdmin
      .from("participants")
      .select(
        "id, first_name, last_name, birth_date, city, shirt_size, shirt_delivered, shirt_delivered_date, shirt_notes"
      )
      .order("last_name", { ascending: true });

  const { data: tutorsData, error: tutorsError } = await supabaseAdmin
    .from("tutors")
    .select("participant_id, tutor_name, phone_1, phone_2, email");

  const { data: registrationsData, error: registrationsError } =
    await supabaseAdmin
      .from("registrations")
      .select("id, participant_id, week_id");

  const { data: weeksData, error: weeksError } = await supabaseAdmin
    .from("weeks")
    .select("id, name, start_date, end_date")
    .order("start_date", { ascending: true });

  if (participantsError) {
    return (
      <main className="min-h-screen bg-red-50 p-8">
        <h1 className="text-3xl font-bold text-red-700">
          Error carregant samarretes
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

  const participants = (participantsData || []) as unknown as Participant[];
  const tutors = (tutorsData || []) as unknown as Tutor[];
  const registrations = (registrationsData || []) as unknown as Registration[];
  const weeks = (weeksData || []) as unknown as Week[];

  function getTutor(participantId: string) {
    return tutors.find((tutor) => tutor.participant_id === participantId);
  }

  function getParticipantWeeks(participantId: string) {
    return registrations
      .filter((registration) => registration.participant_id === participantId)
      .map((registration) =>
        weeks.find((week) => week.id === registration.week_id)
      )
      .filter((week): week is Week => Boolean(week))
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  }

  const sortedParticipants = [...participants].sort((a, b) => {
    const deliveredA = Boolean(a.shirt_delivered);
    const deliveredB = Boolean(b.shirt_delivered);

    if (deliveredA !== deliveredB) {
      return deliveredA ? 1 : -1;
    }

    const sizeA = cleanSize(a.shirt_size);
    const sizeB = cleanSize(b.shirt_size);

    if (sizeA !== sizeB) {
      return sizeA.localeCompare(sizeB);
    }

    const nameA = `${a.last_name} ${a.first_name}`;
    const nameB = `${b.last_name} ${b.first_name}`;

    return nameA.localeCompare(nameB);
  });

  const deliveredCount = participants.filter((participant) =>
    Boolean(participant.shirt_delivered)
  ).length;

  const pendingCount = participants.length - deliveredCount;

  const withoutSizeCount = participants.filter(
    (participant) => !String(participant.shirt_size || "").trim()
  ).length;

  const sizeTotals = participants.reduce<Record<string, number>>(
    (groups, participant) => {
      const size = cleanSize(participant.shirt_size);

      if (!groups[size]) {
        groups[size] = 0;
      }

      groups[size]++;

      return groups;
    },
    {}
  );

  const sortedSizeTotals = Object.entries(sizeTotals).sort(([sizeA], [sizeB]) =>
    sizeA.localeCompare(sizeB)
  );

  const pendingBySize = participants
    .filter((participant) => !participant.shirt_delivered)
    .reduce<Record<string, number>>((groups, participant) => {
      const size = cleanSize(participant.shirt_size);

      if (!groups[size]) {
        groups[size] = 0;
      }

      groups[size]++;

      return groups;
    }, {});

  const sortedPendingBySize = Object.entries(pendingBySize).sort(
    ([sizeA], [sizeB]) => sizeA.localeCompare(sizeB)
  );

  const today = todayDateInput();

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
              href="/admin/search"
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-600"
            >
              Cercador
            </a>

            <a
              href="/admin/weeks"
              className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-blue-900 hover:bg-blue-50"
            >
              Setmanes
            </a>

            <a
              href="/admin/alerts"
              className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600"
            >
              Observacions
            </a>
          </div>

          <h1 className="mt-4 text-4xl font-bold">Control de samarretes</h1>

          <p className="mt-2 text-blue-100">
            Control de talles, samarretes entregades i pendents d’entrega.
          </p>
        </div>
      </section>

      <section className="px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Participants
              </p>

              <p className="mt-2 text-4xl font-bold text-slate-900">
                {participants.length}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">Entregades</p>

              <p className="mt-2 text-4xl font-bold text-green-700">
                {deliveredCount}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">Pendents</p>

              <p className="mt-2 text-4xl font-bold text-orange-700">
                {pendingCount}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">Sense talla</p>

              <p className="mt-2 text-4xl font-bold text-red-700">
                {withoutSizeCount}
              </p>
            </div>
          </div>

          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="mb-4 text-2xl font-bold text-slate-900">
                Resum per talles
              </h2>

              {sortedSizeTotals.length === 0 ? (
                <p className="text-slate-600">No hi ha participants.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-3">
                  {sortedSizeTotals.map(([size, count]) => (
                    <div
                      key={size}
                      className="rounded-xl bg-slate-50 px-4 py-3"
                    >
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${getSizeClass(
                          size
                        )}`}
                      >
                        {size}
                      </span>

                      <p className="mt-2 text-3xl font-bold text-slate-900">
                        {count}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="mb-4 text-2xl font-bold text-slate-900">
                Pendents per talla
              </h2>

              {sortedPendingBySize.length === 0 ? (
                <p className="text-slate-600">
                  Totes les samarretes consten com entregades.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-3">
                  {sortedPendingBySize.map(([size, count]) => (
                    <div
                      key={size}
                      className="rounded-xl bg-orange-50 px-4 py-3"
                    >
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${getSizeClass(
                          size
                        )}`}
                      >
                        {size}
                      </span>

                      <p className="mt-2 text-3xl font-bold text-orange-800">
                        {count}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow">
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Llistat de samarretes
              </h2>

              <p className="mt-1 text-slate-600">
                Primer apareixen les pendents d’entrega.
              </p>
            </div>

            {sortedParticipants.length === 0 ? (
              <div className="p-6 text-slate-600">
                Encara no hi ha cap participant.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {sortedParticipants.map((participant) => {
                  const tutor = getTutor(participant.id);
                  const participantWeeks = getParticipantWeeks(participant.id);
                  const delivered = Boolean(participant.shirt_delivered);

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
                              {tutor?.phone_1 || tutor?.phone_2 || "-"}
                            </p>

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
                          <div className="grid gap-3">
                            <div className="rounded-xl bg-slate-50 p-4">
                              <p className="text-sm text-slate-500">Talla</p>

                              <p className="mt-2">
                                <span
                                  className={`inline-block rounded-full px-4 py-2 text-lg font-black ${getSizeClass(
                                    participant.shirt_size
                                  )}`}
                                >
                                  {cleanSize(participant.shirt_size)}
                                </span>
                              </p>
                            </div>

                            <div
                              className={`rounded-xl p-4 ${
                                delivered ? "bg-green-50" : "bg-orange-50"
                              }`}
                            >
                              <p
                                className={`text-sm ${
                                  delivered
                                    ? "text-green-700"
                                    : "text-orange-700"
                                }`}
                              >
                                Estat
                              </p>

                              <p
                                className={`text-2xl font-bold ${
                                  delivered
                                    ? "text-green-800"
                                    : "text-orange-800"
                                }`}
                              >
                                {delivered ? "Entregada" : "Pendent"}
                              </p>

                              <p className="mt-1 text-sm text-slate-500">
                                Data:{" "}
                                {formatDate(participant.shirt_delivered_date)}
                              </p>
                            </div>

                            {participant.shirt_notes && (
                              <div className="rounded-xl bg-blue-50 p-4">
                                <p className="text-sm font-bold text-blue-900">
                                  Notes
                                </p>

                                <p className="mt-1 text-sm text-blue-800">
                                  {participant.shirt_notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="lg:col-span-5">
                          <div className="rounded-2xl border border-slate-200 p-4">
                            <h3 className="mb-4 text-lg font-bold text-slate-900">
                              Actualitzar samarreta
                            </h3>

                            <form
                              action="/api/shirts/update"
                              method="POST"
                              className="grid gap-3 md:grid-cols-2"
                            >
                              <input
                                type="hidden"
                                name="participant_id"
                                value={participant.id}
                              />

                              <div className="flex items-center rounded-lg bg-slate-50 px-3 py-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                  <input
                                    type="checkbox"
                                    name="shirt_delivered"
                                    defaultChecked={delivered}
                                    className="h-5 w-5"
                                  />
                                  Samarreta entregada
                                </label>
                              </div>

                              <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                  Data d’entrega
                                </label>

                                <input
                                  type="date"
                                  name="shirt_delivered_date"
                                  defaultValue={
                                    participant.shirt_delivered_date || today
                                  }
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                                />
                              </div>

                              <div className="md:col-span-2">
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                  Notes
                                </label>

                                <textarea
                                  name="shirt_notes"
                                  rows={3}
                                  defaultValue={participant.shirt_notes || ""}
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                                  placeholder="Opcional. Exemple: pendent de canviar talla, entregada al pare..."
                                />
                              </div>

                              <div className="md:col-span-2">
                                <button
                                  type="submit"
                                  className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-bold text-white hover:bg-blue-900"
                                >
                                  Guardar estat samarreta
                                </button>
                              </div>
                            </form>
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