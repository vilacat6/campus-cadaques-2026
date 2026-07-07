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
};

type Week = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
};

type Incident = {
  id: string;
  participant_id: string | null;
  incident_date: string | null;
  incident_type: string | null;
  description: string | null;
  family_notified: boolean | null;
  internal_notes: string | null;
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

function getIncidentTypeClass(type: string | null) {
  const cleanType = String(type || "").toLowerCase();

  if (cleanType.includes("caiguda") || cleanType.includes("cop")) {
    return "bg-red-100 text-red-800";
  }

  if (cleanType.includes("malestar")) {
    return "bg-orange-100 text-orange-800";
  }

  if (cleanType.includes("conducta")) {
    return "bg-purple-100 text-purple-800";
  }

  if (cleanType.includes("avis") || cleanType.includes("pares")) {
    return "bg-blue-100 text-blue-800";
  }

  if (cleanType.includes("material")) {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-slate-100 text-slate-800";
}

export default async function AdminIncidentsPage() {
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
      .select("id, participant_id, week_id");

  const { data: weeksData, error: weeksError } = await supabaseAdmin
    .from("weeks")
    .select("id, name, start_date, end_date")
    .order("start_date", { ascending: true });

  const { data: incidentsData, error: incidentsError } = await supabaseAdmin
    .from("incidents")
    .select(
      "id, participant_id, incident_date, incident_type, description, family_notified, internal_notes, created_at"
    )
    .order("incident_date", { ascending: false })
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

  if (incidentsError) {
    return (
      <main className="min-h-screen bg-red-50 p-8">
        <h1 className="text-3xl font-bold text-red-700">
          Error carregant incidències
        </h1>

        <pre className="mt-6 whitespace-pre-wrap rounded bg-white p-4 text-sm text-red-900">
          {JSON.stringify(incidentsError, null, 2)}
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

  const participants = (participantsData || []) as unknown as Participant[];
  const tutors = (tutorsData || []) as unknown as Tutor[];
  const registrations = (registrationsData || []) as unknown as Registration[];
  const weeks = (weeksData || []) as unknown as Week[];
  const incidents = (incidentsData || []) as unknown as Incident[];

  function getParticipant(participantId: string | null) {
    if (!participantId) {
      return undefined;
    }

    return participants.find((participant) => participant.id === participantId);
  }

  function getParticipantName(participantId: string | null) {
    const participant = getParticipant(participantId);

    if (!participant) {
      return "Participant no trobat";
    }

    return `${participant.first_name} ${participant.last_name}`;
  }

  function getTutor(participantId: string | null) {
    if (!participantId) {
      return undefined;
    }

    return tutors.find((tutor) => tutor.participant_id === participantId);
  }

  function getParticipantWeeks(participantId: string | null) {
    if (!participantId) {
      return [];
    }

    return registrations
      .filter((registration) => registration.participant_id === participantId)
      .map((registration) =>
        weeks.find((week) => week.id === registration.week_id)
      )
      .filter((week): week is Week => Boolean(week))
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  }

  const today = todayDateInput();

  const todayIncidents = incidents.filter(
    (incident) => incident.incident_date === today
  ).length;

  const notifiedIncidents = incidents.filter(
    (incident) => incident.family_notified
  ).length;

  const notNotifiedIncidents = incidents.filter(
    (incident) => !incident.family_notified
  ).length;

  const participantsWithIncidents = new Set(
    incidents
      .map((incident) => incident.participant_id)
      .filter((participantId): participantId is string => Boolean(participantId))
  ).size;

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
              href="/admin/alerts"
              className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600"
            >
              Observacions
            </a>

            <a
              href="/admin/weeks"
              className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-blue-900 hover:bg-blue-50"
            >
              Setmanes
            </a>
          </div>

          <h1 className="mt-4 text-4xl font-bold">Incidències</h1>

          <p className="mt-2 text-blue-100">
            Registre de caigudes, cops, malestars, avisos a famílies i altres
            incidències del campus.
          </p>
        </div>
      </section>

      <section className="px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Incidències totals
              </p>

              <p className="mt-2 text-4xl font-bold text-slate-900">
                {incidents.length}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Incidències avui
              </p>

              <p className="mt-2 text-4xl font-bold text-orange-700">
                {todayIncidents}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Famílies avisades
              </p>

              <p className="mt-2 text-4xl font-bold text-green-700">
                {notifiedIncidents}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Sense avisar: {notNotifiedIncidents}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Participants afectats
              </p>

              <p className="mt-2 text-4xl font-bold text-blue-700">
                {participantsWithIncidents}
              </p>
            </div>
          </div>

          <div className="mb-8 rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-4 text-2xl font-bold text-slate-900">
              Afegir incidència
            </h2>

            <form
              action="/api/incidents/add"
              method="POST"
              className="grid gap-4 md:grid-cols-2"
            >
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Participant
                </label>

                <select
                  name="participant_id"
                  required
                  defaultValue=""
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option value="">Selecciona participant</option>

                  {participants.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {participant.last_name}, {participant.first_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Data
                </label>

                <input
                  type="date"
                  name="incident_date"
                  defaultValue={today}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Tipus d’incidència
                </label>

                <select
                  name="incident_type"
                  defaultValue="Altres"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option value="Caiguda o cop">Caiguda o cop</option>
                  <option value="Malestar">Malestar</option>
                  <option value="Problema de conducta">
                    Problema de conducta
                  </option>
                  <option value="Avís als pares">Avís als pares</option>
                  <option value="Material perdut">Material perdut</option>
                  <option value="Altres">Altres</option>
                </select>
              </div>

              <div className="flex items-center rounded-xl bg-slate-50 px-4 py-3">
                <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    name="family_notified"
                    className="h-5 w-5"
                  />
                  Família avisada
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Descripció
                </label>

                <textarea
                  name="description"
                  required
                  rows={4}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  placeholder="Explica què ha passat..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Notes internes
                </label>

                <textarea
                  name="internal_notes"
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  placeholder="Opcional. Notes només per a l’organització..."
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="rounded-xl bg-blue-800 px-6 py-3 font-bold text-white hover:bg-blue-900"
                >
                  Guardar incidència
                </button>
              </div>
            </form>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow">
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Llistat d’incidències
              </h2>

              <p className="mt-1 text-slate-600">
                Ordenat de més recent a més antiga.
              </p>
            </div>

            {incidents.length === 0 ? (
              <div className="p-6 text-slate-600">
                Encara no hi ha cap incidència registrada.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {incidents.map((incident) => {
                  const participant = getParticipant(incident.participant_id);
                  const tutor = getTutor(incident.participant_id);
                  const participantWeeks = getParticipantWeeks(
                    incident.participant_id
                  );

                  return (
                    <div key={incident.id} className="p-6">
                      <div className="grid gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-3">
                          <a
                            href={
                              participant
                                ? `/admin/participants/${participant.id}`
                                : "/admin/incidents"
                            }
                            className="text-xl font-bold text-blue-800 hover:underline"
                          >
                            {getParticipantName(incident.participant_id)}
                          </a>

                          {participant && (
                            <p className="mt-1 text-sm text-slate-500">
                              {participant.city || "-"} ·{" "}
                              {calculateAge(participant.birth_date)} anys ·
                              Talla {participant.shirt_size || "-"}
                            </p>
                          )}

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

                          <div className="mt-3">
                            <p className="mb-2 text-sm font-bold text-slate-900">
                              Setmanes inscrites
                            </p>

                            {participantWeeks.length === 0 ? (
                              <p className="text-sm text-slate-500">-</p>
                            ) : (
                              <div className="space-y-2">
                                {participantWeeks.map((week) => (
                                  <a
                                    key={week.id}
                                    href={`/admin/weeks/${week.id}`}
                                    className="block rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100"
                                  >
                                    {week.name}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="lg:col-span-4">
                          <div className="rounded-2xl border border-slate-200 p-4">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${getIncidentTypeClass(
                                  incident.incident_type
                                )}`}
                              >
                                {incident.incident_type || "Altres"}
                              </span>

                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                {formatDate(incident.incident_date)}
                              </span>

                              {incident.family_notified ? (
                                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
                                  Família avisada
                                </span>
                              ) : (
                                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800">
                                  Família no avisada
                                </span>
                              )}
                            </div>

                            <h3 className="mb-2 font-bold text-slate-900">
                              Descripció
                            </h3>

                            <p className="whitespace-pre-wrap text-slate-700">
                              {incident.description || "-"}
                            </p>

                            {incident.internal_notes && (
                              <div className="mt-4 rounded-xl bg-slate-50 p-3">
                                <h4 className="mb-1 text-sm font-bold text-slate-900">
                                  Notes internes
                                </h4>

                                <p className="whitespace-pre-wrap text-sm text-slate-700">
                                  {incident.internal_notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="lg:col-span-5">
                          <div className="rounded-2xl border border-slate-200 p-4">
                            <h3 className="mb-4 text-lg font-bold text-slate-900">
                              Editar incidència
                            </h3>

                            <form
                              action="/api/incidents/update"
                              method="POST"
                              className="grid gap-3 md:grid-cols-2"
                            >
                              <input
                                type="hidden"
                                name="incident_id"
                                value={incident.id}
                              />

                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-700">
                                  Participant
                                </label>

                                <select
                                  name="participant_id"
                                  required
                                  defaultValue={incident.participant_id || ""}
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                                >
                                  <option value="">
                                    Selecciona participant
                                  </option>

                                  {participants.map((participantOption) => (
                                    <option
                                      key={participantOption.id}
                                      value={participantOption.id}
                                    >
                                      {participantOption.last_name},{" "}
                                      {participantOption.first_name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-700">
                                  Data
                                </label>

                                <input
                                  type="date"
                                  name="incident_date"
                                  defaultValue={
                                    incident.incident_date || today
                                  }
                                  required
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-700">
                                  Tipus
                                </label>

                                <select
                                  name="incident_type"
                                  defaultValue={
                                    incident.incident_type || "Altres"
                                  }
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                                >
                                  <option value="Caiguda o cop">
                                    Caiguda o cop
                                  </option>
                                  <option value="Malestar">Malestar</option>
                                  <option value="Problema de conducta">
                                    Problema de conducta
                                  </option>
                                  <option value="Avís als pares">
                                    Avís als pares
                                  </option>
                                  <option value="Material perdut">
                                    Material perdut
                                  </option>
                                  <option value="Altres">Altres</option>
                                </select>
                              </div>

                              <div className="flex items-center rounded-lg bg-slate-50 px-3 py-2">
                                <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                                  <input
                                    type="checkbox"
                                    name="family_notified"
                                    defaultChecked={Boolean(
                                      incident.family_notified
                                    )}
                                    className="h-4 w-4"
                                  />
                                  Família avisada
                                </label>
                              </div>

                              <div className="md:col-span-2">
                                <label className="mb-1 block text-xs font-medium text-slate-700">
                                  Descripció
                                </label>

                                <textarea
                                  name="description"
                                  required
                                  rows={4}
                                  defaultValue={incident.description || ""}
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                                />
                              </div>

                              <div className="md:col-span-2">
                                <label className="mb-1 block text-xs font-medium text-slate-700">
                                  Notes internes
                                </label>

                                <textarea
                                  name="internal_notes"
                                  rows={3}
                                  defaultValue={incident.internal_notes || ""}
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                                />
                              </div>

                              <div className="md:col-span-2">
                                <button
                                  type="submit"
                                  className="rounded-lg bg-blue-800 px-4 py-2 text-xs font-bold text-white hover:bg-blue-900"
                                >
                                  Guardar canvis
                                </button>
                              </div>
                            </form>

                            <form
                              action="/api/incidents/delete"
                              method="POST"
                              className="mt-3"
                            >
                              <input
                                type="hidden"
                                name="incident_id"
                                value={incident.id}
                              />

                              <button
                                type="submit"
                                className="rounded-lg bg-red-100 px-4 py-2 text-xs font-bold text-red-800 hover:bg-red-200"
                              >
                                Esborrar incidència
                              </button>
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