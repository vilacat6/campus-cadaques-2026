import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type Week = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
};

type Group = {
  id: string;
  week_id: string;
  name: string;
  description: string | null;
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
};

type GroupParticipant = {
  id: string;
  week_id: string;
  group_id: string;
  participant_id: string;
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

export default async function WeekGroupsPage({ params }: PageProps) {
  const { id } = await params;

  const { data: weekData, error: weekError } = await supabaseAdmin
    .from("weeks")
    .select("id, name, start_date, end_date")
    .eq("id", id)
    .single();

  const { data: groupsData, error: groupsError } = await supabaseAdmin
    .from("groups")
    .select("id, week_id, name, description")
    .eq("week_id", id)
    .order("name", { ascending: true });

  const { data: registrationsData, error: registrationsError } =
    await supabaseAdmin
      .from("registrations")
      .select("id, participant_id, price, payment_status")
      .eq("week_id", id);

  const { data: groupParticipantsData, error: groupParticipantsError } =
    await supabaseAdmin
      .from("group_participants")
      .select("id, week_id, group_id, participant_id")
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

  if (groupsError) {
    console.error("Error carregant grups:", groupsError);
  }

  if (registrationsError) {
    console.error("Error carregant inscripcions:", registrationsError);
  }

  if (groupParticipantsError) {
    console.error("Error carregant assignacions:", groupParticipantsError);
  }

  const week = weekData as unknown as Week;
  const groups = (groupsData || []) as unknown as Group[];
  const registrations = (registrationsData || []) as unknown as Registration[];
  const groupParticipants = (groupParticipantsData ||
    []) as unknown as GroupParticipant[];

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
      .select("participant_id, tutor_name, phone_1, phone_2, email")
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

  function getRegistration(participantId: string) {
    return registrations.find(
      (registration) => registration.participant_id === participantId
    );
  }

  function getAssignedGroupId(participantId: string) {
    return (
      groupParticipants.find(
        (assignment) => assignment.participant_id === participantId
      )?.group_id || ""
    );
  }

  function getAssignedGroup(participantId: string) {
    const groupId = getAssignedGroupId(participantId);

    return groups.find((group) => group.id === groupId);
  }

  function getTotalPaid(participantId: string) {
    return payments
      .filter((payment) => payment.participant_id === participantId)
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  }

  function getParticipantsForGroup(groupId: string) {
    const assignedParticipantIds = groupParticipants
      .filter((assignment) => assignment.group_id === groupId)
      .map((assignment) => assignment.participant_id);

    return participants
      .filter((participant) => assignedParticipantIds.includes(participant.id))
      .sort((a, b) => {
        const nameA = `${a.last_name} ${a.first_name}`;
        const nameB = `${b.last_name} ${b.first_name}`;

        return nameA.localeCompare(nameB);
      });
  }

  const unassignedParticipants = participants
    .filter((participant) => !getAssignedGroupId(participant.id))
    .sort((a, b) => {
      const nameA = `${a.last_name} ${a.first_name}`;
      const nameB = `${b.last_name} ${b.first_name}`;

      return nameA.localeCompare(nameB);
    });

  const sortedParticipants = participants.sort((a, b) => {
    const nameA = `${a.last_name} ${a.first_name}`;
    const nameB = `${b.last_name} ${b.first_name}`;

    return nameA.localeCompare(nameB);
  });

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="bg-blue-900 px-6 py-8 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap gap-3">
            <a
              href={`/admin/weeks/${week.id}`}
              className="rounded-xl bg-blue-800 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
            >
              ← Tornar als inscrits
            </a>

            <a
              href="/admin/weeks"
              className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-blue-900 hover:bg-blue-50"
            >
              Tornar a setmanes
            </a>
          </div>

          <h1 className="mt-4 text-4xl font-bold">
            Grups de {week.name}
          </h1>

          <p className="mt-2 text-blue-100">
            Del {formatDate(week.start_date)} al {formatDate(week.end_date)}
          </p>
        </div>
      </section>

      <section className="px-6 py-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="mb-4 text-2xl font-bold text-slate-900">
                Resum de grups
              </h2>

              {groups.length === 0 ? (
                <p className="text-slate-600">
                  Encara no has creat cap grup per aquesta setmana.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {groups.map((group) => {
                    const groupParticipantsList = getParticipantsForGroup(
                      group.id
                    );

                    return (
                      <div
                        key={group.id}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-bold text-slate-900">
                              {group.name}
                            </h3>

                            {group.description && (
                              <p className="mt-1 text-sm text-slate-600">
                                {group.description}
                              </p>
                            )}

                            <p className="mt-2 text-sm font-semibold text-blue-800">
                              {groupParticipantsList.length} participants
                            </p>
                          </div>

                          <form action="/api/groups/delete" method="POST">
                            <input
                              type="hidden"
                              name="group_id"
                              value={group.id}
                            />

                            <input
                              type="hidden"
                              name="week_id"
                              value={week.id}
                            />

                            <button
                              type="submit"
                              className="rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white hover:bg-red-800"
                            >
                              Esborrar
                            </button>
                          </form>
                        </div>

                        {groupParticipantsList.length === 0 ? (
                          <p className="text-sm text-slate-500">
                            Cap participant assignat.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {groupParticipantsList.map((participant) => (
                              <a
                                key={participant.id}
                                href={`/admin/participants/${participant.id}`}
                                className="block rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-blue-50 hover:text-blue-800"
                              >
                                {participant.first_name}{" "}
                                {participant.last_name}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="mb-4 text-2xl font-bold text-slate-900">
                Assignar participants als grups
              </h2>

              {groups.length === 0 ? (
                <p className="text-slate-600">
                  Primer has de crear almenys un grup.
                </p>
              ) : sortedParticipants.length === 0 ? (
                <p className="text-slate-600">
                  Encara no hi ha inscrits en aquesta setmana.
                </p>
              ) : (
                <form
                  action="/api/groups/assign"
                  method="POST"
                  className="space-y-4"
                >
                  <input type="hidden" name="week_id" value={week.id} />

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead className="bg-slate-50 text-slate-700">
                        <tr>
                          <th className="border-b p-4">Nen/a</th>
                          <th className="border-b p-4">Edat</th>
                          <th className="border-b p-4">Talla</th>
                          <th className="border-b p-4">Tutor</th>
                          <th className="border-b p-4">Observacions</th>
                          <th className="border-b p-4">Grup</th>
                        </tr>
                      </thead>

                      <tbody>
                        {sortedParticipants.map((participant) => {
                          const tutor = getTutor(participant.id);
                          const assignedGroupId = getAssignedGroupId(
                            participant.id
                          );
                          const assignedGroup = getAssignedGroup(
                            participant.id
                          );
                          const registration = getRegistration(participant.id);
                          const totalPaid = getTotalPaid(participant.id);
                          const paymentStatus = getPaymentStatus(
                            Number(registration?.price || 0),
                            totalPaid
                          );

                          return (
                            <tr key={participant.id} className="align-top">
                              <td className="border-b p-4">
                                <input
                                  type="hidden"
                                  name="participant_ids"
                                  value={participant.id}
                                />

                                <a
                                  href={`/admin/participants/${participant.id}`}
                                  className="font-semibold text-blue-800 hover:underline"
                                >
                                  {participant.first_name}{" "}
                                  {participant.last_name}
                                </a>

                                <p className="mt-1 text-xs text-slate-500">
                                  {participant.city || "-"}
                                </p>

                                <p
                                  className={`mt-2 inline-block rounded px-2 py-1 text-xs font-bold ${
                                    paymentStatus === "pagat"
                                      ? "bg-green-100 text-green-800"
                                      : paymentStatus === "parcial"
                                        ? "bg-orange-100 text-orange-800"
                                        : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {paymentStatus}
                                </p>
                              </td>

                              <td className="border-b p-4">
                                {calculateAge(participant.birth_date)} anys
                              </td>

                              <td className="border-b p-4">
                                {participant.shirt_size || "-"}
                              </td>

                              <td className="border-b p-4">
                                <p>{tutor?.tutor_name || "-"}</p>

                                <p className="text-slate-500">
                                  {tutor?.phone_1 || "-"}
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

                                {!participant.allergies &&
                                  !participant.medical_notes && (
                                    <span className="text-slate-500">-</span>
                                  )}
                              </td>

                              <td className="border-b p-4">
                                <select
                                  name={`group_id_${participant.id}`}
                                  defaultValue={assignedGroupId}
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                                >
                                  <option value="">Sense grup</option>

                                  {groups.map((group) => (
                                    <option key={group.id} value={group.id}>
                                      {group.name}
                                    </option>
                                  ))}
                                </select>

                                {assignedGroup && (
                                  <p className="mt-1 text-xs text-slate-500">
                                    Actual: {assignedGroup.name}
                                  </p>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <button
                    type="submit"
                    className="rounded-xl bg-blue-800 px-5 py-3 font-bold text-white hover:bg-blue-900"
                  >
                    Guardar assignacions
                  </button>
                </form>
              )}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="mb-4 text-2xl font-bold text-slate-900">
                Crear grup
              </h2>

              <form
                action="/api/groups/create"
                method="POST"
                className="space-y-4"
              >
                <input type="hidden" name="week_id" value={week.id} />

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Nom del grup
                  </label>

                  <input
                    name="name"
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    placeholder="Ex: Grup A"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Descripció
                  </label>

                  <textarea
                    name="description"
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    placeholder="Ex: Petits, mitjans, grans..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-800 px-5 py-3 font-bold text-white hover:bg-blue-900"
                >
                  Crear grup
                </button>
              </form>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="mb-4 text-2xl font-bold text-slate-900">
                Participants sense grup
              </h2>

              {unassignedParticipants.length === 0 ? (
                <p className="text-slate-600">
                  Tots els participants tenen grup assignat.
                </p>
              ) : (
                <div className="space-y-2">
                  {unassignedParticipants.map((participant) => (
                    <a
                      key={participant.id}
                      href={`/admin/participants/${participant.id}`}
                      className="block rounded-lg bg-orange-50 px-3 py-2 text-sm font-medium text-orange-800 hover:bg-orange-100"
                    >
                      {participant.first_name} {participant.last_name}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="mb-4 text-2xl font-bold text-slate-900">
                Resum
              </h2>

              <div className="space-y-3 text-sm">
                <p>
                  Participants inscrits:{" "}
                  <strong>{participants.length}</strong>
                </p>

                <p>
                  Grups creats: <strong>{groups.length}</strong>
                </p>

                <p>
                  Sense grup:{" "}
                  <strong>{unassignedParticipants.length}</strong>
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}