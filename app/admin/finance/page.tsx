import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type Registration = {
  id: string;
  participant_id: string;
  week_id: string;
  price: number | string | null;
};

type Week = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
};

type Payment = {
  id: string;
  participant_id: string;
  amount: number | string | null;
  payment_date: string | null;
  payment_method: string | null;
};

type Expense = {
  id: string;
  concept: string | null;
  category: string | null;
  amount: number | string | null;
  expense_date: string | null;
  payment_method: string | null;
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

function getPercent(part: number, total: number) {
  if (total <= 0) {
    return "0,00 %";
  }

  return new Intl.NumberFormat("ca-ES", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(part / total);
}

function cleanText(value: string | null | undefined, fallback: string) {
  const cleanValue = String(value || "").trim();

  if (!cleanValue) {
    return fallback;
  }

  return cleanValue;
}

export default async function AdminFinancePage() {
  const { data: registrationsData, error: registrationsError } =
    await supabaseAdmin
      .from("registrations")
      .select("id, participant_id, week_id, price");

  const { data: weeksData, error: weeksError } = await supabaseAdmin
    .from("weeks")
    .select("id, name, start_date, end_date")
    .order("start_date", { ascending: true });

  const { data: paymentsData, error: paymentsError } = await supabaseAdmin
    .from("payments")
    .select("id, participant_id, amount, payment_date, payment_method")
    .order("payment_date", { ascending: false });

  const { data: expensesData, error: expensesError } = await supabaseAdmin
    .from("expenses")
    .select("id, concept, category, amount, expense_date, payment_method")
    .order("expense_date", { ascending: false });

  if (registrationsError) {
    return (
      <main className="min-h-screen bg-red-50 p-8">
        <h1 className="text-3xl font-bold text-red-700">
          Error carregant inscripcions
        </h1>

        <pre className="mt-6 whitespace-pre-wrap rounded bg-white p-4 text-sm text-red-900">
          {JSON.stringify(registrationsError, null, 2)}
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

  if (weeksError) {
    console.error("Error carregant setmanes:", weeksError);
  }

  if (paymentsError) {
    console.error("Error carregant pagaments:", paymentsError);
  }

  if (expensesError) {
    console.error("Error carregant despeses:", expensesError);
  }

  const registrations = (registrationsData || []) as unknown as Registration[];
  const weeks = (weeksData || []) as unknown as Week[];
  const payments = (paymentsData || []) as unknown as Payment[];
  const expenses = (expensesData || []) as unknown as Expense[];

  const totalExpected = registrations.reduce(
    (sum, registration) => sum + Number(registration.price || 0),
    0
  );

  const totalPaid = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );

  const totalPending = Math.max(totalExpected - totalPaid, 0);

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  const expectedResult = totalExpected - totalExpenses;
  const realResult = totalPaid - totalExpenses;

  const participantIds = Array.from(
    new Set(registrations.map((registration) => registration.participant_id))
  );

  const averageExpectedPerParticipant =
    participantIds.length > 0 ? totalExpected / participantIds.length : 0;

  const averageExpectedPerRegistration =
    registrations.length > 0 ? totalExpected / registrations.length : 0;

  const weeklySummary = weeks.map((week) => {
    const weekRegistrations = registrations.filter(
      (registration) => registration.week_id === week.id
    );

    const weekTotal = weekRegistrations.reduce(
      (sum, registration) => sum + Number(registration.price || 0),
      0
    );

    return {
      week,
      registrations: weekRegistrations.length,
      expected: weekTotal,
    };
  });

  const expenseCategoryTotals = expenses.reduce<Record<string, number>>(
    (groups, expense) => {
      const category = cleanText(expense.category, "Sense categoria");

      if (!groups[category]) {
        groups[category] = 0;
      }

      groups[category] += Number(expense.amount || 0);

      return groups;
    },
    {}
  );

  const sortedExpenseCategories = Object.entries(expenseCategoryTotals).sort(
    ([, amountA], [, amountB]) => amountB - amountA
  );

  const paymentMethodTotals = payments.reduce<Record<string, number>>(
    (groups, payment) => {
      const method = cleanText(payment.payment_method, "Sense indicar");

      if (!groups[method]) {
        groups[method] = 0;
      }

      groups[method] += Number(payment.amount || 0);

      return groups;
    },
    {}
  );

  const sortedPaymentMethods = Object.entries(paymentMethodTotals).sort(
    ([, amountA], [, amountB]) => amountB - amountA
  );

  const expensePaymentMethodTotals = expenses.reduce<Record<string, number>>(
    (groups, expense) => {
      const method = cleanText(expense.payment_method, "Sense indicar");

      if (!groups[method]) {
        groups[method] = 0;
      }

      groups[method] += Number(expense.amount || 0);

      return groups;
    },
    {}
  );

  const sortedExpensePaymentMethods = Object.entries(
    expensePaymentMethodTotals
  ).sort(([, amountA], [, amountB]) => amountB - amountA);

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

            <a
              href="/admin/payments"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
            >
              Cobraments
            </a>

            <a
              href="/admin/expenses"
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
            >
              Despeses
            </a>

            <a
              href="/api/admin/export"
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700"
            >
              Exportar a Excel
            </a>
          </div>

          <h1 className="mt-4 text-4xl font-bold">Resum econòmic</h1>

          <p className="mt-2 text-blue-100">
            Informe general d’ingressos, cobraments, despeses i resultat del
            campus.
          </p>
        </div>
      </section>

      <section className="px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Ingressos previstos
              </p>

              <p className="mt-2 text-4xl font-bold text-slate-900">
                {formatCurrency(totalExpected)}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Ingressos cobrats
              </p>

              <p className="mt-2 text-4xl font-bold text-green-700">
                {formatCurrency(totalPaid)}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {getPercent(totalPaid, totalExpected)} del previst
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Pendent de cobrar
              </p>

              <p className="mt-2 text-4xl font-bold text-orange-700">
                {formatCurrency(totalPending)}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">Despeses</p>

              <p className="mt-2 text-4xl font-bold text-red-700">
                {formatCurrency(totalExpenses)}
              </p>
            </div>
          </div>

          <div className="mb-8 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Resultat previst
              </p>

              <p
                className={`mt-2 text-4xl font-bold ${
                  expectedResult >= 0 ? "text-green-700" : "text-red-700"
                }`}
              >
                {formatCurrency(expectedResult)}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Resultat real cobrat
              </p>

              <p
                className={`mt-2 text-4xl font-bold ${
                  realResult >= 0 ? "text-green-700" : "text-red-700"
                }`}
              >
                {formatCurrency(realResult)}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Participants inscrits
              </p>

              <p className="mt-2 text-4xl font-bold text-slate-900">
                {participantIds.length}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Mitjana: {formatCurrency(averageExpectedPerParticipant)}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm font-medium text-slate-500">
                Inscripcions setmanals
              </p>

              <p className="mt-2 text-4xl font-bold text-slate-900">
                {registrations.length}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Mitjana: {formatCurrency(averageExpectedPerRegistration)}
              </p>
            </div>
          </div>

          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl bg-white shadow">
              <div className="border-b border-slate-200 p-6">
                <h2 className="text-2xl font-bold text-slate-900">
                  Ingressos previstos per setmana
                </h2>
              </div>

              {weeklySummary.length === 0 ? (
                <div className="p-6 text-slate-600">
                  Encara no hi ha setmanes creades.
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {weeklySummary.map((item) => (
                    <div
                      key={item.week.id}
                      className="grid gap-4 p-5 md:grid-cols-4 md:items-center"
                    >
                      <div className="md:col-span-2">
                        <a
                          href={`/admin/weeks/${item.week.id}`}
                          className="font-bold text-blue-800 hover:underline"
                        >
                          {item.week.name}
                        </a>

                        <p className="text-sm text-slate-500">
                          {formatDate(item.week.start_date)} -{" "}
                          {formatDate(item.week.end_date)}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-slate-500">Inscripcions</p>
                        <p className="text-xl font-bold text-slate-900">
                          {item.registrations}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-slate-500">Import</p>
                        <p className="text-xl font-bold text-green-700">
                          {formatCurrency(item.expected)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl bg-white shadow">
              <div className="border-b border-slate-200 p-6">
                <h2 className="text-2xl font-bold text-slate-900">
                  Despeses per categoria
                </h2>
              </div>

              {sortedExpenseCategories.length === 0 ? (
                <div className="p-6 text-slate-600">
                  Encara no hi ha despeses.
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {sortedExpenseCategories.map(([category, amount]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between gap-4 p-5"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{category}</p>

                        <p className="text-sm text-slate-500">
                          {getPercent(amount, totalExpenses)} del total
                        </p>
                      </div>

                      <p className="text-xl font-bold text-red-700">
                        {formatCurrency(amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl bg-white shadow">
              <div className="border-b border-slate-200 p-6">
                <h2 className="text-2xl font-bold text-slate-900">
                  Cobraments per forma de pagament
                </h2>
              </div>

              {sortedPaymentMethods.length === 0 ? (
                <div className="p-6 text-slate-600">
                  Encara no hi ha cobraments.
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {sortedPaymentMethods.map(([method, amount]) => (
                    <div
                      key={method}
                      className="flex items-center justify-between gap-4 p-5"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{method}</p>

                        <p className="text-sm text-slate-500">
                          {getPercent(amount, totalPaid)} del cobrat
                        </p>
                      </div>

                      <p className="text-xl font-bold text-green-700">
                        {formatCurrency(amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl bg-white shadow">
              <div className="border-b border-slate-200 p-6">
                <h2 className="text-2xl font-bold text-slate-900">
                  Despeses per forma de pagament
                </h2>
              </div>

              {sortedExpensePaymentMethods.length === 0 ? (
                <div className="p-6 text-slate-600">
                  Encara no hi ha despeses.
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {sortedExpensePaymentMethods.map(([method, amount]) => (
                    <div
                      key={method}
                      className="flex items-center justify-between gap-4 p-5"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{method}</p>

                        <p className="text-sm text-slate-500">
                          {getPercent(amount, totalExpenses)} del total
                        </p>
                      </div>

                      <p className="text-xl font-bold text-red-700">
                        {formatCurrency(amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow">
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Últimes despeses
              </h2>
            </div>

            {expenses.length === 0 ? (
              <div className="p-6 text-slate-600">
                Encara no hi ha despeses.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="border-b p-4">Data</th>
                      <th className="border-b p-4">Concepte</th>
                      <th className="border-b p-4">Categoria</th>
                      <th className="border-b p-4">Pagament</th>
                      <th className="border-b p-4">Import</th>
                    </tr>
                  </thead>

                  <tbody>
                    {expenses.slice(0, 20).map((expense) => (
                      <tr key={expense.id}>
                        <td className="border-b p-4">
                          {formatDate(expense.expense_date)}
                        </td>

                        <td className="border-b p-4">
                          {expense.concept || "-"}
                        </td>

                        <td className="border-b p-4">
                          {cleanText(expense.category, "Sense categoria")}
                        </td>

                        <td className="border-b p-4">
                          {cleanText(expense.payment_method, "Sense indicar")}
                        </td>

                        <td className="border-b p-4 font-bold text-red-700">
                          {formatCurrency(Number(expense.amount || 0))}
                        </td>
                      </tr>
                    ))}
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