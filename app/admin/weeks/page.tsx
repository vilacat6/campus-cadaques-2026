import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type Week = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  price: number | null;
  max_places: number | null;
  active: boolean | null;
};

type RegistrationCount = {
  week_id: string;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ca-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export default async function AdminWeeksPage() {
  const { data: weeksData, error: weeksError } = await supabaseAdmin
    .from("weeks")
    .select("id, name, start_date, end_date, price, max_places, active")
    .order("start_date", { ascending: true });

  const { data: registrationsData, error: registrationsError } =
    await supabaseAdmin.from("registrations").select("week_id");

  if (weeksError) {
    return (
      <main className="min-h-screen bg-red-50 p-8">
        <h1 className="text-3xl font-bold text-red-700">
          Error carregant setmanes
        </h1>

        <pre className="mt-6 whitespace-pre-wrap rounded bg-white p-4 text-sm text-red-900">
          {JSON.stringify(weeksError, null, 2)}
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

  if (registrationsError) {
    console.error("Error carregant inscripcions:", registrationsError);
  }

  const weeks = (weeksData || []) as unknown as Week[];
  const registrations = (registrationsData ||
    []) as unknown as RegistrationCount[];

  function countRegistrations(weekId: string) {
    return registrations.filter(
      (registration) => registration.week_id === weekId
    ).length;
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="bg-blue-900 px-6 py-8 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap gap-3">
            <a
              href="/admin"
              className="rounded-xl bg-blue-800 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
            >
              ← Tornar al panell
            </a>
          </div>

          <h1 className="mt-4 text-4xl font-bold">
            Configuració de setmanes
          </h1>

          <p className="mt-3 text-blue-100">
            Modifica dates, preus, places i setmanes actives del campus.
          </p>
        </div>
      </section>

      <section className="px-6 py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          {weeks.length === 0 ? (
            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-slate-600">
                Encara no hi ha setmanes creades.
              </p>
            </div>
          ) : (
            weeks.map((week) => {
              const registered = countRegistrations(week.id);
              const maxPlaces = week.max_places;

              const placesText =
                maxPlaces === null
                  ? `${registered} inscrits`
                  : `${registered} / ${maxPlaces} inscrits`;

              const freePlaces =
                maxPlaces === null
                  ? null
                  : Math.max(maxPlaces - registered, 0);

              return (
                <div key={week.id} className="rounded-2xl bg-white p-6 shadow">
                  <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">
                        {week.name}
                      </h2>

                      <p className="mt-1 text-slate-600">
                        Del {formatDate(week.start_date)} al{" "}
                        {formatDate(week.end_date)}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {placesText}
                      </p>

                      {freePlaces !== null && (
                        <p className="mt-1 text-sm font-semibold text-green-700">
                          Places lliures: {freePlaces}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/admin/weeks/${week.id}`}
                        className="rounded-xl bg-blue-800 px-4 py-2 text-sm font-bold text-white hover:bg-blue-900"
                      >
                        Veure inscrits
                      </a>

                      <div
                        className={`rounded-full px-3 py-2 text-sm font-bold ${
                          week.active
                            ? "bg-green-100 text-green-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {week.active ? "Activa" : "Inactiva"}
                      </div>
                    </div>
                  </div>

                  <form
                    action="/api/weeks/update"
                    method="POST"
                    className="grid gap-4 md:grid-cols-2"
                  >
                    <input type="hidden" name="week_id" value={week.id} />

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Nom setmana
                      </label>

                      <input
                        name="name"
                        defaultValue={week.name}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Preu
                      </label>

                      <input
                        type="number"
                        step="0.01"
                        name="price"
                        defaultValue={Number(week.price || 0).toFixed(2)}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Data inici
                      </label>

                      <input
                        type="date"
                        name="start_date"
                        defaultValue={week.start_date}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Data final
                      </label>

                      <input
                        type="date"
                        name="end_date"
                        defaultValue={week.end_date}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Places màximes
                      </label>

                      <input
                        type="number"
                        name="max_places"
                        defaultValue={week.max_places ?? ""}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        placeholder="Sense límit"
                      />
                    </div>

                    <div className="flex items-end">
                      <label className="flex items-center gap-3 rounded-lg border border-slate-300 px-4 py-3">
                        <input
                          type="checkbox"
                          name="active"
                          defaultChecked={Boolean(week.active)}
                          className="h-4 w-4"
                        />

                        <span className="font-medium text-slate-800">
                          Setmana activa al formulari públic
                        </span>
                      </label>
                    </div>

                    <div className="md:col-span-2">
                      <button
                        type="submit"
                        className="rounded-xl bg-blue-800 px-5 py-3 font-bold text-white hover:bg-blue-900"
                      >
                        Guardar canvis
                      </button>
                    </div>
                  </form>
                </div>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}