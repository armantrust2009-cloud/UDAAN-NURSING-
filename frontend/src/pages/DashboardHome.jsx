import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";
import {
  GraduationCap, Users, BookOpen, Wallet, CalendarCheck, TrendingUp, AlertCircle,
  MessageSquareDashed, ArrowRight, Phone
} from "lucide-react";

const INQUIRY_STATUS_STYLES = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  contacted: "bg-violet-50 text-violet-700 border-violet-200",
  visited: "bg-amber-50 text-amber-700 border-amber-200",
  admitted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  lost: "bg-rose-50 text-rose-700 border-rose-200",
};

const trendUp = "text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full w-fit border border-emerald-100";
const trendDown = "text-xs font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full w-fit border border-rose-100";

function StatCard({ icon: Icon, label, value, accent = "blue", trend, testid }) {
  const accents = {
    blue: { bg: "bg-blue-50", text: "text-blue-600" },
    teal: { bg: "bg-teal-50", text: "text-teal-600" },
    amber: { bg: "bg-amber-50", text: "text-amber-600" },
    rose: { bg: "bg-rose-50", text: "text-rose-600" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
    indigo: { bg: "bg-indigo-50", text: "text-indigo-600" },
  };
  const a = accents[accent] || accents.blue;
  return (
    <Card className="stat-card flex flex-col gap-3 p-5 bg-white border border-slate-200 rounded-lg shadow-none" data-testid={testid}>
      <div className="flex items-start justify-between">
        <div className={`h-10 w-10 rounded-md flex items-center justify-center ${a.bg}`}>
          <Icon className={`h-5 w-5 ${a.text}`} />
        </div>
        {trend && (
          <span className={trend.startsWith("-") ? trendDown : trendUp}>
            {!trend.startsWith("-") && "+"}{trend}
          </span>
        )}
      </div>
      <div>
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500 font-medium">{label}</div>
        <div className="text-3xl font-display font-semibold text-slate-900 mt-1">{value}</div>
      </div>
    </Card>
  );
}

const PIE_COLORS = ["#2563EB", "#0EA5E9", "#14B8A6", "#F59E0B", "#F43F5E"];

export default function DashboardHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/dashboard/stats")
      .then((r) => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return (
      <div className="space-y-6" data-testid="dashboard-loading">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map((i) => (
            <div key={i} className="h-32 bg-white border border-slate-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const fmtMoney = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;

  return (
    <div className="space-y-8" data-testid="dashboard-home">
      {/* Hero greeting */}
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-blue-600 font-semibold">
          Overview · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
        </div>
        <h2 className="font-display text-2xl sm:text-3xl tracking-tight font-medium text-slate-900 mt-1">
          Good day, {user?.name?.split(" ")[0] || "there"}.
        </h2>
        <p className="text-sm text-slate-500 mt-1.5">
          Here's a snapshot of your institute's current performance.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard icon={GraduationCap} label="Total Students" value={stats.students_count} accent="blue" trend="12%" testid="stat-students" />
        <StatCard icon={Users} label="Faculty Members" value={stats.faculty_count} accent="indigo" testid="stat-faculty" />
        <StatCard icon={MessageSquareDashed} label="Open Inquiries" value={stats.inquiries?.open || 0} accent="amber" testid="stat-inquiries" />
        <StatCard icon={CalendarCheck} label="Avg Attendance" value={`${stats.attendance_pct}%`} accent="emerald" trend="3.2%" testid="stat-attendance" />
      </div>

      {/* Fee row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <Card className="p-5 bg-white border border-slate-200 rounded-lg shadow-none" data-testid="stat-fees-collected">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500 font-medium">Fees Collected</div>
            <div className="h-9 w-9 rounded-md flex items-center justify-center bg-emerald-50">
              <Wallet className="h-4.5 w-4.5 text-emerald-600" />
            </div>
          </div>
          <div className="text-3xl font-display font-semibold text-slate-900">{fmtMoney(stats.fees_collected)}</div>
          <div className="text-xs text-emerald-700 mt-2 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Total revenue this academic year
          </div>
        </Card>

        <Card className="p-5 bg-white border border-slate-200 rounded-lg shadow-none" data-testid="stat-fees-pending">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500 font-medium">Pending Fees</div>
            <div className="h-9 w-9 rounded-md flex items-center justify-center bg-amber-50">
              <AlertCircle className="h-4.5 w-4.5 text-amber-600" />
            </div>
          </div>
          <div className="text-3xl font-display font-semibold text-slate-900">{fmtMoney(stats.fees_pending)}</div>
          <div className="text-xs text-amber-700 mt-2">Pending receivables to be collected</div>
        </Card>

        <Card className="p-5 bg-white border border-slate-200 rounded-lg shadow-none" data-testid="attendance-distribution-card">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500 font-medium mb-3">Attendance Distribution</div>
          {stats.attendance_dist && stats.attendance_dist.length > 0 ? (
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={stats.attendance_dist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} innerRadius={32}>
                  {stats.attendance_dist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[140px] flex items-center justify-center text-xs text-slate-400">No attendance data yet</div>
          )}
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <Card className="p-5 bg-white border border-slate-200 rounded-lg shadow-none" data-testid="chart-enrollment">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500 font-medium">Enrollment by Batch</div>
              <div className="font-display text-base font-medium text-slate-900 mt-0.5">Student admissions over years</div>
            </div>
          </div>
          {stats.enrollment.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.enrollment}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="year" stroke="#94A3B8" fontSize={12} />
                <YAxis stroke="#94A3B8" fontSize={12} />
                <Tooltip contentStyle={{ border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 12 }} />
                <Bar dataKey="students" fill="#2563EB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-xs text-slate-400">No enrollment data yet — add students to see trends</div>
          )}
        </Card>

        <Card className="p-5 bg-white border border-slate-200 rounded-lg shadow-none" data-testid="chart-fees">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500 font-medium">Fee Collection</div>
              <div className="font-display text-base font-medium text-slate-900 mt-0.5">Monthly revenue (last 6 months)</div>
            </div>
          </div>
          {stats.fee_chart.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={stats.fee_chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} />
                <YAxis stroke="#94A3B8" fontSize={12} />
                <Tooltip contentStyle={{ border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 12 }} formatter={(v) => fmtMoney(v)} />
                <Line type="monotone" dataKey="amount" stroke="#0EA5E9" strokeWidth={2.5} dot={{ fill: "#0EA5E9", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-xs text-slate-400">No fee collection data yet</div>
          )}
        </Card>
      </div>

      {/* Admissions Pipeline + Recent Inquiries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5" data-testid="dashboard-inquiries-section">
        {/* Pipeline funnel */}
        <Card className="p-5 bg-white border border-slate-200 rounded-lg shadow-none lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500 font-medium">Admissions Pipeline</div>
              <div className="font-display text-base font-medium text-slate-900 mt-0.5">
                {stats.inquiries?.total || 0} inquiries
              </div>
            </div>
            <Link to="/inquiries" className="text-xs text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2.5">
            {[
              { key: "new", label: "New", color: "bg-blue-500" },
              { key: "contacted", label: "Contacted", color: "bg-violet-500" },
              { key: "visited", label: "Visited", color: "bg-amber-500" },
              { key: "admitted", label: "Admitted", color: "bg-emerald-500" },
              { key: "lost", label: "Lost", color: "bg-rose-500" },
            ].map((s) => {
              const count = stats.inquiries?.by_status?.[s.key] || 0;
              const max = Math.max(1, ...Object.values(stats.inquiries?.by_status || { x: 1 }));
              const width = Math.round((count / max) * 100);
              return (
                <div key={s.key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600">{s.label}</span>
                    <span className="font-medium text-slate-900">{count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${s.color} rounded-full transition-all`} style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {stats.inquiries?.total > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-500">Conversion Rate</div>
              <div className="text-sm font-display font-semibold text-emerald-700">{stats.inquiries.conversion_rate}%</div>
            </div>
          )}
        </Card>

        {/* Recent inquiries list */}
        <Card className="p-5 bg-white border border-slate-200 rounded-lg shadow-none lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500 font-medium">Recent Inquiries</div>
              <div className="font-display text-base font-medium text-slate-900 mt-0.5">Latest admission leads</div>
            </div>
            <Link to="/inquiries" className="text-xs text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {stats.inquiries?.recent?.length > 0 ? (
            <ul className="divide-y divide-slate-100" data-testid="recent-inquiries-list">
              {stats.inquiries.recent.map((r) => (
                <li key={r.id} className="py-2.5 flex items-center gap-3" data-testid={`recent-inquiry-${r.id}`}>
                  <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-display font-medium text-sm flex-shrink-0">
                    {(r.name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 text-sm truncate">{r.name}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{r.phone}</span>
                      <span className="text-slate-300">·</span>
                      <span className="uppercase tracking-wider text-[10px]">{r.source}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className={INQUIRY_STATUS_STYLES[r.status] || ""}>
                    {r.status}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquareDashed className="h-7 w-7 text-slate-300 mb-2" />
              <div className="text-sm font-medium text-slate-700">No inquiries yet</div>
              <Link to="/inquiries" className="text-xs text-blue-600 hover:text-blue-700 mt-1.5">Add the first inquiry →</Link>
            </div>
          )}
        </Card>
      </div>

      {/* Showcase card */}
      <Card className="p-0 overflow-hidden bg-white border border-slate-200 rounded-lg shadow-none" data-testid="showcase-card">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="p-6 lg:p-8 flex flex-col justify-center">
            <div className="text-xs uppercase tracking-[0.2em] text-blue-600 font-semibold">Clinical Training</div>
            <h3 className="font-display text-xl sm:text-2xl tracking-tight font-medium text-slate-900 mt-2">
              Track hospital postings, internships and patient case logs in one place.
            </h3>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">
              Comprehensive clinical rotation planning with duty rosters, attendance, and practical record evaluation — ready for INC compliance.
            </p>
          </div>
          <div className="relative min-h-[220px]">
            <img
              src="https://images.pexels.com/photos/35645530/pexels-photo-35645530.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
              alt="Clinical training"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
