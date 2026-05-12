import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Plus, Search, Pencil, Trash2, MessageSquareDashed, Phone, Mail,
  ArrowRight, UserPlus, Sparkles, TrendingUp
} from "lucide-react";
import { toast } from "sonner";

const STATUSES = [
  { value: "new", label: "New", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "contacted", label: "Contacted", color: "bg-violet-50 text-violet-700 border-violet-200" },
  { value: "visited", label: "Visited", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "admitted", label: "Admitted", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "lost", label: "Lost", color: "bg-rose-50 text-rose-700 border-rose-200" },
];

const SOURCES = ["walk-in", "website", "referral", "social", "call"];

const empty = {
  name: "", phone: "", email: "", course_interest: "",
  source: "walk-in", notes: "", status: "new",
  follow_up_date: "", assigned_to: "",
};

const statusBadge = (s) => {
  const item = STATUSES.find((x) => x.value === s) || STATUSES[0];
  return <Badge variant="outline" className={item.color}>{item.label}</Badge>;
};

export default function InquiriesPage() {
  const { user } = useAuth();
  const canEdit = ["admin", "principal", "faculty"].includes(user.role);
  const canConvert = ["admin", "principal"].includes(user.role);
  const canDelete = user.role === "admin";

  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    setLoading(true);
    try {
      const params = filter === "all" ? {} : { status_: filter };
      if (q) params.q = q;
      const [i, s, c] = await Promise.all([
        api.get("/inquiries", { params }),
        api.get("/inquiries/stats"),
        api.get("/courses"),
      ]);
      setRows(i.data);
      setStats(s.data);
      setCourses(c.data);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const openCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (r) => { setEditing(r); setForm({ ...empty, ...r }); setOpen(true); };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/inquiries/${editing.id}`, form);
      else await api.post("/inquiries", form);
      toast.success(editing ? "Inquiry updated" : "Inquiry added");
      setOpen(false); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const changeStatus = async (id, status) => {
    try {
      await api.post(`/inquiries/${id}/status`, { status, notes: "" });
      toast.success(`Marked as ${status}`);
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const convert = async (id) => {
    if (!window.confirm("Convert this inquiry into an admitted student?")) return;
    try {
      const { data } = await api.post(`/inquiries/${id}/convert`);
      toast.success(`Converted! Admission no: ${data.student.admission_no}`);
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this inquiry?")) return;
    try { await api.delete(`/inquiries/${id}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div className="space-y-6" data-testid="inquiries-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-blue-600 font-semibold">Admissions Pipeline</div>
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight font-medium text-slate-900 mt-1">Inquiries</h2>
          <p className="text-sm text-slate-500 mt-1">Track prospective student leads from first contact to admission.</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white" data-testid="add-inquiry-button">
                <Plus className="h-4 w-4 mr-1.5" /> New Inquiry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader><DialogTitle className="font-display">{editing ? "Edit Inquiry" : "New Inquiry"}</DialogTitle></DialogHeader>
              <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Full Name *</Label><Input data-testid="inquiry-name-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Phone *</Label><Input data-testid="inquiry-phone-input" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div>
                  <Label>Course Interest</Label>
                  <select value={form.course_interest} onChange={(e) => setForm({ ...form, course_interest: e.target.value })} className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm">
                    <option value="">—</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Source</Label>
                  <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm">
                    {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Status</Label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm">
                    {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div><Label>Follow-up Date</Label><Input type="date" value={form.follow_up_date} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} /></div>
                <div><Label>Assigned To</Label><Input value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} placeholder="Staff name" /></div>
                <div className="md:col-span-2">
                  <Label>Notes</Label>
                  <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Conversation summary, requirements..." />
                </div>
                <DialogFooter className="md:col-span-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white" data-testid="inquiry-save-button">{editing ? "Save" : "Add Inquiry"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Pipeline stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="inquiry-stats">
          <Card className="p-4 bg-white border border-slate-200 rounded-lg shadow-none">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500 font-medium"><Sparkles className="h-3.5 w-3.5" /> Total</div>
            <div className="text-2xl font-display font-semibold text-slate-900 mt-1">{stats.total}</div>
          </Card>
          {STATUSES.map((s) => (
            <Card key={s.value} className="p-4 bg-white border border-slate-200 rounded-lg shadow-none">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500 font-medium">{s.label}</div>
              <div className="text-2xl font-display font-semibold text-slate-900 mt-1">{stats[s.value] || 0}</div>
            </Card>
          ))}
        </div>
      )}

      {stats && stats.total > 0 && (
        <Card className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-lg shadow-none flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-emerald-100 flex items-center justify-center"><TrendingUp className="h-4.5 w-4.5 text-emerald-700" /></div>
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-emerald-800 font-medium">Conversion Rate</div>
            <div className="font-display text-lg font-medium text-slate-900">{stats.conversion_rate}% of inquiries converted to admissions</div>
          </div>
        </Card>
      )}

      <Card className="p-5 bg-white border border-slate-200 rounded-lg shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input data-testid="inquiry-search-input" placeholder="Search by name, phone, email..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
            <Button type="submit" variant="outline">Search</Button>
          </form>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {["all", ...STATUSES.map((s) => s.value)].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                data-testid={`inquiry-filter-${f}`}
                className={`px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors ${filter === f ? "bg-[#0F2C59] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
              >
                {f === "all" ? "All" : STATUSES.find((s) => s.value === f)?.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200">
                <TableHead>Prospect</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Follow-up</TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-slate-500 py-8">Loading...</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={7}>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-12 w-12 bg-blue-50 rounded-md flex items-center justify-center mb-3"><MessageSquareDashed className="h-5 w-5 text-blue-600" /></div>
                    <div className="font-display font-medium text-slate-900">No inquiries yet</div>
                    <div className="text-sm text-slate-500 mt-1">Capture your first admission lead to start the pipeline.</div>
                  </div>
                </TableCell></TableRow>
              ) : rows.map((r) => {
                const course = courses.find((c) => c.id === r.course_interest);
                return (
                  <TableRow key={r.id} className="border-slate-100" data-testid={`inquiry-row-${r.id}`}>
                    <TableCell>
                      <div className="font-medium text-slate-900">{r.name}</div>
                      {r.assigned_to && <div className="text-xs text-slate-500">Assigned · {r.assigned_to}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-700 flex items-center gap-1.5"><Phone className="h-3 w-3 text-slate-400" />{r.phone}</div>
                      {r.email && <div className="text-xs text-slate-500 flex items-center gap-1.5"><Mail className="h-3 w-3 text-slate-400" />{r.email}</div>}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{course?.name || "—"}</TableCell>
                    <TableCell className="text-xs uppercase tracking-wider text-slate-500">{r.source}</TableCell>
                    <TableCell>
                      {canEdit ? (
                        <select
                          value={r.status}
                          onChange={(e) => changeStatus(r.id, e.target.value)}
                          data-testid={`inquiry-status-${r.id}`}
                          className="bg-white border border-slate-200 rounded-md px-2 py-1 text-xs"
                        >
                          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      ) : statusBadge(r.status)}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{r.follow_up_date || "—"}</TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        {canConvert && r.status !== "admitted" && r.status !== "lost" && (
                          <Button size="sm" variant="outline" onClick={() => convert(r.id)} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" title="Convert to student" data-testid={`inquiry-convert-${r.id}`}>
                            <UserPlus className="h-3.5 w-3.5 mr-1" /> Convert
                          </Button>
                        )}
                        {r.converted_student_id && (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 mr-1.5 inline-flex items-center gap-1">
                            <ArrowRight className="h-3 w-3" /> Admitted
                          </Badge>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => openEdit(r)} data-testid={`inquiry-edit-${r.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
                        {canDelete && <Button size="sm" variant="ghost" onClick={() => remove(r.id)} className="text-rose-600" data-testid={`inquiry-delete-${r.id}`}><Trash2 className="h-3.5 w-3.5" /></Button>}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
