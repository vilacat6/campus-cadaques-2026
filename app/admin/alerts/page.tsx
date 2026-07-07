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
};

type Week = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
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

function hasText(value: string | null) {
  return Boolean(String(value || "").trim());
}

export default async function AdminAlertsPage() {
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
      .select("id, participant_id, week_id");

  const { data: weeksData, error: weeksError } = await supabaseAdmin
    .from("weeks")
    .select("id, name, start_date, end_date")
    .order("start_date", { ascending: true });

  if (participantsError) {
    return (
      <main className="min-h-screen bg-red-50 p-8">
        <h1 className="text-3xl font-bold text-red-700">
          Error carregant observacions
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

  const participantsWithAlerts = participants
    .filter(
      (participant) =>
        hasText(participant.allergies) ||
        hasText(participant.medical_notes) ||
        hasText(participant.comments)
    )
    .sort((a, b) => {
      const nameA = `${a.last_name} ${a.first_name}`;
      const nameB = `${b.last_name} ${b.first_name}`;

      return nameA.localeCompare(nameB);
    });

  const allergyCount = participants.filter((participant) =>
    hasText(participant.allergies)
  ).length;

  const medicalCount = participants.filter((participant) =>
    hasText(participant.medical_notes)
  ).length;

  const commentsCount = participants.filter((participant) =>
    hasText(participant.comments)
  ).length;

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
          </div>

          <h1 className="mt-4 text-4xl font-bold">
            Observacions importants
          </h1>

          <p className="mt-2 text-blue-100">
            Al·lèrgies, informació mèdica i comentaris que han de saber els
            monitors.
          </p>
        </div>
      </section>

      <section className="px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Participants amb avisos
              </p>

              <p className="mt-2 text-4xl font-bold text-slate-900">
                {participantsWithAlerts.length}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Amb al·lèrgies
              </p>

              <p className="mt-2 text-4xl font-bold text-amber-700">
                {allergyCount}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Amb informació mèdica
              </p>

              <p className="mt-2 text-4xl font-bold text-red-700">
                {medicalCount}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Amb comentaris
              </p>

              <p className="mt-2 text-4xl font-bold text-blue-700">
                {commentsCount}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow">
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Llistat d’avisos
              </h2>

              <p className="mt-1 text-slate-600">
                Només apareixen els participants que tenen alguna observació.
              </p>
            </div>

            {participantsWithAlerts.length === 0 ? (
              <div className="p-6 text-slate-600">
                No hi ha cap participant amb observacions importants.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {participantsWithAlerts.map((participant) => {
                  const tutor = getTutor(participant.id);
                  const participantWeeks = getParticipantWeeks(participant.id);

                  return (
                    <div key={participant.id} className="p-6">
                      <div className="grid gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-3">
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
                        </div>

                        <div className="lg:col-span-6">
                          <div className="space-y-3">
                            {participant.allergies && (
                              <div className="rounded-2xl bg-amber-50 p-4 text-amber-900">
                                <p className="text-sm font-bold uppercase tracking-wide">
                                  Al·lèrgies
                                </p>

                                <p className="mt-1 text-lg font-semibold">
                                  {participant.allergies}
                                </p>
                              </div>
                            )}

                            {participant.medical_notes && (
                              <div className="rounded-2xl bg-red-50 p-4 text-red-900">
                                <p className="text-sm font-bold uppercase tracking-wide">
                                  Informació mèdica
                                </p>

                                <p className="mt-1 text-lg font-semibold">
                                  {participant.medical_notes}
                                </p>
                              </div>
                            )}

                            {participant.comments && (
                              <div className="rounded-2xl bg-blue-50 p-4 text-blue-900">
                                <p className="text-sm font-bold uppercase tracking-wide">
                                  Comentaris
                                </p>

                                <p className="mt-1 text-lg font-semibold">
                                  {participant.comments}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="lg:col-span-3">
                          <h3 className="mb-3 font-bold text-slate-900">
                            Setmanes inscrites
                          </h3>

                          {participantWeeks.length === 0 ? (
                            <p className="text-sm text-slate-500">
                              No té setmanes assignades.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {participantWeeks.map((week) => (
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