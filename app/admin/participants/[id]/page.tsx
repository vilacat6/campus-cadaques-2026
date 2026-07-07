import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type Tutor = {
  tutor_name: string;
  phone_1: string;
  phone_2: string | null;
  email: string;
  dni: string | null;
};

type Week = {
  name: string;
  start_date: string;
  end_date: string;
};

type AvailableWeek = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  price: number | null;
  active: boolean | null;
};

type Registration = {
  id: string;
  week_id: string | null;
  price: number | null;
  payment_status: string | null;
  notes: string | null;
  weeks: Week[] | null;
};

type Payment = {
  id: string;
  amount: number;
  payment_method: string | null;
  payment_date: string | null;
  notes: string | null;
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
  image_consent: boolean | null;
  medical_authorization: boolean | null;
  data_consent: boolean | null;
  created_at: string;
  tutors: Tutor[];
  registrations: Registration[];
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

export default async function ParticipantDetailPage({ params }: PageProps) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("participants")
    .select(
      `
      id,
      first_name,
      last_name,
      birth_date,
      city,
      shirt_size,
      medical_notes,
      allergies,
      comments,
      image_consent,
      medical_authorization,
      data_consent,
      created_at,
      tutors (
        tutor_name,
        phone_1,
        phone_2,
        email,
        dni
      ),
      registrations (
        id,
        week_id,
        price,
        payment_status,
        notes,
        weeks (
          name,
          start_date,
          end_date
        )
      )
    `
    )
    .eq("id", id)
    .single();

  const { data: paymentsData, error: paymentsError } = await supabaseAdmin
    .from("payments")
    .select("id, amount, payment_method, payment_date, notes")
    .eq("participant_id", id)
    .order("payment_date", { ascending: false });

  const { data: allWeeksData, error: allWeeksError } = await supabaseAdmin
    .from("weeks")
    .select("id, name, start_date, end_date, price, active")
    .order("start_date", { ascending: true });

  if (error || !data) {
    return (
      <main className="min-h-screen bg-red-50 p-8">
        <h1 className="text-3xl font-bold text-red-700">
          No s’ha pogut carregar l’inscrit
        </h1>

        <pre className="mt-6 whitespace-pre-wrap rounded bg-white p-4 text-sm text-red-900">
          {JSON.stringify(error, null, 2)}
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

  if (paymentsError) {
    console.error("Error carregant pagaments:", paymentsError);
  }

  if (allWeeksError) {
    console.error("Error carregant setmanes:", allWeeksError);
  }

  const participant = data as unknown as Participant;
  const payments = (paymentsData || []) as unknown as Payment[];
  const allWeeks = (allWeeksData || []) as unknown as AvailableWeek[];
  const tutor = participant.tutors?.[0];

  const selectedWeekIds = new Set(
    participant.registrations
      .map((registration) => registration.week_id)
      .filter((weekId): weekId is string => Boolean(weekId))
  );

  const totalAmount =
    participant.registrations?.reduce(
      (sum, registration) => sum + Number(registration.price || 0),
      0
    ) || 0;

  const totalPaid = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );

  const pendingAmount = Math.max(totalAmount - totalPaid, 0);

  let paymentStatus = "pendent";

  if (totalPaid >= totalAmount && totalAmount > 0) {
    paymentStatus = "pagat";
  } else if (totalPaid > 0) {
    paymentStatus = "parcial";
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="bg-blue-900 px-6 py-8 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap gap-3">
            <a
              href="/admin"
              className="rounded-xl bg-blue-800 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
            >
              ← Tornar al panell
            </a>

            <a
              href={`/admin/participants/${participant.id}/edit`}
              className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-blue-900 hover:bg-blue-50"
            >
              Editar dades
            </a>
          </div>

          <h1 className="mt-4 text-4xl font-bold">
            {participant.first_name} {participant.last_name}
          </h1>

          <p className="mt-2 text-blue-100">
            Fitxa individual de l’inscrit al campus.
          </p>
        </div>
      </section>

      <section className="px-6 py-8">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="mb-4 text-2xl font-bold text-slate-900">
                Dades del nen/a
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-slate-500">Nom</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {participant.first_name} {participant.last_name}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Data de naixement
                  </p>
                  <p className="text-lg text-slate-900">
                    {formatDate(participant.birth_date)} ·{" "}
                    {calculateAge(participant.birth_date)} anys
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Localitat
                  </p>
                  <p className="text-lg text-slate-900">
                    {participant.city || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Talla samarreta
                  </p>
                  <p className="text-lg text-slate-900">
                    {participant.shirt_size || "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="mb-4 text-2xl font-bold text-slate-900">
                Dades del tutor
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Nom tutor
                  </p>
                  <p className="text-lg font-semibold text-slate-900">
                    {tutor?.tutor_name || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500">DNI</p>
                  <p className="text-lg text-slate-900">{tutor?.dni || "-"}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Telèfon principal
                  </p>
                  <p className="text-lg text-slate-900">
                    {tutor?.phone_1 || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Telèfon secundari
                  </p>
                  <p className="text-lg text-slate-900">
                    {tutor?.phone_2 || "-"}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-slate-500">Email</p>
                  <p className="text-lg text-slate-900">
                    {tutor?.email || "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="mb-4 text-2xl font-bold text-slate-900">
                Observacions mèdiques
              </h2>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Al·lèrgies
                  </p>
                  <p className="rounded-xl bg-amber-50 p-3 text-slate-900">
                    {participant.allergies || "No indicades"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Observacions mèdiques
                  </p>
                  <p className="rounded-xl bg-amber-50 p-3 text-slate-900">
                    {participant.medical_notes || "No indicades"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Comentaris
                  </p>
                  <p className="rounded-xl bg-slate-50 p-3 text-slate-900">
                    {participant.comments || "Sense comentaris"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="mb-4 text-2xl font-bold text-slate-900">
                Pagaments registrats
              </h2>

              {payments.length === 0 ? (
                <p className="text-slate-600">
                  Encara no hi ha cap pagament registrat.
                </p>
              ) : (
                <div className="space-y-4">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <form
                        action="/api/payments/update"
                        method="POST"
                        className="space-y-3"
                      >
                        <input
                          type="hidden"
                          name="payment_id"
                          value={payment.id}
                        />

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
                            defaultValue={Number(payment.amount || 0).toFixed(2)}
                            required
                            className="w-full rounded-lg border border-slate-300 px-3 py-2"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-medium text-slate-700">
                            Mètode de pagament
                          </label>
                          <select
                            name="payment_method"
                            defaultValue={payment.payment_method || ""}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2"
                          >
                            <option value="">Selecciona mètode</option>
                            <option value="efectiu">Efectiu</option>
                            <option value="transferencia">Transferència</option>
                            <option value="bizum">Bizum</option>
                            <option value="targeta">Targeta</option>
                            <option value="altres">Altres</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-medium text-slate-700">
                            Data
                          </label>
                          <input
                            type="date"
                            name="payment_date"
                            defaultValue={payment.payment_date || ""}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-medium text-slate-700">
                            Observacions
                          </label>
                          <textarea
                            name="notes"
                            rows={2}
                            defaultValue={payment.notes || ""}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2"
                          />
                        </div>

                        <button
                          type="submit"
                          className="rounded-xl bg-blue-800 px-4 py-2 text-sm font-bold text-white hover:bg-blue-900"
                        >
                          Guardar canvis
                        </button>
                      </form>

                      <form
                        action="/api/payments/delete"
                        method="POST"
                        className="mt-3"
                      >
                        <input
                          type="hidden"
                          name="payment_id"
                          value={payment.id}
                        />

                        <input
                          type="hidden"
                          name="participant_id"
                          value={participant.id}
                        />

                        <button
                          type="submit"
                          className="rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800"
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

          <aside className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="mb-4 text-2xl font-bold text-slate-900">
                Setmanes inscrites
              </h2>

              {participant.registrations.length === 0 ? (
                <p className="text-slate-600">
                  Aquest participant encara no té cap setmana inscrita.
                </p>
              ) : (
                <div className="space-y-3">
                  {participant.registrations.map((registration) => {
                    const week = allWeeks.find(
                      (availableWeek) =>
                        availableWeek.id === registration.week_id
                    );

                    return (
                      <div
                        key={registration.id}
                        className="rounded-xl border border-blue-100 bg-blue-50 p-3"
                      >
                        <p className="font-bold text-blue-900">
                          {week?.name || "Setmana no trobada"}
                        </p>

                        {week && (
                          <p className="mt-1 text-sm text-blue-800">
                            Del {formatDate(week.start_date)} al{" "}
                            {formatDate(week.end_date)}
                          </p>
                        )}

                        <p className="mt-2 text-sm text-slate-700">
                          Import: {Number(registration.price || 0).toFixed(2)} €
                        </p>

                        <p className="text-sm text-slate-700">
                          Estat: {registration.payment_status || "pendent"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="mb-4 text-2xl font-bold text-slate-900">
                Modificar setmanes
              </h2>

              <p className="mb-4 text-sm text-slate-600">
                Marca o desmarca les setmanes del participant. Les setmanes
                noves agafaran el preu actual configurat.
              </p>

              <form
                action="/api/participants/update-weeks"
                method="POST"
                className="space-y-4"
              >
                <input
                  type="hidden"
                  name="participant_id"
                  value={participant.id}
                />

                <div className="space-y-3">
                  {allWeeks.map((week) => (
                    <label
                      key={week.id}
                      className="flex items-start gap-3 rounded-xl border border-slate-200 p-3"
                    >
                      <input
                        type="checkbox"
                        name="week_ids"
                        value={week.id}
                        defaultChecked={selectedWeekIds.has(week.id)}
                        className="mt-1 h-4 w-4"
                      />

                      <span>
                        <span className="block font-bold text-slate-900">
                          {week.name}
                        </span>

                        <span className="block text-sm text-slate-600">
                          Del {formatDate(week.start_date)} al{" "}
                          {formatDate(week.end_date)}
                        </span>

                        <span className="block text-sm text-slate-600">
                          Preu actual: {Number(week.price || 0).toFixed(2)} €
                        </span>

                        {!week.active && (
                          <span className="mt-1 inline-block rounded bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">
                            Inactiva al formulari públic
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-800 px-5 py-3 font-bold text-white hover:bg-blue-900"
                >
                  Guardar setmanes
                </button>
              </form>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="mb-4 text-2xl font-bold text-slate-900">
                Resum pagament
              </h2>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Import total
                  </p>
                  <p className="text-3xl font-bold text-slate-900">
                    {totalAmount.toFixed(2)} €
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Import pagat
                  </p>
                  <p className="text-3xl font-bold text-green-700">
                    {totalPaid.toFixed(2)} €
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500">Pendent</p>
                  <p className="text-3xl font-bold text-orange-700">
                    {pendingAmount.toFixed(2)} €
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-sm text-slate-500">Estat</p>
                  <p className="text-lg font-bold text-slate-900">
                    {paymentStatus}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="mb-4 text-2xl font-bold text-slate-900">
                Afegir pagament
              </h2>

              <form action="/api/payments/add" method="POST" className="space-y-4">
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
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    placeholder="Ex: 150"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Mètode de pagament
                  </label>
                  <select
                    name="payment_method"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    <option value="">Selecciona mètode</option>
                    <option value="efectiu">Efectiu</option>
                    <option value="transferencia">Transferència</option>
                    <option value="bizum">Bizum</option>
                    <option value="targeta">Targeta</option>
                    <option value="altres">Altres</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Data pagament
                  </label>
                  <input
                    type="date"
                    name="payment_date"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Observacions
                  </label>
                  <textarea
                    name="notes"
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-800 px-5 py-3 font-bold text-white hover:bg-blue-900"
                >
                  Guardar pagament
                </button>
              </form>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="mb-4 text-2xl font-bold text-slate-900">
                Autoritzacions
              </h2>

              <div className="space-y-2 text-sm">
                <p>
                  Participació / mèdica:{" "}
                  <strong>
                    {participant.medical_authorization ? "Sí" : "No"}
                  </strong>
                </p>

                <p>
                  Protecció de dades:{" "}
                  <strong>{participant.data_consent ? "Sí" : "No"}</strong>
                </p>

                <p>
                  Drets d’imatge:{" "}
                  <strong>{participant.image_consent ? "Sí" : "No"}</strong>
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}