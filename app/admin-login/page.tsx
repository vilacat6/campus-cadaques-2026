type PageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const showError = params.error === "1";
  const nextUrl = params.next || "/admin";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-800">
          Campus U.E. Cadaqués
        </p>

        <h1 className="mb-3 text-3xl font-bold text-slate-900">
          Accés privat
        </h1>

        <p className="mb-6 text-slate-600">
          Introdueix la contrasenya per entrar al panell de gestió.
        </p>

        {showError && (
          <div className="mb-5 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
            La contrasenya no és correcta.
          </div>
        )}

        <form action="/api/admin/login" method="POST" className="space-y-5">
          <input type="hidden" name="next" value={nextUrl} />

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Contrasenya
            </label>

            <input
              type="password"
              name="password"
              required
              autoFocus
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Escriu la contrasenya"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-blue-800 px-5 py-3 font-bold text-white hover:bg-blue-900"
          >
            Entrar
          </button>
        </form>

        <a
          href="/"
          className="mt-6 block text-center text-sm font-semibold text-blue-800 hover:underline"
        >
          Tornar al formulari públic
        </a>
      </div>
    </main>
  );
}