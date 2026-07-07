export default function InscripcioConfirmadaPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-12">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-lg">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-green-700">
          U.E. Cadaqués
        </p>

        <h1 className="mb-4 text-3xl font-bold text-green-700">
          Inscripció rebuda correctament
        </h1>

        <p className="mb-4 text-lg text-slate-700">
          Hem rebut correctament la inscripció al Campus de Futbol U.E.
          Cadaqués.
        </p>

        <p className="mb-6 text-slate-700">
          En breu rebreu més informació sobre el campus i el pagament.
        </p>

        <a
          href="/"
          className="inline-block rounded-xl bg-blue-800 px-6 py-3 font-bold text-white hover:bg-blue-900"
        >
          Tornar a l&apos;inici
        </a>
      </div>
    </main>
  );
}