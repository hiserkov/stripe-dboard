import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { rxPrescriptions, dispenseReports } from "@/db/schema";
import { and, gte, lte, ilike, or, desc, asc, count, eq } from "drizzle-orm";

export const runtime = "nodejs";

const VALID_LIMITS = new Set([25, 50, 100, 200]);

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const search = searchParams.get("search")?.trim() ?? "";
  const reportNumber = searchParams.get("report") ?? "all";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const rawLimit = parseInt(searchParams.get("limit") ?? "25", 10);
  const PAGE_SIZE = VALID_LIMITS.has(rawLimit) ? rawLimit : 25;

  const sortBy = searchParams.get("sortBy") === "line_number" ? "line_number" : "fill_date";
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  const filters = [];
  if (from) filters.push(gte(rxPrescriptions.fillDate, from));
  if (to) filters.push(lte(rxPrescriptions.fillDate, to));
  if (search) {
    filters.push(
      or(
        ilike(rxPrescriptions.patientName, `%${search}%`),
        ilike(rxPrescriptions.drugName, `%${search}%`),
        ilike(rxPrescriptions.rxNumber, `%${search}%`),
        ilike(rxPrescriptions.prescriberName, `%${search}%`)
      )
    );
  }
  if (reportNumber !== "all") {
    const report = await db
      .select({ id: dispenseReports.id })
      .from(dispenseReports)
      .where(eq(dispenseReports.reportNumber, reportNumber))
      .limit(1);
    if (report[0]) filters.push(eq(rxPrescriptions.reportId, report[0].id));
  }

  const whereClause = filters.length > 0 ? and(...filters) : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(rxPrescriptions)
    .where(whereClause);

  const rows = await db
    .select({
      id: rxPrescriptions.id,
      reportId: rxPrescriptions.reportId,
      lineNumber: rxPrescriptions.lineNumber,
      rxNumber: rxPrescriptions.rxNumber,
      patientName: rxPrescriptions.patientName,
      drugName: rxPrescriptions.drugName,
      quantity: rxPrescriptions.quantity,
      fillDate: rxPrescriptions.fillDate,
      pickup: rxPrescriptions.pickup,
      trackingNumber: rxPrescriptions.trackingNumber,
      prescriberName: rxPrescriptions.prescriberName,
      prescriberClinic: rxPrescriptions.prescriberClinic,
      clinicName: rxPrescriptions.clinicName,
      price: rxPrescriptions.price,
    })
    .from(rxPrescriptions)
    .where(whereClause)
    .orderBy(
      sortBy === "line_number"
        ? (sortDir === "asc" ? asc(rxPrescriptions.lineNumber) : desc(rxPrescriptions.lineNumber))
        : (sortDir === "asc" ? asc(rxPrescriptions.fillDate)   : desc(rxPrescriptions.fillDate)),
      // secondary sort always keeps rows stable
      sortBy === "line_number" ? asc(rxPrescriptions.fillDate) : asc(rxPrescriptions.lineNumber)
    )
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  // Fetch available reports for the filter dropdown
  const reports = await db
    .select({
      reportNumber: dispenseReports.reportNumber,
      dateRangeStart: dispenseReports.dateRangeStart,
      dateRangeEnd: dispenseReports.dateRangeEnd,
      prescriptionCount: dispenseReports.prescriptionCount,
    })
    .from(dispenseReports)
    .orderBy(desc(dispenseReports.generatedDate));

  return NextResponse.json({
    data: rows.map((r) => ({
      ...r,
      price: r.price != null ? Number(r.price) : null,
    })),
    reports,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total: Number(total),
      totalPages: Math.ceil(Number(total) / PAGE_SIZE),
    },
  });
}
