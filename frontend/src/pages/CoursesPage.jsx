import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Plus, BookOpen, Pencil, Trash2, Clock, Users as UsersIcon, IndianRupee } from "lucide-react";
import { toast } from "sonner";

const empty = { code: "", name: "", duration_years: 4, total_seats: 60, fee_per_year: 0, description: "" };

export default function CoursesPage() {
  const { user } = useAuth();
  const canEdit = ["admin", "principal"].includes(user.role);
  const canDelete = user.role === "admin";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/courses");
      setRows(data);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (r) => { setEditing(r); setForm({ ...empty, ...r }); setOpen(true); };

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, duration_years: parseInt(form.duration_years) || 1, total_seats: parseInt(form.total_seats) || 0, fee_per_year: parseFloat(form.fee_per_year) || 0 };
      if (editing) await api.put(`/courses/${editing.id}`, payload);
      else await api.post("/courses", payload);
      toast.success(editing ? "Course updated" : "Course added");
      setOpen(false); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this course?")) return;
    try { await api.delete(`/courses/${id}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div className="space-y-6" data-testid="courses-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-blue-600 font-semibold">Academic Management</div>
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight font-medium text-slate-900 mt-1">Courses</h2>
          <p className="text-sm text-slate-500 mt-1">Nursing programs, syllabus and academic offerings.</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white" data-testid="add-course-button">
                <Plus className="h-4 w-4 mr-1.5" /> Add Course
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader><DialogTitle className="font-display">{editing ? "Edit Course" : "Add Course"}</DialogTitle></DialogHeader>
              <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Code *</Label><Input data-testid="course-code-input" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
                <div><Label>Course Name *</Label><Input data-testid="course-name-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Duration (years)</Label><Input type="number" value={form.duration_years} onChange={(e) => setForm({ ...form, duration_years: e.target.value })} /></div>
                <div><Label>Total Seats</Label><Input type="number" value={form.total_seats} onChange={(e) => setForm({ ...form, total_seats: e.target.value })} /></div>
                <div className="md:col-span-2"><Label>Fee per year (₹)</Label><Input type="number" value={form.fee_per_year} onChange={(e) => setForm({ ...form, fee_per_year: e.target.value })} /></div>
                <div className="md:col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <DialogFooter className="md:col-span-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white" data-testid="course-save-button">{editing ? "Save" : "Add"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map((i) => <div key={i} className="h-44 bg-white border border-slate-200 rounded-lg animate-pulse" />)}
        </div>
      ) : rows.length === 0 ? (
        <Card className="p-12 bg-white border border-slate-200 rounded-lg shadow-none">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 bg-teal-50 rounded-md flex items-center justify-center mb-3"><BookOpen className="h-5 w-5 text-teal-600" /></div>
            <div className="font-display font-medium text-slate-900">No courses yet</div>
            <div className="text-sm text-slate-500 mt-1">Add your first course to enroll students.</div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {rows.map((c) => (
            <Card key={c.id} className="p-5 bg-white border border-slate-200 rounded-lg shadow-none stat-card" data-testid={`course-card-${c.id}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 bg-teal-50 rounded-md flex items-center justify-center"><BookOpen className="h-5 w-5 text-teal-600" /></div>
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold bg-slate-50 px-2 py-1 rounded">{c.code}</span>
              </div>
              <h3 className="font-display text-base font-medium text-slate-900">{c.name}</h3>
              {c.description && <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{c.description}</p>}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100">
                <div className="flex flex-col items-start">
                  <Clock className="h-3.5 w-3.5 text-slate-400 mb-1" />
                  <div className="text-xs text-slate-500">Duration</div>
                  <div className="text-sm font-medium text-slate-900">{c.duration_years}y</div>
                </div>
                <div className="flex flex-col items-start">
                  <UsersIcon className="h-3.5 w-3.5 text-slate-400 mb-1" />
                  <div className="text-xs text-slate-500">Seats</div>
                  <div className="text-sm font-medium text-slate-900">{c.total_seats}</div>
                </div>
                <div className="flex flex-col items-start">
                  <IndianRupee className="h-3.5 w-3.5 text-slate-400 mb-1" />
                  <div className="text-xs text-slate-500">Fee/yr</div>
                  <div className="text-sm font-medium text-slate-900">{(c.fee_per_year || 0).toLocaleString("en-IN")}</div>
                </div>
              </div>
              {canEdit && (
                <div className="flex items-center justify-end gap-1 mt-4 pt-3 border-t border-slate-100">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(c)} data-testid={`course-edit-${c.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
                  {canDelete && <Button size="sm" variant="ghost" onClick={() => remove(c.id)} className="text-rose-600" data-testid={`course-delete-${c.id}`}><Trash2 className="h-3.5 w-3.5" /></Button>}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
