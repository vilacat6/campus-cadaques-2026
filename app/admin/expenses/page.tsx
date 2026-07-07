import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type Expense = {
  id: string;
  concept: string | null;
  category: string | null;
  amount: number | string | null;
  expense_date: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string | null;
};

function formatDate(date: string | null) {
  if (!date) {
    return "-";
  }

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

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

function getCategoryName(category: string | null) {
  const cleanCategory = String(category || "").trim();

  if (!cleanCategory) {
    return "Sense categoria";
  }

  return cleanCategory;
}

export default async function AdminExpensesPage() {
  const { data, error } = await supabaseAdmin
    .from("expenses")
    .select(
      "id, concept, category, amount, expense_date, payment_method, notes, created_at"
    )
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-red-50 p-8">
        <h1 className="text-3xl font-bold text-red-700">
          Error carregant despeses
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

  const expenses = (data || []) as unknown as Expense[];

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  const categoryTotals = expenses.reduce<Record<string, number>>(
    (groups, expense) => {
      const category = getCategoryName(expense.category);

      if (!groups[category]) {
        groups[category] = 0;
      }

      groups[category] += Number(expense.amount || 0);

      return groups;
    },
    {}
  );

  const sortedCategories = Object.entries(categoryTotals).sort(
    ([, amountA], [, amountB]) => amountB - amountA
  );

  const paymentMethodTotals = expenses.reduce<Record<string, number>>(
    (groups, expense) => {
      const paymentMethod = String(expense.payment_method || "").trim();

      const key = paymentMethod || "Sense mètode";

      if (!groups[key]) {
        groups[key] = 0;
      }

      groups[key] += Number(expense.amount || 0);

      return groups;
    },
    {}
  );

  const sortedPaymentMethods = Object.entries(paymentMethodTotals).sort(
    ([, amountA], [, amountB]) => amountB - amountA
  );

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="bg-blue-900 px-6 py-8 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap gap-3">
            <a
              href="/admin"
              className="rounded-xl bg-blue-800 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
            >
              ← Tornar al panell
            </a>
          </div>

          <h1 className="mt-4 text-4xl font-bold">Despeses del campus</h1>

          <p className="mt-2 text-blue-100">
            Control de despeses, categories i formes de pagament.
          </p>
        </div>
      </section>

      <section className="px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Total despeses
              </p>

              <p className="mt-2 text-4xl font-bold text-red-700">
                {formatCurrency(totalExpenses)}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Nombre de despeses
              </p>

              <p className="mt-2 text-4xl font-bold text-slate-900">
                {expenses.length}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Categories diferents
              </p>

              <p className="mt-2 text-4xl font-bold text-slate-900">
                {sortedCategories.length}
              </p>
            </div>
          </div>

          <div className="mb-8 rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-4 text-2xl font-bold text-slate-900">
              Afegir nova despesa
            </h2>

            <form
              action="/api/expenses/add"
              method="POST"
              className="grid gap-4 md:grid-cols-2"
            >
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Concepte
                </label>

                <input
                  name="concept"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="Exemple: Samarretes, monitor, material..."
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Categoria
                </label>

                <input
                  name="category"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="Material, monitors, assegurança..."
                />
              </div>

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
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Data
                </label>

                <input
                  type="date"
                  name="expense_date"
                  defaultValue={todayDateInput()}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Forma de pagament
                </label>

                <select
                  name="payment_method"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  defaultValue=""
                >
                  <option value="">Sense indicar</option>
                  <option value="Efectiu">Efectiu</option>
                  <option value="Transferència">Transferència</option>
                  <option value="Targeta">Targeta</option>
                  <option value="Bizum">Bizum</option>
                  <option value="Domiciliació">Domiciliació</option>
                  <option value="Altres">Altres</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Notes
                </label>

                <input
                  name="notes"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="Comentari opcional"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="rounded-xl bg-blue-800 px-6 py-3 font-bold text-white hover:bg-blue-900"
                >
                  Afegir despesa
                </button>
              </div>
            </form>
          </div>

          <div className="mb-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="mb-4 text-2xl font-bold text-slate-900">
                Resum per categoria
              </h2>

              {sortedCategories.length === 0 ? (
                <p className="text-slate-600">Encara no hi ha despeses.</p>
              ) : (
                <div className="space-y-3">
                  {sortedCategories.map(([category, amount]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                    >
                      <span className="font-semibold text-slate-800">
                        {category}
                      </span>

                      <span className="font-bold text-red-700">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="mb-4 text-2xl font-bold text-slate-900">
                Resum per forma de pagament
              </h2>

              {sortedPaymentMethods.length === 0 ? (
                <p className="text-slate-600">Encara no hi ha despeses.</p>
              ) : (
                <div className="space-y-3">
                  {sortedPaymentMethods.map(([paymentMethod, amount]) => (
                    <div
                      key={paymentMethod}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                    >
                      <span className="font-semibold text-slate-800">
                        {paymentMethod}
                      </span>

                      <span className="font-bold text-red-700">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow">
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Llistat de despeses
              </h2>

              <p className="mt-1 text-slate-600">
                Pots modificar o esborrar qualsevol despesa.
              </p>
            </div>

            {expenses.length === 0 ? (
              <div className="p-6 text-slate-600">
                Encara no hi ha cap despesa entrada.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {expenses.map((expense) => (
                  <div key={expense.id} className="p-6">
                    <form
                      action="/api/expenses/update"
                      method="POST"
                      className="grid gap-4 md:grid-cols-6"
                    >
                      <input
                        type="hidden"
                        name="expense_id"
                        value={expense.id}
                      />

                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Concepte
                        </label>

                        <input
                          name="concept"
                          defaultValue={expense.concept || ""}
                          required
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Categoria
                        </label>

                        <input
                          name="category"
                          defaultValue={expense.category || ""}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Import
                        </label>

                        <input
                          type="number"
                          step="0.01"
                          name="amount"
                          defaultValue={Number(expense.amount || 0).toFixed(2)}
                          required
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Data
                        </label>

                        <input
                          type="date"
                          name="expense_date"
                          defaultValue={
                            expense.expense_date || todayDateInput()
                          }
                          required
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Pagament
                        </label>

                        <select
                          name="payment_method"
                          defaultValue={expense.payment_method || ""}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        >
                          <option value="">Sense indicar</option>
                          <option value="Efectiu">Efectiu</option>
                          <option value="Transferència">Transferència</option>
                          <option value="Targeta">Targeta</option>
                          <option value="Bizum">Bizum</option>
                          <option value="Domiciliació">Domiciliació</option>
                          <option value="Altres">Altres</option>
                        </select>
                      </div>

                      <div className="md:col-span-6">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Notes
                        </label>

                        <textarea
                          name="notes"
                          defaultValue={expense.notes || ""}
                          rows={2}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-3 md:col-span-6">
                        <button
                          type="submit"
                          className="rounded-xl bg-blue-800 px-5 py-3 font-bold text-white hover:bg-blue-900"
                        >
                          Guardar canvis
                        </button>

                        <span className="text-sm text-slate-500">
                          Data despesa: {formatDate(expense.expense_date)}
                        </span>
                      </div>
                    </form>

                    <form
                      action="/api/expenses/delete"
                      method="POST"
                      className="mt-3"
                    >
                      <input
                        type="hidden"
                        name="expense_id"
                        value={expense.id}
                      />

                      <button
                        type="submit"
                        className="rounded-xl bg-red-100 px-5 py-3 text-sm font-bold text-red-800 hover:bg-red-200"
                      >
                        Esborrar despesa
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}