import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import {
  Plus, Pencil, Trash2, BookText, ChevronRight, GraduationCap, Clock, CheckCircle2,
  Circle, Loader2, X, Tag
} from "lucide-react";
import { toast } from "sonner";

const UNIT_STATUSES = [
  { value: "planned", label: "Planned", icon: Circle, color: "text-slate-500", badge: "bg-slate-50 text-slate-700 border-slate-200" },
  { value: "in-progress", label: "In progress", icon: Loader2, color: "text-amber-600", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "completed", label: "Completed", icon: CheckCircle2, color: "text-emerald-600", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
];

const emptySubject = { name: "", code: "", course_id: "", faculty_id: "", semester: 1, total_hours: 60, credits: 4, description: "" };
const emptyUnit = { unit_no: 1, title: "", topics: [], hours: 8, status: "planned", notes: "" };

function SubjectDialog({ open, onOpenChange, editing, form, setForm, onSave, courses, faculty }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle className="font-display">{editing ? "Edit Subject" : "Add Subject"}</DialogTitle></DialogHeader>
        <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><Label>Subject Name *</Label><Input data-testid="subject-name-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Anatomy & Physiology" /></div>
          <div><Label>Code *</Label><Input data-testid="subject-code-input" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="BN101" /></div>
          <div><Label>Semester</Label><Input type="number" min="1" max="10" value={form.semester} onChange={(e) => setForm({ ...form, semester: parseInt(e.target.value) || 1 })} /></div>
          <div>
            <Label>Course *</Label>
            <select data-testid="subject-course-select" required value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })} className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm">
              <option value="">-- Select course --</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Faculty (assigned)</Label>
            <select data-testid="subject-faculty-select" value={form.faculty_id} onChange={(e) => setForm({ ...form, faculty_id: e.target.value })} className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm">
              <option value="">— Unassigned —</option>
              {faculty.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.designation})</option>)}
            </select>
          </div>
          <div><Label>Total Hours</Label><Input type="number" value={form.total_hours} onChange={(e) => setForm({ ...form, total_hours: parseInt(e.target.value) || 0 })} /></div>
          <div><Label>Credits</Label><Input type="number" value={form.credits} onChange={(e) => setForm({ ...form, credits: parseInt(e.target.value) || 0 })} /></div>
          <div className="md:col-span-2"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <DialogFooter className="md:col-span-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white" data-testid="subject-save-button">{editing ? "Save" : "Add Subject"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UnitDialog({ open, onOpenChange, editing, form, setForm, onSave }) {
  const [topicDraft, setTopicDraft] = useState("");
  const addTopic = () => {
    if (!topicDraft.trim()) return;
    setForm({ ...form, topics: [...(form.topics || []), topicDraft.trim()] });
    setTopicDraft("");
  };
  const removeTopic = (i) => {
    const next = [...(form.topics || [])];
    next.splice(i, 1);
    setForm({ ...form, topics: next });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle className="font-display">{editing ? "Edit Unit" : "Add Syllabus Unit"}</DialogTitle></DialogHeader>
        <form onSubmit={onSave} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Unit No.</Label><Input type="number" min="1" value={form.unit_no} onChange={(e) => setForm({ ...form, unit_no: parseInt(e.target.value) || 1 })} /></div>
            <div className="col-span-2"><Label>Title *</Label><Input data-testid="unit-title-input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Cardiovascular System" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Hours allotted</Label><Input type="number" value={form.hours} onChange={(e) => setForm({ ...form, hours: parseInt(e.target.value) || 0 })} /></div>
            <div>
              <Label>Status</Label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm">
                {UNIT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label>Topics</Label>
            <div className="flex gap-2 mt-1.5">
              <Input value={topicDraft} onChange={(e) => setTopicDraft(e.target.value)} placeholder="Add a topic and press Enter" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTopic(); } }} data-testid="unit-topic-input" />
              <Button type="button" variant="outline" onClick={addTopic} data-testid="unit-topic-add"><Plus className="h-3.5 w-3.5" /></Button>
            </div>
            {form.topics?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {form.topics.map((t, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-md text-xs">
                    <Tag className="h-3 w-3" /> {t}
                    <button type="button" onClick={() => removeTopic(i)} className="hover:text-rose-600"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white" data-testid="unit-save-button">{editing ? "Save" : "Add Unit"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubjectDetail({ subject, canEdit, onClose, faculty, onSubjectChange }) {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyUnit);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/subjects/${subject.id}/units`);
      setUnits(data);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [subject.id]);

  const openCreate = () => { setEditing(null); setForm({ ...emptyUnit, unit_no: (units.length || 0) + 1 }); setOpen(true); };
  const openEdit = (u) => { setEditing(u); setForm({ ...emptyUnit, ...u, topics: u.topics || [] }); setOpen(true); };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/units/${editing.id}`, { ...form, subject_id: subject.id });
      else await api.post(`/subjects/${subject.id}/units`, form);
      toast.success(editing ? "Unit updated" : "Unit added");
      setOpen(false); load(); onSubjectChange?.();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const setStatus = async (id, status) => {
    try {
      await api.post(`/units/${id}/status`, { status });
      toast.success(`Marked ${status}`);
      load(); onSubjectChange?.();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this unit?")) return;
    try { await api.delete(`/units/${id}`); toast.success("Deleted"); load(); onSubjectChange?.(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const completed = units.filter((u) => u.status === "completed").length;
  const totalHours = units.reduce((s, u) => s + (u.hours || 0), 0);
  const pct = units.length ? Math.round((completed / units.length) * 100) : 0;

  return (
    <Card className="p-6 bg-white border border-slate-200 rounded-lg shadow-none" data-testid="subject-detail">
      <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{subject.code}</span>
            <span className="text-xs text-slate-500">Sem {subject.semester}</span>
            <span className="text-xs text-slate-500">· {subject.credits} credits</span>
            <span className="text-xs text-slate-500">· {subject.total_hours}h total</span>
          </div>
          <h3 className="font-display text-xl font-medium text-slate-900 mt-1.5">{subject.name}</h3>
          {subject.description && <p className="text-sm text-slate-500 mt-1.5">{subject.description}</p>}
          <div className="mt-2 text-xs text-slate-600">
            Faculty: {subject.faculty_name ? <span className="text-slate-900 font-medium">{subject.faculty_name}</span> : <span className="text-amber-700">Unassigned</span>}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>

      <div className="grid grid-cols-3 gap-3 my-5">
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-md">
          <div className="text-xs uppercase tracking-wider text-slate-500">Total Units</div>
          <div className="text-2xl font-display font-semibold text-slate-900">{units.length}</div>
        </div>
        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-md">
          <div className="text-xs uppercase tracking-wider text-emerald-700">Completed</div>
          <div className="text-2xl font-display font-semibold text-emerald-900">{completed}</div>
        </div>
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-md">
          <div className="text-xs uppercase tracking-wider text-blue-700">Hours covered</div>
          <div className="text-2xl font-display font-semibold text-blue-900">{totalHours}<span className="text-sm font-normal">h</span></div>
        </div>
      </div>

      <div className="mb-5">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span>Syllabus Progress</span>
          <span className="font-medium text-slate-900">{pct}%</span>
        </div>
        <Progress value={pct} className="h-2" />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h4 className="font-display font-medium text-slate-900">Syllabus Units</h4>
        {canEdit && (
          <Button size="sm" onClick={openCreate} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white" data-testid="add-unit-button"><Plus className="h-3.5 w-3.5 mr-1" /> Add Unit</Button>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-slate-500 py-6 text-center">Loading...</div>
      ) : units.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center bg-slate-50 rounded-md border border-dashed border-slate-200">
          <BookText className="h-6 w-6 text-slate-400 mb-2" />
          <div className="text-sm font-medium text-slate-700">No units defined yet</div>
          <div className="text-xs text-slate-500 mt-0.5">Add the first syllabus unit to build the lesson plan.</div>
        </div>
      ) : (
        <ul className="space-y-2">
          {units.map((u) => {
            const st = UNIT_STATUSES.find((s) => s.value === u.status) || UNIT_STATUSES[0];
            const Icon = st.icon;
            return (
              <li key={u.id} className="p-4 bg-white border border-slate-200 rounded-md hover:border-blue-200 transition-colors" data-testid={`unit-${u.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex flex-col items-center min-w-[36px] pt-0.5">
                      <span className="text-xs uppercase tracking-wider text-slate-400">Unit</span>
                      <span className="font-display font-semibold text-slate-900">{u.unit_no}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="font-medium text-slate-900">{u.title}</h5>
                        <Badge variant="outline" className={st.badge}><Icon className={`h-3 w-3 mr-1 ${u.status === "in-progress" ? "animate-spin" : ""}`} /> {st.label}</Badge>
                        <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="h-3 w-3" /> {u.hours}h</span>
                      </div>
                      {u.topics?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {u.topics.map((t, i) => <span key={i} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded">{t}</span>)}
                        </div>
                      )}
                      {u.notes && <p className="text-xs text-slate-500 mt-2">{u.notes}</p>}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <select
                        value={u.status}
                        onChange={(e) => setStatus(u.id, e.target.value)}
                        data-testid={`unit-status-${u.id}`}
                        className="bg-white border border-slate-200 rounded-md px-2 py-1 text-xs"
                      >
                        {UNIT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(u)} data-testid={`unit-edit-${u.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(u.id)} className="text-rose-600" data-testid={`unit-delete-${u.id}`}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <UnitDialog open={open} onOpenChange={setOpen} editing={editing} form={form} setForm={setForm} onSave={save} />
    </Card>
  );
}

export default function SyllabusPage() {
  const { user } = useAuth();
  const canEdit = ["admin", "principal"].includes(user.role);
  const canEditUnit = ["admin", "principal", "faculty"].includes(user.role);
  const canDelete = user.role === "admin";

  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [filterCourse, setFilterCourse] = useState("all");
  const [filterFaculty, setFilterFaculty] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySubject);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterCourse !== "all") params.course_id = filterCourse;
      if (filterFaculty !== "all") params.faculty_id = filterFaculty;
      const [s, c, f] = await Promise.all([
        api.get("/subjects", { params }),
        api.get("/courses"),
        api.get("/faculty"),
      ]);
      setSubjects(s.data); setCourses(c.data); setFaculty(f.data);
      if (selected) {
        const updated = s.data.find((x) => x.id === selected.id);
        if (updated) setSelected(updated);
      }
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filterCourse, filterFaculty]);

  const openCreate = () => { setEditing(null); setForm(emptySubject); setOpen(true); };
  const openEdit = (s) => { setEditing(s); setForm({ ...emptySubject, ...s }); setOpen(true); };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/subjects/${editing.id}`, form);
      else await api.post("/subjects", form);
      toast.success(editing ? "Subject updated" : "Subject added");
      setOpen(false); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this subject and all its units?")) return;
    try { await api.delete(`/subjects/${id}`); toast.success("Deleted"); if (selected?.id === id) setSelected(null); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  // group by semester
  const groupedBySemester = subjects.reduce((acc, s) => {
    const sem = s.semester || 1;
    (acc[sem] = acc[sem] || []).push(s);
    return acc;
  }, {});
  const semesters = Object.keys(groupedBySemester).sort((a, b) => a - b);

  return (
    <div className="space-y-6" data-testid="syllabus-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-blue-600 font-semibold">Academics</div>
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight font-medium text-slate-900 mt-1">Syllabus & Subjects</h2>
          <p className="text-sm text-slate-500 mt-1">Manage subjects, faculty assignments and unit-level lesson plans.</p>
        </div>
        {canEdit && (
          <Button onClick={openCreate} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white" data-testid="add-subject-button">
            <Plus className="h-4 w-4 mr-1.5" /> Add Subject
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4 bg-white border border-slate-200 rounded-lg shadow-none">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex items-center gap-2">
            <Label className="text-xs uppercase tracking-wider text-slate-500">Course</Label>
            <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} data-testid="filter-course" className="bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-sm">
              <option value="all">All courses</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs uppercase tracking-wider text-slate-500">Faculty</Label>
            <select value={filterFaculty} onChange={(e) => setFilterFaculty(e.target.value)} data-testid="filter-faculty" className="bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-sm">
              <option value="all">All faculty</option>
              <option value="">— Unassigned —</option>
              {faculty.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Subjects list */}
        <div className={`space-y-5 ${selected ? "lg:col-span-1" : "lg:col-span-3"}`}>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map((i) => <div key={i} className="h-32 bg-white border border-slate-200 rounded-lg animate-pulse" />)}
            </div>
          ) : semesters.length === 0 ? (
            <Card className="p-12 bg-white border border-slate-200 rounded-lg shadow-none">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="h-12 w-12 bg-blue-50 rounded-md flex items-center justify-center mb-3"><BookText className="h-5 w-5 text-blue-600" /></div>
                <div className="font-display font-medium text-slate-900">No subjects yet</div>
                <div className="text-sm text-slate-500 mt-1">Add the first subject to build the syllabus.</div>
              </div>
            </Card>
          ) : (
            semesters.map((sem) => (
              <div key={sem}>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold mb-2.5 flex items-center gap-2">
                  <GraduationCap className="h-3.5 w-3.5" /> Semester {sem}
                </div>
                <div className={`grid gap-3 ${selected ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"}`}>
                  {groupedBySemester[sem].map((s) => (
                    <Card
                      key={s.id}
                      onClick={() => setSelected(s)}
                      className={`p-4 bg-white border rounded-lg shadow-none cursor-pointer transition-all stat-card ${selected?.id === s.id ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200"}`}
                      data-testid={`subject-card-${s.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-[10px] uppercase tracking-[0.18em] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{s.code}</span>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                      <h4 className="font-display font-medium text-slate-900 leading-tight">{s.name}</h4>
                      <div className="mt-1 text-xs text-slate-500">
                        {s.faculty_name ? <span>{s.faculty_name}</span> : <span className="text-amber-700">Unassigned</span>}
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span>{s.completed_units}/{s.total_units} units</span>
                          <span className="font-medium text-slate-900">{s.progress_pct}%</span>
                        </div>
                        <Progress value={s.progress_pct} className="h-1.5" />
                      </div>
                      {canEdit && (
                        <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(s)} data-testid={`subject-edit-${s.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
                          {canDelete && <Button size="sm" variant="ghost" onClick={() => remove(s.id)} className="text-rose-600" data-testid={`subject-delete-${s.id}`}><Trash2 className="h-3.5 w-3.5" /></Button>}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="lg:col-span-2">
            <SubjectDetail
              subject={selected}
              canEdit={canEditUnit}
              onClose={() => setSelected(null)}
              faculty={faculty}
              onSubjectChange={load}
            />
          </div>
        )}
      </div>

      <SubjectDialog open={open} onOpenChange={setOpen} editing={editing} form={form} setForm={setForm} onSave={save} courses={courses} faculty={faculty} />
    </div>
  );
}
