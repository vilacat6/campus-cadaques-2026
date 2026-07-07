import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type Tutor = {
  tutor_name: string;
  phone_1: string;
  phone_2: string | null;
  email: string;
  dni: string | null;
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
  tutors: Tutor[];
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditParticipantPage({ params }: PageProps) {
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
      tutors (
        tutor_name,
        phone_1,
        phone_2,
        email,
        dni
      )
    `
    )
    .eq("id", id)
    .single();

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

  const participant = data as unknown as Participant;
  const tutor = participant.tutors?.[0];

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="bg-blue-900 px-6 py-8 text-white">
        <div className="mx-auto max-w-5xl">
          <a
            href={`/admin/participants/${participant.id}`}
            className="text-sm font-semibold text-blue-200"
          >
            ← Tornar a la fitxa
          </a>

          <h1 className="mt-4 text-4xl font-bold">
            Editar dades de {participant.first_name} {participant.last_name}
          </h1>

          <p className="mt-2 text-blue-100">
            Modifica les dades del participant i del tutor.
          </p>
        </div>
      </section>

      <section className="px-6 py-8">
        <form
          action="/api/participants/update"
          method="POST"
          className="mx-auto max-w-5xl space-y-6"
        >
          <input type="hidden" name="participant_id" value={participant.id} />

          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-6 text-2xl font-bold text-slate-900">
              Dades del nen/a
            </h2>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Nom
                </label>
                <input
                  name="first_name"
                  defaultValue={participant.first_name}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Cognoms
                </label>
                <input
                  name="last_name"
                  defaultValue={participant.last_name}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Data de naixement
                </label>
                <input
                  type="date"
                  name="birth_date"
                  defaultValue={participant.birth_date}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Localitat
                </label>
                <input
                  name="city"
                  defaultValue={participant.city || ""}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Talla samarreta
                </label>
                <select
                  name="shirt_size"
                  defaultValue={participant.shirt_size || ""}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="">Selecciona talla</option>
                  <option value="6">6</option>
                  <option value="8">8</option>
                  <option value="10">10</option>
                  <option value="12">12</option>
                  <option value="14">14</option>
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-6 text-2xl font-bold text-slate-900">
              Dades del tutor
            </h2>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Nom i cognoms del tutor
                </label>
                <input
                  name="tutor_name"
                  defaultValue={tutor?.tutor_name || ""}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  DNI/NIE
                </label>
                <input
                  name="dni"
                  defaultValue={tutor?.dni || ""}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Telèfon principal
                </label>
                <input
                  name="phone_1"
                  defaultValue={tutor?.phone_1 || ""}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Telèfon secundari
                </label>
                <input
                  name="phone_2"
                  defaultValue={tutor?.phone_2 || ""}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  defaultValue={tutor?.email || ""}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-6 text-2xl font-bold text-slate-900">
              Observacions
            </h2>

            <div className="space-y-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Al·lèrgies
                </label>
                <textarea
                  name="allergies"
                  rows={3}
                  defaultValue={participant.allergies || ""}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Observacions mèdiques
                </label>
                <textarea
                  name="medical_notes"
                  rows={3}
                  defaultValue={participant.medical_notes || ""}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Comentaris
                </label>
                <textarea
                  name="comments"
                  rows={3}
                  defaultValue={participant.comments || ""}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-6 text-2xl font-bold text-slate-900">
              Autoritzacions
            </h2>

            <div className="space-y-4">
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
                <input
                  type="checkbox"
                  name="medical_authorization"
                  defaultChecked={Boolean(participant.medical_authorization)}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <span className="block font-semibold text-slate-900">
                    Autorització de participació i assistència mèdica
                  </span>
                  <span className="block text-sm text-slate-600">
                    Obligatòria per poder participar al campus.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
                <input
                  type="checkbox"
                  name="data_consent"
                  defaultChecked={Boolean(participant.data_consent)}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <span className="block font-semibold text-slate-900">
                    Autorització de protecció de dades
                  </span>
                  <span className="block text-sm text-slate-600">
                    Obligatòria per gestionar la inscripció.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
                <input
                  type="checkbox"
                  name="image_consent"
                  defaultChecked={Boolean(participant.image_consent)}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <span className="block font-semibold text-slate-900">
                    Autorització de drets d’imatge
                  </span>
                  <span className="block text-sm text-slate-600">
                    Permet l’ús d’imatges del campus per comunicacions del club.
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl bg-white p-6 shadow md:flex-row md:items-center md:justify-between">
            <a
              href={`/admin/participants/${participant.id}`}
              className="rounded-xl border border-slate-300 px-5 py-3 text-center font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel·lar
            </a>

            <button
              type="submit"
              className="rounded-xl bg-blue-800 px-6 py-3 font-bold text-white hover:bg-blue-900"
            >
              Guardar canvis
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}