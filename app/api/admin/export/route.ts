import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

function text(value: any) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function numberValue(value: any) {
  const number = Number(value || 0);

  if (Number.isNaN(number)) {
    return 0;
  }

  return number;
}

function yesNo(value: any) {
  return value ? "Sí" : "No";
}

function formatDate(value: any) {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 10);
}

function fullName(participant: AnyRow | undefined) {
  if (!participant) {
    return "";
  }

  return `${text(participant.first_name)} ${text(participant.last_name)}`.trim();
}

function cleanSheetName(name: string) {
  return name.slice(0, 31);
}

function addSheet(workbook: XLSX.WorkBook, name: string, rows: AnyRow[]) {
  const worksheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{}]);

  const columnNames =
    rows.length > 0
      ? Object.keys(rows[0])
      : ["Sense dades"];

  worksheet["!cols"] = columnNames.map((columnName) => ({
    wch: Math.max(14, Math.min(35, columnName.length + 4)),
  }));

  XLSX.utils.book_append_sheet(workbook, worksheet, cleanSheetName(name));
}

async function fetchTable(tableName: string) {
  const { data, error } = await supabaseAdmin.from(tableName).select("*");

  if (error) {
    return {
      rows: [] as AnyRow[],
      error: {
        taula: tableName,
        error: error.message,
      },
    };
  }

  return {
    rows: (data || []) as AnyRow[],
    error: null,
  };
}

export async function GET() {
  try {
    const [
      participantsResult,
      tutorsResult,
      registrationsResult,
      weeksResult,
      paymentsResult,
      expensesResult,
      groupsResult,
      groupParticipantsResult,
      attendanceResult,
      incidentsResult,
    ] = await Promise.all([
      fetchTable("participants"),
      fetchTable("tutors"),
      fetchTable("registrations"),
      fetchTable("weeks"),
      fetchTable("payments"),
      fetchTable("expenses"),
      fetchTable("groups"),
      fetchTable("group_participants"),
      fetchTable("attendance"),
      fetchTable("incidents"),
    ]);

    const participants = participantsResult.rows;
    const tutors = tutorsResult.rows;
    const registrations = registrationsResult.rows;
    const weeks = weeksResult.rows;
    const payments = paymentsResult.rows;
    const expenses = expensesResult.rows;
    const groups = groupsResult.rows;
    const groupParticipants = groupParticipantsResult.rows;
    const attendance = attendanceResult.rows;
    const incidents = incidentsResult.rows;

    const exportErrors = [
      participantsResult.error,
      tutorsResult.error,
      registrationsResult.error,
      weeksResult.error,
      paymentsResult.error,
      expensesResult.error,
      groupsResult.error,
      groupParticipantsResult.error,
      attendanceResult.error,
      incidentsResult.error,
    ].filter(Boolean) as AnyRow[];

    const participantById = new Map<string, AnyRow>();
    participants.forEach((participant) => {
      participantById.set(text(participant.id), participant);
    });

    const tutorByParticipantId = new Map<string, AnyRow>();
    tutors.forEach((tutor) => {
      tutorByParticipantId.set(text(tutor.participant_id), tutor);
    });

    const weekById = new Map<string, AnyRow>();
    weeks.forEach((week) => {
      weekById.set(text(week.id), week);
    });

    const groupById = new Map<string, AnyRow>();
    groups.forEach((group) => {
      groupById.set(text(group.id), group);
    });

    const registrationsByParticipantId = new Map<string, AnyRow[]>();
    registrations.forEach((registration) => {
      const participantId = text(registration.participant_id);

      if (!registrationsByParticipantId.has(participantId)) {
        registrationsByParticipantId.set(participantId, []);
      }

      registrationsByParticipantId.get(participantId)?.push(registration);
    });

    const paymentsByParticipantId = new Map<string, AnyRow[]>();
    payments.forEach((payment) => {
      const participantId = text(payment.participant_id);

      if (!paymentsByParticipantId.has(participantId)) {
        paymentsByParticipantId.set(participantId, []);
      }

      paymentsByParticipantId.get(participantId)?.push(payment);
    });

    const totalExpected = registrations.reduce(
      (sum, registration) => sum + numberValue(registration.price),
      0
    );

    const totalPaid = payments.reduce(
      (sum, payment) => sum + numberValue(payment.amount),
      0
    );

    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + numberValue(expense.amount),
      0
    );

    const totalPending = Math.max(totalExpected - totalPaid, 0);
    const expectedResult = totalExpected - totalExpenses;
    const realResult = totalPaid - totalExpenses;

    const participantsWithDebt = participants.filter((participant) => {
      const participantRegistrations =
        registrationsByParticipantId.get(text(participant.id)) || [];

      const participantPayments =
        paymentsByParticipantId.get(text(participant.id)) || [];

      const expected = participantRegistrations.reduce(
        (sum, registration) => sum + numberValue(registration.price),
        0
      );

      const paid = participantPayments.reduce(
        (sum, payment) => sum + numberValue(payment.amount),
        0
      );

      return expected > paid;
    }).length;

    const participantsWithAlerts = participants.filter((participant) => {
      return Boolean(
        text(participant.allergies).trim() ||
          text(participant.medical_notes).trim() ||
          text(participant.comments).trim()
      );
    }).length;

    const workbook = XLSX.utils.book_new();

    addSheet(workbook, "Resum", [
      {
        Concepte: "Participants",
        Valor: participants.length,
      },
      {
        Concepte: "Inscripcions setmanals",
        Valor: registrations.length,
      },
      {
        Concepte: "Ingressos previstos",
        Valor: totalExpected,
      },
      {
        Concepte: "Ingressos cobrats",
        Valor: totalPaid,
      },
      {
        Concepte: "Pendent de cobrar",
        Valor: totalPending,
      },
      {
        Concepte: "Famílies pendents",
        Valor: participantsWithDebt,
      },
      {
        Concepte: "Despeses",
        Valor: totalExpenses,
      },
      {
        Concepte: "Resultat previst",
        Valor: expectedResult,
      },
      {
        Concepte: "Resultat real cobrat",
        Valor: realResult,
      },
      {
        Concepte: "Participants amb observacions",
        Valor: participantsWithAlerts,
      },
      {
        Concepte: "Incidències registrades",
        Valor: incidents.length,
      },
    ]);

    const participantsSheet = participants
      .map((participant) => {
        const tutor = tutorByParticipantId.get(text(participant.id));
        const participantRegistrations =
          registrationsByParticipantId.get(text(participant.id)) || [];

        const participantPayments =
          paymentsByParticipantId.get(text(participant.id)) || [];

        const participantWeeks = participantRegistrations
          .map((registration) => weekById.get(text(registration.week_id)))
          .filter(Boolean)
          .map((week) => text(week?.name))
          .join(", ");

        const expected = participantRegistrations.reduce(
          (sum, registration) => sum + numberValue(registration.price),
          0
        );

        const paid = participantPayments.reduce(
          (sum, payment) => sum + numberValue(payment.amount),
          0
        );

        const pending = Math.max(expected - paid, 0);

        return {
          ID: text(participant.id),
          Nom: text(participant.first_name),
          Cognoms: text(participant.last_name),
          "Nom complet": fullName(participant),
          "Data naixement": formatDate(participant.birth_date),
          Poble: text(participant.city),
          Talla: text(participant.shirt_size),
          "Setmanes inscrites": participantWeeks,
          "Total a pagar": expected,
          "Total pagat": paid,
          "Pendent": pending,
          "Tutor": text(tutor?.tutor_name),
          "Telèfon 1": text(tutor?.phone_1),
          "Telèfon 2": text(tutor?.phone_2),
          Email: text(tutor?.email),
          "Al·lèrgies": text(participant.allergies),
          "Informació mèdica": text(participant.medical_notes),
          Comentaris: text(participant.comments),
          "Samarreta entregada": yesNo(participant.shirt_delivered),
          "Data entrega samarreta": formatDate(participant.shirt_delivered_date),
          "Notes samarreta": text(participant.shirt_notes),
          "Creat el": text(participant.created_at),
        };
      })
      .sort((a, b) =>
        `${a.Cognoms} ${a.Nom}`.localeCompare(`${b.Cognoms} ${b.Nom}`)
      );

    addSheet(workbook, "Participants", participantsSheet);

    const tutorsSheet = tutors
      .map((tutor) => {
        const participant = participantById.get(text(tutor.participant_id));

        return {
          "Participant": fullName(participant),
          "Tutor": text(tutor.tutor_name),
          "Telèfon 1": text(tutor.phone_1),
          "Telèfon 2": text(tutor.phone_2),
          Email: text(tutor.email),
          "Participant ID": text(tutor.participant_id),
        };
      })
      .sort((a, b) => a.Participant.localeCompare(b.Participant));

    addSheet(workbook, "Tutors", tutorsSheet);

    const registrationsSheet = registrations
      .map((registration) => {
        const participant = participantById.get(text(registration.participant_id));
        const week = weekById.get(text(registration.week_id));

        return {
          "Participant": fullName(participant),
          "Setmana": text(week?.name),
          "Inici setmana": formatDate(week?.start_date),
          "Final setmana": formatDate(week?.end_date),
          Preu: numberValue(registration.price),
          "Estat pagament antic": text(registration.payment_status),
          "Registration ID": text(registration.id),
          "Participant ID": text(registration.participant_id),
          "Week ID": text(registration.week_id),
        };
      })
      .sort((a, b) => {
        const weekCompare = a["Inici setmana"].localeCompare(b["Inici setmana"]);

        if (weekCompare !== 0) {
          return weekCompare;
        }

        return a.Participant.localeCompare(b.Participant);
      });

    addSheet(workbook, "Inscripcions", registrationsSheet);

    const weeksSheet = weeks
      .map((week) => {
        const weekRegistrations = registrations.filter(
          (registration) => text(registration.week_id) === text(week.id)
        );

        const weekTotal = weekRegistrations.reduce(
          (sum, registration) => sum + numberValue(registration.price),
          0
        );

        return {
          Setmana: text(week.name),
          "Data inici": formatDate(week.start_date),
          "Data final": formatDate(week.end_date),
          Activa: yesNo(week.active),
          Preu: numberValue(week.price),
          "Participants inscrits": weekRegistrations.length,
          "Ingressos previstos": weekTotal,
          "Week ID": text(week.id),
        };
      })
      .sort((a, b) => a["Data inici"].localeCompare(b["Data inici"]));

    addSheet(workbook, "Setmanes", weeksSheet);

    const paymentsSheet = payments
      .map((payment) => {
        const participant = participantById.get(text(payment.participant_id));

        return {
          "Participant": fullName(participant),
          Import: numberValue(payment.amount),
          Data: formatDate(payment.payment_date),
          "Forma pagament": text(payment.payment_method),
          Notes: text(payment.notes),
          "Creat el": text(payment.created_at),
          "Payment ID": text(payment.id),
          "Participant ID": text(payment.participant_id),
        };
      })
      .sort((a, b) => b.Data.localeCompare(a.Data));

    addSheet(workbook, "Pagaments", paymentsSheet);

    const pendingSheet = participants
      .map((participant) => {
        const tutor = tutorByParticipantId.get(text(participant.id));
        const participantRegistrations =
          registrationsByParticipantId.get(text(participant.id)) || [];

        const participantPayments =
          paymentsByParticipantId.get(text(participant.id)) || [];

        const participantWeeks = participantRegistrations
          .map((registration) => weekById.get(text(registration.week_id)))
          .filter(Boolean)
          .map((week) => text(week?.name))
          .join(", ");

        const expected = participantRegistrations.reduce(
          (sum, registration) => sum + numberValue(registration.price),
          0
        );

        const paid = participantPayments.reduce(
          (sum, payment) => sum + numberValue(payment.amount),
          0
        );

        const pending = Math.max(expected - paid, 0);

        return {
          Participant: fullName(participant),
          Tutor: text(tutor?.tutor_name),
          "Telèfon": text(tutor?.phone_1 || tutor?.phone_2),
          Email: text(tutor?.email),
          Setmanes: participantWeeks,
          "Total a pagar": expected,
          Pagat: paid,
          Pendent: pending,
        };
      })
      .filter((row) => row.Pendent > 0)
      .sort((a, b) => b.Pendent - a.Pendent);

    addSheet(workbook, "Pendents cobrament", pendingSheet);

    const expensesSheet = expenses
      .map((expense) => ({
        Data: formatDate(expense.expense_date),
        Concepte: text(expense.concept),
        Categoria: text(expense.category),
        Import: numberValue(expense.amount),
        "Forma pagament": text(expense.payment_method),
        Notes: text(expense.notes),
        "Creat el": text(expense.created_at),
        "Expense ID": text(expense.id),
      }))
      .sort((a, b) => b.Data.localeCompare(a.Data));

    addSheet(workbook, "Despeses", expensesSheet);

    const groupsSheet = groups
      .map((group) => {
        const week = weekById.get(text(group.week_id));

        const members = groupParticipants.filter(
          (groupParticipant) => text(groupParticipant.group_id) === text(group.id)
        );

        return {
          Grup: text(group.name || group.group_name || group.title),
          Setmana: text(week?.name),
          "Data inici setmana": formatDate(week?.start_date),
          "Participants al grup": members.length,
          Notes: text(group.notes),
          "Group ID": text(group.id),
          "Week ID": text(group.week_id),
        };
      })
      .sort((a, b) => {
        const weekCompare = a["Data inici setmana"].localeCompare(
          b["Data inici setmana"]
        );

        if (weekCompare !== 0) {
          return weekCompare;
        }

        return a.Grup.localeCompare(b.Grup);
      });

    addSheet(workbook, "Grups", groupsSheet);

    const groupParticipantsSheet = groupParticipants
      .map((groupParticipant) => {
        const participant = participantById.get(
          text(groupParticipant.participant_id)
        );

        const group = groupById.get(text(groupParticipant.group_id));
        const week = weekById.get(text(group?.week_id));

        return {
          Grup: text(group?.name || group?.group_name || group?.title),
          Setmana: text(week?.name),
          Participant: fullName(participant),
          "Group participant ID": text(groupParticipant.id),
          "Group ID": text(groupParticipant.group_id),
          "Participant ID": text(groupParticipant.participant_id),
        };
      })
      .sort((a, b) => {
        const groupCompare = a.Grup.localeCompare(b.Grup);

        if (groupCompare !== 0) {
          return groupCompare;
        }

        return a.Participant.localeCompare(b.Participant);
      });

    addSheet(workbook, "Participants grups", groupParticipantsSheet);

    const attendanceSheet = attendance
      .map((attendanceRow) => {
        const participant = participantById.get(text(attendanceRow.participant_id));
        const week = weekById.get(text(attendanceRow.week_id));

        return {
          Participant: fullName(participant),
          Setmana: text(week?.name),
          Data: formatDate(
            attendanceRow.attendance_date ||
              attendanceRow.date ||
              attendanceRow.day
          ),
          Estat: text(attendanceRow.status),
          Present: yesNo(attendanceRow.present),
          Notes: text(attendanceRow.notes),
          "Attendance ID": text(attendanceRow.id),
          "Participant ID": text(attendanceRow.participant_id),
          "Week ID": text(attendanceRow.week_id),
        };
      })
      .sort((a, b) => {
        const dateCompare = a.Data.localeCompare(b.Data);

        if (dateCompare !== 0) {
          return dateCompare;
        }

        return a.Participant.localeCompare(b.Participant);
      });

    addSheet(workbook, "Assistencia", attendanceSheet);

    const incidentsSheet = incidents
      .map((incident) => {
        const participant = participantById.get(text(incident.participant_id));
        const tutor = tutorByParticipantId.get(text(incident.participant_id));

        return {
          Participant: fullName(participant),
          Data: formatDate(incident.incident_date),
          Tipus: text(incident.incident_type),
          Descripció: text(incident.description),
          "Família avisada": yesNo(incident.family_notified),
          "Notes internes": text(incident.internal_notes),
          Tutor: text(tutor?.tutor_name),
          Telèfon: text(tutor?.phone_1 || tutor?.phone_2),
          Email: text(tutor?.email),
          "Creat el": text(incident.created_at),
          "Incident ID": text(incident.id),
          "Participant ID": text(incident.participant_id),
        };
      })
      .sort((a, b) => b.Data.localeCompare(a.Data));

    addSheet(workbook, "Incidencies", incidentsSheet);

    const shirtsSheet = participants
      .map((participant) => {
        const tutor = tutorByParticipantId.get(text(participant.id));
        const participantRegistrations =
          registrationsByParticipantId.get(text(participant.id)) || [];

        const participantWeeks = participantRegistrations
          .map((registration) => weekById.get(text(registration.week_id)))
          .filter(Boolean)
          .map((week) => text(week?.name))
          .join(", ");

        return {
          Participant: fullName(participant),
          Talla: text(participant.shirt_size),
          "Samarreta entregada": yesNo(participant.shirt_delivered),
          "Data entrega": formatDate(participant.shirt_delivered_date),
          "Notes samarreta": text(participant.shirt_notes),
          Tutor: text(tutor?.tutor_name),
          Telèfon: text(tutor?.phone_1 || tutor?.phone_2),
          Setmanes: participantWeeks,
        };
      })
      .sort((a, b) => {
        if (a["Samarreta entregada"] !== b["Samarreta entregada"]) {
          return a["Samarreta entregada"] === "No" ? -1 : 1;
        }

        return a.Talla.localeCompare(b.Talla);
      });

    addSheet(workbook, "Samarretes", shirtsSheet);

    const alertsSheet = participants
      .map((participant) => {
        const tutor = tutorByParticipantId.get(text(participant.id));
        const participantRegistrations =
          registrationsByParticipantId.get(text(participant.id)) || [];

        const participantWeeks = participantRegistrations
          .map((registration) => weekById.get(text(registration.week_id)))
          .filter(Boolean)
          .map((week) => text(week?.name))
          .join(", ");

        return {
          Participant: fullName(participant),
          "Al·lèrgies": text(participant.allergies),
          "Informació mèdica": text(participant.medical_notes),
          Comentaris: text(participant.comments),
          Tutor: text(tutor?.tutor_name),
          Telèfon: text(tutor?.phone_1 || tutor?.phone_2),
          Email: text(tutor?.email),
          Setmanes: participantWeeks,
        };
      })
      .filter(
        (row) =>
          row["Al·lèrgies"].trim() ||
          row["Informació mèdica"].trim() ||
          row.Comentaris.trim()
      )
      .sort((a, b) => a.Participant.localeCompare(b.Participant));

    addSheet(workbook, "Observacions", alertsSheet);

    const paymentMethodsSummary = payments.reduce<Record<string, number>>(
      (groups, payment) => {
        const method = text(payment.payment_method).trim() || "Sense indicar";

        if (!groups[method]) {
          groups[method] = 0;
        }

        groups[method] += numberValue(payment.amount);

        return groups;
      },
      {}
    );

    const expensesCategoriesSummary = expenses.reduce<Record<string, number>>(
      (groups, expense) => {
        const category = text(expense.category).trim() || "Sense categoria";

        if (!groups[category]) {
          groups[category] = 0;
        }

        groups[category] += numberValue(expense.amount);

        return groups;
      },
      {}
    );

    const paymentMethodsRows = Object.entries(paymentMethodsSummary)
      .map(([method, amount]) => ({
        "Forma de pagament": method,
        Import: amount,
      }))
      .sort((a, b) => b.Import - a.Import);

    const expenseCategoryRows = Object.entries(expensesCategoriesSummary)
      .map(([category, amount]) => ({
        Categoria: category,
        Import: amount,
      }))
      .sort((a, b) => b.Import - a.Import);

    addSheet(workbook, "Resum cobraments", paymentMethodsRows);
    addSheet(workbook, "Resum despeses", expenseCategoryRows);

    if (exportErrors.length > 0) {
      addSheet(workbook, "Errors exportacio", exportErrors);
    }

    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const today = new Date().toISOString().slice(0, 10);
    const filename = `campus-cadaques-export-${today}.xlsx`;

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error exportant Excel:", error);

    return NextResponse.json(
      {
        error: "Error exportant l'Excel.",
      },
      { status: 500 }
    );
  }
}