import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarCheck, Check, X, Clock4 } from "lucide-react";
import { toast } from "sonner";

export default function AttendancePage() {
  const { user } = useAuth();
  const canMark = ["admin", "principal", "faculty"].includes(user.role);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState("class");
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({}); // id -> status
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [s, a] = await Promise.all([
        api.get("/students"),
        api.get("/attendance", { params: { date } })
      ]);
      setStudents(s.data);
      setRecords(a.data);
      const m = {};
      a.data.forEach((r) => { if (r.type === type) m[r.student_id] = r.status; });
      setMarks(m);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [date, type]);

  const setStatus = async (sid, status) => {
    setMarks((m) => ({ ...m, [sid]: status }));
    try {
      await api.post("/attendance", { student_id: sid, date, status, type });
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
      setMarks((m) => { const c = { ...m }; delete c[sid]; return c; });
    }
  };

  const bulkPresent = async () => {
    if (!canMark) return;
    try {
      await Promise.all(students.map((s) => api.post("/attendance", { student_id: s.id, date, status: "present", type })));
      toast.success("Marked all present");
      load();
    } catch (e) { toast.error("Some entries failed"); }
  };

  const statusBadge = (s) => {
    if (s === "present") return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Present</Badge>;
    if (s === "absent") return <Badge className="bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100">Absent</Badge>;
    if (s === "leave") return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">Leave</Badge>;
    return <Badge variant="outline" className="bg-slate-50 text-slate-500">Not marked</Badge>;
  };

  const stats = {
    present: Object.values(marks).filter((s) => s === "present").length,
    absent: Object.values(marks).filter((s) => s === "absent").length,
    leave: Object.values(marks).filter((s) => s === "leave").length,
  };

  return (
    <div className="space-y-6" data-testid="attendance-page">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-blue-600 font-semibold">Daily Tracking</div>
        <h2 className="font-display text-2xl sm:text-3xl tracking-tight font-medium text-slate-900 mt-1">Attendance</h2>
        <p className="text-sm text-slate-500 mt-1">Mark class and clinical attendance for students.</p>
      </div>

      <Card className="p-5 bg-white border border-slate-200 rounded-lg shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1 max-w-xs">
            <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Date</Label>
            <Input data-testid="attendance-date-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex-1 max-w-xs">
            <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Session Type</Label>
            <select data-testid="attendance-type-select" value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm">
              <option value="class">Class</option>
              <option value="clinical">Clinical</option>
            </select>
          </div>
          {canMark && (
            <Button onClick={bulkPresent} variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" data-testid="mark-all-present">
              <Check className="h-4 w-4 mr-1.5" /> Mark All Present
            </Button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-md">
            <div className="text-xs text-emerald-700 uppercase tracking-wider">Present</div>
            <div className="text-xl font-display font-semibold text-emerald-900">{stats.present}</div>
          </div>
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-md">
            <div className="text-xs text-rose-700 uppercase tracking-wider">Absent</div>
            <div className="text-xl font-display font-semibold text-rose-900">{stats.absent}</div>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-md">
            <div className="text-xs text-amber-700 uppercase tracking-wider">On Leave</div>
            <div className="text-xl font-display font-semibold text-amber-900">{stats.leave}</div>
          </div>
        </div>
      </Card>

      <Card className="p-5 bg-white border border-slate-200 rounded-lg shadow-none">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200">
                <TableHead>Admission #</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                {canMark && <TableHead className="text-right">Mark</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-slate-500 py-8">Loading...</TableCell></TableRow>
              ) : students.length === 0 ? (
                <TableRow><TableCell colSpan={4}>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-12 w-12 bg-blue-50 rounded-md flex items-center justify-center mb-3"><CalendarCheck className="h-5 w-5 text-blue-600" /></div>
                    <div className="font-display font-medium text-slate-900">No students to mark</div>
                    <div className="text-sm text-slate-500 mt-1">Add students first from the Students module.</div>
                  </div>
                </TableCell></TableRow>
              ) : students.map((s) => (
                <TableRow key={s.id} className="border-slate-100" data-testid={`attendance-row-${s.id}`}>
                  <TableCell className="text-slate-500 font-mono text-xs">{s.admission_no || "—"}</TableCell>
                  <TableCell className="font-medium text-slate-900">{s.name}</TableCell>
                  <TableCell>{statusBadge(marks[s.id])}</TableCell>
                  {canMark && (
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => setStatus(s.id, "present")} className="text-emerald-700 hover:bg-emerald-50" data-testid={`mark-present-${s.id}`}><Check className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setStatus(s.id, "absent")} className="text-rose-600 hover:bg-rose-50" data-testid={`mark-absent-${s.id}`}><X className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setStatus(s.id, "leave")} className="text-amber-700 hover:bg-amber-50" data-testid={`mark-leave-${s.id}`}><Clock4 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
