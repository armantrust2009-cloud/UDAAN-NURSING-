import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";
import {
  GraduationCap, Users, BookOpen, Wallet, CalendarCheck, TrendingUp, AlertCircle
} from "lucide-react";

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
        <StatCard icon={BookOpen} label="Active Courses" value={stats.courses_count} accent="teal" testid="stat-courses" />
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
