import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type Week = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  price: number | string | null;
  active: boolean | null;
  max_participants: number | null;
};

type Registration = {
  id: string;
  week_id: string;
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

export default async function AdminWeeksPage() {
  const { data: weeksData, error: weeksError } = await supabaseAdmin
    .from("weeks")
    .select("id, name, start_date, end_date, price, active, max_participants")
    .order("start_date", { ascending: true });

  const { data: registrationsData, error: registrationsError } =
    await supabaseAdmin.from("registrations").select("id, week_id");

  if (weeksError) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-black text-red-700">
            Error carregant les setmanes
          </h1>

          <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-red-50 p-4 text-sm text-red-900">
            {JSON.stringify(weeksError, null, 2)}
          </pre>

          <a
            href="/admin"
            className="mt-6 inline-flex rounded-xl bg-slate-900 px-4 py-2 font-bold text-white"
          >
            Tornar al panell
          </a>
        </div>
      </main>
    );
  }

  if (registrationsError) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-black text-red-700">
            Error carregant les inscripcions
          </h1>

          <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-red-50 p-4 text-sm text-red-900">
            {JSON.stringify(registrationsError, null, 2)}
          </pre>

          <a
            href="/admin"
            className="mt-6 inline-flex rounded-xl bg-slate-900 px-4 py-2 font-bold text-white"
          >
            Tornar al panell
          </a>
        </div>
      </main>
    );
  }

  const weeks = (weeksData || []) as Week[];
  const registrations = (registrationsData || []) as Registration[];

  const registrationsByWeek = registrations.reduce<Record<string, number>>(
    (acc, registration) => {
      acc[registration.week_id] = (acc[registration.week_id] || 0) + 1;
      return acc;
    },
    {}
  );

  const activeWeeks = weeks.filter((week) => week.active).length;
  const totalCapacity = weeks.reduce((total, week) => {
    return total + Number(week.max_participants || 0);
  }, 0);

  const totalRegistrations = registrations.length;

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-[#C62828] p-6 text-white shadow">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-red-100">
                Administració
              </p>

              <h1 className="mt-1 text-3xl font-black">
                Setmanes del campus
              </h1>

              <p className="mt-2 text-red-50">
                Configura dates, preu, estat actiu i límit de participants de
                cada setmana.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href="/admin"
                className="rounded-xl bg-white px-4 py-2 text-sm font-black text-[#C62828] shadow hover:bg-red-50"
              >
                Tornar al panell
              </a>

              <a
                href="/"
                target="_blank"
                className="rounded-xl border border-white/40 px-4 py-2 text-sm font-black text-white hover:bg-white/10"
              >
                Veure formulari públic
              </a>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow">
            <p className="text-sm font-bold text-slate-500">Setmanes totals</p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              {weeks.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow">
            <p className="text-sm font-bold text-slate-500">Setmanes actives</p>
            <p className="mt-2 text-3xl font-black text-[#C62828]">
              {activeWeeks}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow">
            <p className="text-sm font-bold text-slate-500">
              Inscripcions / capacitat
            </p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              {totalRegistrations}
              {totalCapacity > 0 ? (
                <span className="text-slate-400"> / {totalCapacity}</span>
              ) : null}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-900">
              Configuració de setmanes
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Les setmanes marcades com a actives són les que apareixen al
              formulari públic d’inscripció.
            </p>
          </div>

          <div className="space-y-5">
            {weeks.map((week) => {
              const registeredCount = registrationsByWeek[week.id] || 0;
              const maxParticipants = week.max_participants || null;
              const isFull =
                maxParticipants !== null && registeredCount >= maxParticipants;
              const isNearFull =
                maxParticipants !== null &&
                registeredCount < maxParticipants &&
                registeredCount >= Math.max(maxParticipants - 3, 0);

              return (
                <article
                  key={week.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <form
                    action="/api/weeks/update"
                    method="POST"
                    className="space-y-5"
                  >
                    <input type="hidden" name="id" value={week.id} />

                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-xl font-black text-slate-900">
                          {week.name}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          Del {formatDate(week.start_date)} al{" "}
                          {formatDate(week.end_date)}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className={
                              week.active
                                ? "rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-800"
                                : "rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-600"
                            }
                          >
                            {week.active ? "Activa" : "Inactiva"}
                          </span>

                          <span
                            className={
                              isFull
                                ? "rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-800"
                                : isNearFull
                                  ? "rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-800"
                                  : "rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700"
                            }
                          >
                            {registeredCount}
                            {maxParticipants !== null
                              ? ` / ${maxParticipants}`
                              : ""}
                            {" inscrits"}
                          </span>

                          <span className="rounded-full bg-[#FDECEC] px-3 py-1 text-xs font-black text-[#C62828]">
                            {formatCurrency(Number(week.price || 0))}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <a
                          href={`/admin/weeks/${week.id}`}
                          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
                        >
                          Veure setmana
                        </a>

                        <a
                          href={`/admin/weeks/${week.id}/attendance`}
                          className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                        >
                          Assistència
                        </a>

                        <a
                          href={`/admin/weeks/${week.id}/groups`}
                          className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                        >
                          Grups
                        </a>

                        <a
                          href={`/admin/weeks/${week.id}/print`}
                          className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                        >
                          Imprimir
                        </a>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                      <div className="lg:col-span-1">
                        <label className="mb-1 block text-sm font-bold text-slate-700">
                          Nom
                        </label>

                        <input
                          name="name"
                          defaultValue={week.name}
                          required
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#C62828] focus:ring-2 focus:ring-[#FDECEC]"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-bold text-slate-700">
                          Data inici
                        </label>

                        <input
                          type="date"
                          name="start_date"
                          defaultValue={week.start_date}
                          required
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#C62828] focus:ring-2 focus:ring-[#FDECEC]"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-bold text-slate-700">
                          Data final
                        </label>

                        <input
                          type="date"
                          name="end_date"
                          defaultValue={week.end_date}
                          required
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#C62828] focus:ring-2 focus:ring-[#FDECEC]"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-bold text-slate-700">
                          Preu
                        </label>

                        <input
                          type="number"
                          name="price"
                          min="0"
                          step="0.01"
                          defaultValue={Number(week.price || 0)}
                          required
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#C62828] focus:ring-2 focus:ring-[#FDECEC]"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-bold text-slate-700">
                          Límit de nens
                        </label>

                        <input
                          type="number"
                          name="max_participants"
                          min="1"
                          step="1"
                          defaultValue={week.max_participants || ""}
                          placeholder="Sense límit"
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#C62828] focus:ring-2 focus:ring-[#FDECEC]"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 md:flex-row md:items-center md:justify-between">
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        <input
                          type="checkbox"
                          name="active"
                          defaultChecked={Boolean(week.active)}
                          className="h-5 w-5 accent-[#C62828]"
                        />
                        Setmana activa al formulari públic
                      </label>

                      <button
                        type="submit"
                        className="rounded-xl bg-[#C62828] px-5 py-2 text-sm font-black text-white shadow hover:bg-[#A61E1E]"
                      >
                        Guardar canvis
                      </button>
                    </div>
                  </form>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}