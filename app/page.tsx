import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type Week = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  price: number | string | null;
  active: boolean | null;
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

export default async function HomePage() {
  const { data: weeksData, error: weeksError } = await supabaseAdmin
    .from("weeks")
    .select("id, name, start_date, end_date, price, active")
    .eq("active", true)
    .order("start_date", { ascending: true });

  if (weeksError) {
    return (
      <main className="min-h-screen bg-red-50 p-8">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow">
          <h1 className="text-3xl font-bold text-red-700">
            Error carregant el formulari
          </h1>

          <p className="mt-4 text-slate-700">
            No s’han pogut carregar les setmanes del campus.
          </p>

          <pre className="mt-6 whitespace-pre-wrap rounded bg-red-50 p-4 text-sm text-red-900">
            {JSON.stringify(weeksError, null, 2)}
          </pre>
        </div>
      </main>
    );
  }

  const weeks = (weeksData || []) as unknown as Week[];

  return (
    <main className="min-h-screen bg-[#F3F4F6]">
      <section className="relative overflow-hidden bg-[#C62828] px-6 py-12 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#1E40AF]" />
          <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-white" />
        </div>

        <div className="relative mx-auto max-w-5xl">
          <div className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-black uppercase tracking-wide text-[#C62828] shadow">
            U.E. Cadaqués
          </div>

          <h1 className="mt-5 text-4xl font-black md:text-5xl">
            Inscripció Campus de Futbol 2026
          </h1>

          <p className="mt-4 max-w-3xl text-lg text-red-50">
            Formulari d’inscripció al Campus U.E. Cadaqués. Omple les dades del
            menor, del tutor/a i selecciona les setmanes en què participarà.
          </p>
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <form
            action="/api/register"
            method="POST"
            className="space-y-8 rounded-3xl border border-slate-200 bg-white p-6 shadow md:p-8"
          >
            <section>
              <h2 className="text-2xl font-black text-[#C62828]">
                Dades del menor
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Introdueix les dades del nen o nena que participarà al campus.
              </p>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Nom
                  </label>

                  <input
                    name="first_name"
                    required
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#C62828] focus:ring-2 focus:ring-[#FDECEC]"
                    placeholder="Nom"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Cognoms
                  </label>

                  <input
                    name="last_name"
                    required
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#C62828] focus:ring-2 focus:ring-[#FDECEC]"
                    placeholder="Cognoms"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Data de naixement
                  </label>

                  <input
                    type="date"
                    name="birth_date"
                    required
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#C62828] focus:ring-2 focus:ring-[#FDECEC]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Població  
                  </label>

                  <input
                    name="city"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#C62828] focus:ring-2 focus:ring-[#FDECEC]"
                    placeholder="Cadaqués, Roses, Girona..."
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Talla de samarreta
                  </label>

                  <select
                    name="shirt_size"
                    defaultValue=""
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#C62828] focus:ring-2 focus:ring-[#FDECEC]"
                  >
                    <option value="">Selecciona una talla</option>
                    <option value="4">4</option>
                    <option value="6">6</option>
                    <option value="8">8</option>
                    <option value="10">10</option>
                    <option value="12">12</option>
                    <option value="14">14</option>
                    <option value="XS">XS</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="border-t border-slate-200 pt-8">
              <h2 className="text-2xl font-black text-[#C62828]">
                Dades del pare, mare o tutor/a
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Aquestes dades serviran per contactar amb la família si és
                necessari.
              </p>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Nom i cognoms del tutor/a
                  </label>

                  <input
                    name="tutor_name"
                    required
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#C62828] focus:ring-2 focus:ring-[#FDECEC]"
                    placeholder="Nom i cognoms"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Telèfon principal
                  </label>

                  <input
                    name="phone_1"
                    required
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#C62828] focus:ring-2 focus:ring-[#FDECEC]"
                    placeholder="600 000 000"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Telèfon alternatiu
                  </label>

                  <input
                    name="phone_2"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#C62828] focus:ring-2 focus:ring-[#FDECEC]"
                    placeholder="Opcional"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Email
                  </label>

                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#C62828] focus:ring-2 focus:ring-[#FDECEC]"
                    placeholder="correu@exemple.com"
                  />
                </div>
              </div>
            </section>

            <section className="border-t border-slate-200 pt-8">
              <h2 className="text-2xl font-black text-[#C62828]">
                Setmanes d’inscripció
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Selecciona una o més setmanes.
              </p>

              {weeks.length === 0 ? (
                <div className="mt-6 rounded-xl bg-orange-50 p-4 text-orange-800">
                  Ara mateix no hi ha cap setmana activa per inscriure’s.
                </div>
              ) : (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {weeks.map((week) => (
                    <label
                      key={week.id}
                      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:border-[#C62828] hover:bg-[#FDECEC]"
                    >
                      <input
                        type="checkbox"
                        name="week_ids"
                        value={week.id}
                        className="mt-1 h-5 w-5 accent-[#C62828]"
                      />

                      <span>
                        <span className="block font-black text-[#0F172A]">
                          {week.name}
                        </span>

                        <span className="mt-1 block text-sm text-slate-600">
                          Del {formatDate(week.start_date)} al{" "}
                          {formatDate(week.end_date)}
                        </span>

                        <span className="mt-2 inline-flex rounded-full bg-[#C62828] px-3 py-1 text-sm font-black text-white">
                          {formatCurrency(Number(week.price || 0))}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </section>

            <section className="border-t border-slate-200 pt-8">
              <h2 className="text-2xl font-black text-[#C62828]">
                Informació mèdica i observacions
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Indica qualsevol informació important que l’organització hagi de
                saber.
              </p>

              <div className="mt-6 grid gap-5">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Al·lèrgies
                  </label>

                  <textarea
                    name="allergies"
                    rows={3}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#C62828] focus:ring-2 focus:ring-[#FDECEC]"
                    placeholder="Indica al·lèrgies alimentàries, medicaments, picades..."
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Informació mèdica rellevant
                  </label>

                  <textarea
                    name="medical_notes"
                    rows={3}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#C62828] focus:ring-2 focus:ring-[#FDECEC]"
                    placeholder="Asma, medicació, lesions, necessitats especials..."
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Comentaris o observacions
                  </label>

                  <textarea
                    name="comments"
                    rows={3}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#C62828] focus:ring-2 focus:ring-[#FDECEC]"
                    placeholder="Qualsevol altra informació que vulguis comunicar."
                  />
                </div>
              </div>
            </section>

            <section className="border-t border-slate-200 pt-8">
              <h2 className="text-2xl font-black text-[#C62828]">
                Autoritzacions
              </h2>

              <div className="mt-6 space-y-4">
                <label className="flex items-start gap-3 rounded-xl border border-[#F6B8B8] bg-[#FDECEC] p-4 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="authorization"
                    required
                    className="mt-1 h-5 w-5 accent-[#C62828]"
                  />

                  <span>
                    <span className="block font-black text-[#C62828]">
                      Autoritzo la participació del menor al Campus U.E.
                      Cadaqués.
                      <span className="ml-1 text-lg leading-none text-[#C62828]">
                        *
                      </span>
                    </span>

                    <span className="mt-2 block">
                      En cas d’urgència, autoritzo l’organització a contactar
                      amb la família i, si fos necessari, amb els serveis mèdics
                      o d’emergència corresponents per garantir la correcta
                      atenció del menor.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3 rounded-xl border border-[#F6B8B8] bg-[#FDECEC] p-4 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="data_protection"
                    required
                    className="mt-1 h-5 w-5 accent-[#C62828]"
                  />

                  <span>
                    <span className="block font-black text-[#C62828]">
                      Accepto el tractament de les dades facilitades.
                      <span className="ml-1 text-lg leading-none text-[#C62828]">
                        *
                      </span>
                    </span>

                    <span className="mt-2 block">
                      Declaro que les dades facilitades són correctes i accepto
                      que siguin utilitzades per a la gestió de la inscripció i
                      organització del Campus U.E. Cadaqués.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="image_authorization"
                    className="mt-1 h-5 w-5 accent-[#C62828]"
                  />

                  <span>
                    <span className="block font-black text-slate-800">
                      Autoritzo l’ús d’imatges del menor.
                    </span>

                    <span className="mt-2 block">
                      Autoritzo que el menor pugui aparèixer en fotografies o
                      vídeos realitzats durant el Campus U.E. Cadaqués i que
                      aquestes imatges puguin ser utilitzades per a la difusió
                      de l’activitat del club, en canals propis com web, xarxes
                      socials o material informatiu.
                    </span>

                    <span className="mt-2 block text-xs font-semibold text-slate-500">
                      Si no es marca aquesta casella, entendrem que no
                      s’autoritza l’ús d’imatges del menor.
                    </span>
                  </span>
                </label>
              </div>

              <p className="mt-3 text-xs font-semibold text-slate-500">
                <span className="text-[#C62828]">*</span> Obligatori
              </p>
            </section>

            <section className="border-t border-slate-200 pt-8">
              <button
                type="submit"
                disabled={weeks.length === 0}
                className="w-full rounded-2xl bg-[#C62828] px-6 py-4 text-lg font-black text-white shadow hover:bg-[#A61E1E] disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                Enviar inscripció
              </button>

              <p className="mt-3 text-center text-sm text-slate-500">
                Un cop enviada la inscripció, l’organització revisarà les dades.
              </p>
            </section>
          </form>

          <div className="mt-6 text-center">
            <a
              href="/admin-login"
              className="text-sm font-bold text-[#C62828] hover:text-[#1E40AF]"
            >
              Accés administració
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}