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
};

type Attendance = {
  id: string;
  participant_id: string;
  attendance_date: string;
  status: string;
  notes: string | null;
};

type Group = {
  id: string;
  name: string;
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

function formatWeekday(date: string) {
  return new Intl.DateTimeFormat("ca-ES", {
    weekday: "short",
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

function getStatusLabel(status: string | null | undefined) {
  if (status === "present") {
    return "Present";
  }

  if (status === "absent") {
    return "Absent";
  }

  if (status === "justificat") {
    return "Justificat";
  }

  return "No marcat";
}

function getStatusClass(status: string | null | undefined) {
  if (status === "present") {
    return "bg-green-100 text-green-800";
  }

  if (status === "absent") {
    return "bg-red-100 text-red-800";
  }

  if (status === "justificat") {
    return "bg-orange-100 text-orange-800";
  }

  return "bg-slate-100 text-slate-600";
}

export default async function AttendanceSummaryPage({ params }: PageProps) {
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

  const { data: attendanceData, error: attendanceError } = await supabaseAdmin
    .from("attendance")
    .select("id, participant_id, attendance_date, status, notes")
    .eq("week_id", week.id)
    .gte("attendance_date", week.start_date)
    .lte("attendance_date", week.end_date);

  const { data: groupsData, error: groupsError } = await supabaseAdmin
    .from("groups")
    .select("id, name")
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

  if (attendanceError) {
    console.error("Error carregant assistència:", attendanceError);
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
  const attendanceList = (attendanceData || []) as unknown as Attendance[];
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
      .select("participant_id, tutor_name, phone_1")
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

  function getAttendance(participantId: string, date: string) {
    return attendanceList.find(
      (attendance) =>
        attendance.participant_id === participantId &&
        attendance.attendance_date === date
    );
  }

  function getGroupName(participantId: string) {
    const assignment = groupParticipants.find(
      (item) => item.participant_id === participantId
    );

    if (!assignment) {
      return "Sense grup";
    }

    const group = groups.find((item) => item.id === assignment.group_id);

    return group?.name || "Sense grup";
  }

  const sortedParticipants = participants.sort((a, b) => {
    const groupA = getGroupName(a.id);
    const groupB = getGroupName(b.id);

    if (groupA !== groupB) {
      return groupA.localeCompare(groupB);
    }

    const nameA = `${a.last_name} ${a.first_name}`;
    const nameB = `${b.last_name} ${b.first_name}`;

    return nameA.localeCompare(nameB);
  });

  const totalMarked = attendanceList.length;

  const totalPresent = attendanceList.filter(
    (attendance) => attendance.status === "present"
  ).length;

  const totalAbsent = attendanceList.filter(
    (attendance) => attendance.status === "absent"
  ).length;

  const totalJustified = attendanceList.filter(
    (attendance) => attendance.status === "justificat"
  ).length;

  const totalPossible = sortedParticipants.length * weekDates.length;
  const totalNotMarked = Math.max(totalPossible - totalMarked, 0);

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="bg-blue-900 px-6 py-8 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap gap-3">
            <a
              href={`/admin/weeks/${week.id}`}
              className="rounded-xl bg-blue-800 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
            >
              ← Tornar a la setmana
            </a>

            <a
              href={`/admin/weeks/${week.id}/attendance`}
              className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-blue-900 hover:bg-blue-50"
            >
              Control assistència
            </a>

            <a
              href={`/admin/weeks/${week.id}/groups`}
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700"
            >
              Gestionar grups
            </a>

            <a
              href="/admin"
              className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
            >
              Tornar al panell
            </a>
          </div>

          <h1 className="mt-4 text-4xl font-bold">
            Resum assistència · {week.name}
          </h1>

          <p className="mt-2 text-blue-100">
            Del {formatDate(week.start_date)} al {formatDate(week.end_date)}
          </p>
        </div>
      </section>

      <section className="px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 grid gap-4 md:grid-cols-5">
            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Participants
              </p>

              <p className="mt-2 text-4xl font-bold text-slate-900">
                {sortedParticipants.length}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">Presents</p>

              <p className="mt-2 text-4xl font-bold text-green-700">
                {totalPresent}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">Absents</p>

              <p className="mt-2 text-4xl font-bold text-red-700">
                {totalAbsent}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Justificats
              </p>

              <p className="mt-2 text-4xl font-bold text-orange-700">
                {totalJustified}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                No marcats
              </p>

              <p className="mt-2 text-4xl font-bold text-slate-700">
                {totalNotMarked}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow">
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Resum setmanal
              </h2>

              <p className="mt-1 text-slate-600">
                Vista global de l’assistència de dilluns a divendres.
              </p>
            </div>

            {sortedParticipants.length === 0 ? (
              <div className="p-6 text-slate-600">
                Encara no hi ha inscrits en aquesta setmana.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="border-b p-4">Nen/a</th>
                      <th className="border-b p-4">Grup</th>
                      <th className="border-b p-4">Edat</th>
                      <th className="border-b p-4">Tutor</th>

                      {weekDates.map((date) => (
                        <th key={date} className="border-b p-4">
                          <span className="block capitalize">
                            {formatWeekday(date)}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {formatDate(date)}
                          </span>
                        </th>
                      ))}

                      <th className="border-b p-4">Totals</th>
                    </tr>
                  </thead>

                  <tbody>
                    {sortedParticipants.map((participant) => {
                      const tutor = getTutor(participant.id);

                      const participantAttendance = weekDates.map((date) =>
                        getAttendance(participant.id, date)
                      );

                      const presentCount = participantAttendance.filter(
                        (attendance) => attendance?.status === "present"
                      ).length;

                      const absentCount = participantAttendance.filter(
                        (attendance) => attendance?.status === "absent"
                      ).length;

                      const justifiedCount = participantAttendance.filter(
                        (attendance) => attendance?.status === "justificat"
                      ).length;

                      const notMarkedCount = participantAttendance.filter(
                        (attendance) => !attendance
                      ).length;

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

                            {(participant.allergies ||
                              participant.medical_notes) && (
                              <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
                                Té observacions
                              </p>
                            )}
                          </td>

                          <td className="border-b p-4">
                            <span className="rounded bg-blue-50 px-2 py-1 text-xs font-bold text-blue-800">
                              {getGroupName(participant.id)}
                            </span>
                          </td>

                          <td className="border-b p-4">
                            {calculateAge(participant.birth_date)} anys
                          </td>

                          <td className="border-b p-4">
                            <p>{tutor?.tutor_name || "-"}</p>
                            <p className="text-slate-500">
                              {tutor?.phone_1 || "-"}
                            </p>
                          </td>

                          {weekDates.map((date) => {
                            const attendance = getAttendance(
                              participant.id,
                              date
                            );

                            return (
                              <td key={date} className="border-b p-4">
                                <span
                                  className={`inline-block rounded px-2 py-1 text-xs font-bold ${getStatusClass(
                                    attendance?.status
                                  )}`}
                                >
                                  {getStatusLabel(attendance?.status)}
                                </span>

                                {attendance?.notes && (
                                  <p className="mt-1 text-xs text-slate-500">
                                    {attendance.notes}
                                  </p>
                                )}
                              </td>
                            );
                          })}

                          <td className="border-b p-4">
                            <div className="space-y-1 text-xs">
                              <p className="rounded bg-green-50 px-2 py-1 text-green-800">
                                Present: {presentCount}
                              </p>

                              <p className="rounded bg-red-50 px-2 py-1 text-red-800">
                                Absent: {absentCount}
                              </p>

                              <p className="rounded bg-orange-50 px-2 py-1 text-orange-800">
                                Justificat: {justifiedCount}
                              </p>

                              <p className="rounded bg-slate-50 px-2 py-1 text-slate-700">
                                No marcat: {notMarkedCount}
                              </p>
                            </div>
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