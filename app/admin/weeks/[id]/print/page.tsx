import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type Week = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
};

type Registration = {
  id: string;
  participant_id: string;
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
};

type Group = {
  id: string;
  name: string;
  description: string | null;
};

type GroupParticipant = {
  participant_id: string;
  group_id: string;
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

function addDays(date: string, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);

  return result.toISOString().slice(0, 10);
}

function getWeekDates(startDate: string, endDate: string) {
  const dates: string[] = [];
  let currentDate = startDate;

  while (currentDate <= endDate) {
    const day = new Date(currentDate).getDay();

    if (day >= 1 && day <= 5) {
      dates.push(currentDate);
    }

    currentDate = addDays(currentDate, 1);
  }

  return dates;
}

function formatWeekday(date: string) {
  return new Intl.DateTimeFormat("ca-ES", {
    weekday: "short",
  }).format(new Date(date));
}

export default async function PrintWeekPage({ params }: PageProps) {
  const { id } = await params;

  const { data: weekData, error: weekError } = await supabaseAdmin
    .from("weeks")
    .select("id, name, start_date, end_date")
    .eq("id", id)
    .single();

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

  const week = weekData as unknown as Week;
  const weekDates = getWeekDates(week.start_date, week.end_date);

  const { data: registrationsData, error: registrationsError } =
    await supabaseAdmin
      .from("registrations")
      .select("id, participant_id")
      .eq("week_id", week.id);

  const { data: groupsData, error: groupsError } = await supabaseAdmin
    .from("groups")
    .select("id, name, description")
    .eq("week_id", week.id)
    .order("name", { ascending: true });

  const { data: groupParticipantsData, error: groupParticipantsError } =
    await supabaseAdmin
      .from("group_participants")
      .select("participant_id, group_id")
      .eq("week_id", week.id);

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
          href={`/admin/weeks/${week.id}`}
          className="mt-6 inline-block rounded-xl bg-blue-800 px-5 py-3 font-bold text-white"
        >
          Tornar a la setmana
        </a>
      </main>
    );
  }

  if (groupsError) {
    console.error("Error carregant grups:", groupsError);
  }

  if (groupParticipantsError) {
    console.error(
      "Error carregant assignacions de grup:",
      groupParticipantsError
    );
  }

  const registrations = (registrationsData || []) as unknown as Registration[];
  const groups = (groupsData || []) as unknown as Group[];
  const groupParticipants = (groupParticipantsData ||
    []) as unknown as GroupParticipant[];

  const participantIds = Array.from(
    new Set(registrations.map((registration) => registration.participant_id))
  );

  let participants: Participant[] = [];
  let tutors: Tutor[] = [];

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
      .select("participant_id, tutor_name, phone_1, phone_2, email")
      .in("participant_id", participantIds);

    if (participantsError) {
      console.error("Error carregant participants:", participantsError);
    }

    if (tutorsError) {
      console.error("Error carregant tutors:", tutorsError);
    }

    participants = (participantsData || []) as unknown as Participant[];
    tutors = (tutorsData || []) as unknown as Tutor[];
  }

  function getTutor(participantId: string) {
    return tutors.find((tutor) => tutor.participant_id === participantId);
  }

  function getGroupId(participantId: string) {
    return (
      groupParticipants.find(
        (assignment) => assignment.participant_id === participantId
      )?.group_id || ""
    );
  }

  function getParticipantsForGroup(groupId: string) {
    return participants
      .filter((participant) => getGroupId(participant.id) === groupId)
      .sort((a, b) => {
        const nameA = `${a.last_name} ${a.first_name}`;
        const nameB = `${b.last_name} ${b.first_name}`;

        return nameA.localeCompare(nameB);
      });
  }

  const unassignedParticipants = participants
    .filter((participant) => !getGroupId(participant.id))
    .sort((a, b) => {
      const nameA = `${a.last_name} ${a.first_name}`;
      const nameB = `${b.last_name} ${b.first_name}`;

      return nameA.localeCompare(nameB);
    });

  const printableGroups = [
    ...groups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      participants: getParticipantsForGroup(group.id),
    })),
  ];

  if (unassignedParticipants.length > 0 || groups.length === 0) {
    printableGroups.push({
      id: "sense-grup",
      name: "Sense grup",
      description: null,
      participants: unassignedParticipants,
    });
  }

  const totalParticipants = participants.length;

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <style>
        {`
          @media print {
            .no-print {
              display: none !important;
            }

            body {
              background: white !important;
            }

            .print-page {
              padding: 0 !important;
            }

            .page-break {
              page-break-before: always;
            }

            table {
              page-break-inside: auto;
            }

            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
          }
        `}
      </style>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener("DOMContentLoaded", function () {
              var button = document.getElementById("print-button");
              if (button) {
                button.addEventListener("click", function () {
                  window.print();
                });
              }
            });
          `,
        }}
      />

      <section className="no-print bg-blue-900 px-6 py-6 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
          <a
            href={`/admin/weeks/${week.id}`}
            className="rounded-xl bg-blue-800 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
          >
            ← Tornar a la setmana
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

          <button
            id="print-button"
            type="button"
            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-blue-900 hover:bg-blue-50"
          >
            Imprimir / guardar PDF
          </button>
        </div>
      </section>

      <section className="print-page px-8 py-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-8 border-b-2 border-slate-900 pb-4">
            <p className="text-sm font-bold uppercase tracking-wide">
              U.E. Cadaqués · Campus de Futbol 2026
            </p>

            <h1 className="mt-2 text-4xl font-black">{week.name}</h1>

            <p className="mt-2 text-lg">
              Del {formatDate(week.start_date)} al {formatDate(week.end_date)}
            </p>

            <p className="mt-2 text-sm">
              Total participants: <strong>{totalParticipants}</strong>
            </p>
          </header>

          <div className="mb-8 rounded-xl border border-slate-300 p-4">
            <h2 className="mb-3 text-xl font-bold">Dies de la setmana</h2>

            <div className="grid gap-2 md:grid-cols-5">
              {weekDates.map((date) => (
                <div key={date} className="rounded border border-slate-300 p-3">
                  <p className="font-bold capitalize">{formatWeekday(date)}</p>
                  <p className="text-sm">{formatDate(date)}</p>
                </div>
              ))}
            </div>
          </div>

          {printableGroups.map((group, groupIndex) => (
            <section
              key={group.id}
              className={groupIndex === 0 ? "mb-10" : "page-break mb-10"}
            >
              <div className="mb-4 flex items-end justify-between border-b border-slate-400 pb-2">
                <div>
                  <h2 className="text-3xl font-black">{group.name}</h2>

                  {group.description && (
                    <p className="mt-1 text-sm text-slate-700">
                      {group.description}
                    </p>
                  )}
                </div>

                <p className="text-sm">
                  Participants: <strong>{group.participants.length}</strong>
                </p>
              </div>

              {group.participants.length === 0 ? (
                <p className="text-slate-600">
                  No hi ha participants en aquest grup.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-400 p-2">Nen/a</th>
                        <th className="border border-slate-400 p-2">Edat</th>
                        <th className="border border-slate-400 p-2">Talla</th>
                        <th className="border border-slate-400 p-2">
                          Tutor / telèfon
                        </th>
                        <th className="border border-slate-400 p-2">
                          Observacions
                        </th>

                        {weekDates.map((date) => (
                          <th
                            key={date}
                            className="border border-slate-400 p-2 text-center"
                          >
                            <span className="block capitalize">
                              {formatWeekday(date)}
                            </span>
                            <span className="block font-normal">
                              {formatDate(date)}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {group.participants.map((participant) => {
                        const tutor = getTutor(participant.id);

                        return (
                          <tr key={participant.id} className="align-top">
                            <td className="border border-slate-400 p-2">
                              <strong>
                                {participant.first_name}{" "}
                                {participant.last_name}
                              </strong>

                              <p className="mt-1 text-slate-600">
                                {participant.city || "-"}
                              </p>
                            </td>

                            <td className="border border-slate-400 p-2">
                              {calculateAge(participant.birth_date)} anys
                            </td>

                            <td className="border border-slate-400 p-2">
                              {participant.shirt_size || "-"}
                            </td>

                            <td className="border border-slate-400 p-2">
                              <p>{tutor?.tutor_name || "-"}</p>
                              <p>{tutor?.phone_1 || "-"}</p>

                              {tutor?.phone_2 && <p>{tutor.phone_2}</p>}
                            </td>

                            <td className="border border-slate-400 p-2">
                              {participant.allergies && (
                                <p>
                                  <strong>Al·lèrgies:</strong>{" "}
                                  {participant.allergies}
                                </p>
                              )}

                              {participant.medical_notes && (
                                <p>
                                  <strong>Mèdic:</strong>{" "}
                                  {participant.medical_notes}
                                </p>
                              )}

                              {participant.comments && (
                                <p>
                                  <strong>Comentaris:</strong>{" "}
                                  {participant.comments}
                                </p>
                              )}

                              {!participant.allergies &&
                                !participant.medical_notes &&
                                !participant.comments && <span>-</span>}
                            </td>

                            {weekDates.map((date) => (
                              <td
                                key={date}
                                className="h-14 border border-slate-400 p-2 text-center"
                              >
                                □
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}