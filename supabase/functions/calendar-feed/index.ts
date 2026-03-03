import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STATUS_LABELS: Record<string, string> = {
  preparing: "Připravuje se",
  in_progress: "Běží",
  completed: "Dokončeno",
  paused: "Pozastaveno",
};

function toICSDate(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

function addOneDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function escapeICS(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");
}

function dtstamp(): string {
  return new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
}

interface Project {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  location?: string;
  status: string;
  budget?: number;
  budget_currency?: string;
}

interface Assignment {
  id: string;
  project_id: string;
  worker_id?: string | null;
}

interface Worker {
  id: string;
  first_name: string;
  last_name: string;
}

function buildICS(projects: Project[], assignments: Assignment[], workers: Worker[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Project Manager//CS",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Projekty",
    "X-WR-TIMEZONE:Europe/Prague",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
  ];

  const stamp = dtstamp();

  for (const project of projects) {
    if (!project.start_date || !project.end_date) continue;

    const dtStart = toICSDate(project.start_date);
    const dtEnd = toICSDate(addOneDay(project.end_date));

    const projectWorkers = assignments
      .filter((a) => a.project_id === project.id && a.worker_id)
      .map((a) => {
        const w = workers.find((w) => w.id === a.worker_id);
        return w ? `${w.first_name} ${w.last_name}` : null;
      })
      .filter(Boolean) as string[];

    const descParts: string[] = [
      `Lokalita: ${project.location || "—"}`,
      `Status: ${STATUS_LABELS[project.status] || project.status}`,
    ];
    if (project.budget) {
      descParts.push(
        `Rozpočet: ${project.budget.toLocaleString("cs-CZ")} ${project.budget_currency || "CZK"}`
      );
    }
    if (projectWorkers.length > 0) {
      descParts.push(`Montážníci: ${projectWorkers.join(", ")}`);
    }

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:project-${project.id}@pm`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
    lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
    lines.push(`SUMMARY:${escapeICS(project.name)}`);
    if (project.location) lines.push(`LOCATION:${escapeICS(project.location)}`);
    lines.push(`DESCRIPTION:${escapeICS(descParts.join("\n"))}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

Deno.serve(async (req) => {
  // CORS pre-flight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  // Volitelná ochrana tokenem
  // Nastav secret: Dashboard → Settings → Edge Functions → Secrets → CALENDAR_SECRET_TOKEN
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const expectedToken = Deno.env.get("CALENDAR_SECRET_TOKEN");

  if (expectedToken && token !== expectedToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Volitelný filtr statusů: ?statuses=preparing,in_progress
  const statusesParam = url.searchParams.get("statuses");
  const statusFilter = statusesParam
    ? statusesParam.split(",").map((s) => s.trim()).filter(Boolean)
    : null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let projectQuery = supabase
    .from("project")
    .select("id, name, start_date, end_date, location, status, budget, budget_currency")
    .order("start_date");

  if (statusFilter && statusFilter.length > 0) {
    projectQuery = projectQuery.in("status", statusFilter);
  }

  const [{ data: projects, error: pErr }, { data: assignments }, { data: workers }] =
    await Promise.all([
      projectQuery,
      supabase.from("assignment").select("id, project_id, worker_id"),
      supabase.from("worker").select("id, first_name, last_name"),
    ]);

  if (pErr) {
    return new Response("Error fetching projects: " + pErr.message, { status: 500 });
  }

  const ics = buildICS(projects || [], assignments || [], workers || []);

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar;charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache, no-store",
    },
  });
});
