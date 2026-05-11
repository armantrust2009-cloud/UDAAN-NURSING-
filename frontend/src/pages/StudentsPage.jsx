import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, GraduationCap } from "lucide-react";
import { toast } from "sonner";

const empty = {
  name: "", email: "", phone: "", dob: "", gender: "Female",
  address: "", parent_name: "", parent_phone: "",
  course_id: "", batch_year: 2025, scholarship: 0, status: "active"
};

export default function StudentsPage() {
  const { user } = useAuth();
  const canEdit = ["admin", "principal"].includes(user.role);
  const canDelete = user.role === "admin";

  const [rows, setRows] = useState([]);
  const [courses, setCourses] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        api.get("/students", { params: q ? { q } : {} }),
        api.get("/courses"),
      ]);
      setRows(s.data);
      setCourses(c.data);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const handleSearch = (e) => { e.preventDefault(); load(); };

  const openCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || "", email: row.email || "", phone: row.phone || "",
      dob: row.dob || "", gender: row.gender || "Female",
      address: row.address || "", parent_name: row.parent_name || "",
      parent_phone: row.parent_phone || "", course_id: row.course_id || "",
      batch_year: row.batch_year || 2025, scholarship: row.scholarship || 0,
      status: row.status || "active", admission_no: row.admission_no || "",
    });
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, batch_year: parseInt(form.batch_year) || 2025, scholarship: parseFloat(form.scholarship) || 0 };
      if (editing) {
        await api.put(`/students/${editing.id}`, payload);
        toast.success("Student updated");
      } else {
        await api.post("/students", payload);
        toast.success("Student admitted");
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this student?")) return;
    try {
      await api.delete(`/students/${id}`);
      toast.success("Deleted");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const courseName = (id) => courses.find((c) => c.id === id)?.name || "—";

  return (
    <div className="space-y-6" data-testid="students-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-blue-600 font-semibold">Student Management</div>
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight font-medium text-slate-900 mt-1">Students</h2>
          <p className="text-sm text-slate-500 mt-1">Manage admissions, profiles, and academic records.</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white" data-testid="add-student-button">
                <Plus className="h-4 w-4 mr-1.5" /> New Admission
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" data-testid="student-dialog">
              <DialogHeader>
                <DialogTitle className="font-display">{editing ? "Edit Student" : "New Admission"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Full Name *</Label><Input data-testid="student-name-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Email *</Label><Input data-testid="student-email-input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>Date of Birth</Label><Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></div>
                <div>
                  <Label>Gender</Label>
                  <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm">
                    <option>Female</option><option>Male</option><option>Other</option>
                  </select>
                </div>
                <div>
                  <Label>Course</Label>
                  <select data-testid="student-course-select" value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })} className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm">
                    <option value="">-- Select course --</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div><Label>Batch Year</Label><Input type="number" value={form.batch_year} onChange={(e) => setForm({ ...form, batch_year: e.target.value })} /></div>
                <div><Label>Scholarship (₹)</Label><Input type="number" value={form.scholarship} onChange={(e) => setForm({ ...form, scholarship: e.target.value })} /></div>
                <div><Label>Parent Name</Label><Input value={form.parent_name} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} /></div>
                <div><Label>Parent Phone</Label><Input value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} /></div>
                <div className="md:col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <DialogFooter className="md:col-span-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white" data-testid="student-save-button">{editing ? "Save Changes" : "Admit Student"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="p-5 bg-white border border-slate-200 rounded-lg shadow-none">
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input data-testid="student-search-input" placeholder="Search by name, email, admission no..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Button type="submit" variant="outline">Search</Button>
        </form>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200">
                <TableHead>Admission #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-slate-500 py-8">Loading...</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={7}>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-12 w-12 bg-blue-50 rounded-md flex items-center justify-center mb-3"><GraduationCap className="h-5 w-5 text-blue-600" /></div>
                    <div className="font-display font-medium text-slate-900">No students yet</div>
                    <div className="text-sm text-slate-500 mt-1">Click "New Admission" to admit your first student.</div>
                  </div>
                </TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id} className="border-slate-100" data-testid={`student-row-${r.id}`}>
                  <TableCell className="font-medium text-slate-900">{r.admission_no || "—"}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell className="text-slate-600">{r.email}</TableCell>
                  <TableCell className="text-slate-600">{courseName(r.course_id)}</TableCell>
                  <TableCell>{r.batch_year || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={r.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600"}>
                      {r.status}
                    </Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(r)} data-testid={`student-edit-${r.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
                      {canDelete && <Button size="sm" variant="ghost" onClick={() => remove(r.id)} className="text-rose-600 hover:text-rose-700" data-testid={`student-delete-${r.id}`}><Trash2 className="h-3.5 w-3.5" /></Button>}
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
