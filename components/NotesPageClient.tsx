"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

import {
  Plus,
  Pin,
  Pencil,
  Trash2,
  X,
  Search,
  StickyNote,
  Calendar,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Flame,
  Check,
  Building2,
  Sparkles,
  Info,
  Copy,
  ArrowUpDown,
  SlidersHorizontal,
  ExternalLink,
  Tag,
} from "lucide-react";

export type Priority = "Normal" | "Important" | "Follow Up";

export type Note = {
  id: string;
  user_id: string;
  title: string;
  client: string | null;
  content: string;
  priority: Priority;
  due_date: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

type ToastNotification = {
  type: "success" | "error" | "info";
  title: string;
  message: string;
};

type SortMode =
  | "pinnedFirst"
  | "dueDate"
  | "updatedNewest"
  | "createdNewest"
  | "titleAsc"
  | "priorityDesc";

function createClientId(value: string) {
  const id = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return id || "unassigned";
}

function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getOffsetDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function NotesPageClient({
  userId,
  initialNotes,
  availableClients = [],
}: {
  userId: string;
  initialNotes: Note[];
  availableClients?: string[];
}) {
  const supabase = createClient();

  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [activeKpiFilter, setActiveKpiFilter] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("pinnedFirst");

  const [showModal, setShowModal] = useState(false);
  const [viewNote, setViewNote] = useState<Note | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<Priority>("Normal");
  const [dueDate, setDueDate] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Remove confirmation modal state
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // In-app Toast state
  const [toast, setToast] = useState<ToastNotification | null>(null);

  function triggerToast(toastData: ToastNotification) {
    setToast(toastData);
    setTimeout(() => {
      setToast((curr) => (curr === toastData ? null : curr));
    }, 4500);
  }

  // Combine available clients with any client from existing notes
  const clients = useMemo(() => {
    const set = new Set<string>(availableClients);
    for (const n of notes) {
      if (n.client && n.client.trim()) {
        set.add(n.client.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [availableClients, notes]);

  const today = getTodayDate();
  const pinnedCount = useMemo(() => notes.filter((n) => n.is_pinned).length, [notes]);
  const importantCount = useMemo(() => notes.filter((n) => n.priority === "Important").length, [notes]);
  const followUpCount = useMemo(() => notes.filter((n) => n.priority === "Follow Up").length, [notes]);
  const overdueCount = useMemo(() => notes.filter((n) => n.due_date && n.due_date < today).length, [notes, today]);
  const dueTodayCount = useMemo(() => notes.filter((n) => n.due_date && n.due_date === today).length, [notes, today]);

  // Filter and sort notes
  const filteredNotes = useMemo(() => {
    const value = search.trim().toLowerCase();

    return notes
      .filter((note) => {
        // Quick KPI filter
        if (activeKpiFilter === "pinned" && !note.is_pinned) return false;
        if (activeKpiFilter === "important" && note.priority !== "Important") return false;
        if (activeKpiFilter === "followup" && note.priority !== "Follow Up") return false;
        if (activeKpiFilter === "overdue") {
          if (!note.due_date || note.due_date >= today) return false;
        }

        const matchesSearch =
          !value ||
          note.title.toLowerCase().includes(value) ||
          note.content.toLowerCase().includes(value) ||
          (note.client && note.client.toLowerCase().includes(value));

        const matchesClient = clientFilter === "all" || note.client === clientFilter;
        const matchesPriority =
          priorityFilter === "all" || note.priority === priorityFilter;

        return matchesSearch && matchesClient && matchesPriority;
      })
      .sort((a, b) => {
        switch (sortMode) {
          case "pinnedFirst":
            if (a.is_pinned !== b.is_pinned) {
              return Number(b.is_pinned) - Number(a.is_pinned);
            }
            if (a.due_date && b.due_date) {
              return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
            }
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();

          case "dueDate":
            if (!a.due_date && !b.due_date) return 0;
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();

          case "updatedNewest":
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();

          case "createdNewest":
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

          case "titleAsc":
            return a.title.localeCompare(b.title);

          case "priorityDesc": {
            const rank = (p: Priority) => (p === "Important" ? 3 : p === "Follow Up" ? 2 : 1);
            return rank(b.priority) - rank(a.priority);
          }

          default:
            return 0;
        }
      });
  }, [notes, search, clientFilter, priorityFilter, activeKpiFilter, sortMode, today]);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setClient("");
    setContent("");
    setPriority("Normal");
    setDueDate("");
    setIsPinned(false);
    setError("");
  }

  function openNewNote() {
    resetForm();
    setShowModal(true);
  }

  function openEditNote(note: Note) {
    setEditingId(note.id);
    setTitle(note.title);
    setClient(note.client || "");
    setContent(note.content);
    setPriority(note.priority);
    setDueDate(note.due_date || "");
    setIsPinned(note.is_pinned);
    setError("");
    setViewNote(null);
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;
    setShowModal(false);
    resetForm();
  }

  const handleCopyContent = (note: Note) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(`${note.title}\n\n${note.content}`);
      setCopiedId(note.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  async function handleSave() {
    if (!title.trim()) {
      setError("Note title is required.");
      return;
    }

    if (!content.trim()) {
      setError("Note content is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (editingId) {
        const { data, error: updateError } = await supabase
          .from("notes")
          .update({
            title: title.trim(),
            client: client || null,
            content: content.trim(),
            priority,
            due_date: dueDate || null,
            is_pinned: isPinned,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId)
          .select()
          .single();

        if (updateError) {
          setError(updateError.message);
          setSaving(false);
          return;
        }

        setNotes((current) =>
          current.map((note) => (note.id === editingId ? data : note))
        );

        triggerToast({
          type: "success",
          title: "Note Updated",
          message: `Saved changes to "${title.trim()}".`,
        });
      } else {
        const { data, error: insertError } = await supabase
          .from("notes")
          .insert({
            user_id: userId,
            title: title.trim(),
            client: client || null,
            content: content.trim(),
            priority,
            due_date: dueDate || null,
            is_pinned: isPinned,
          })
          .select()
          .single();

        if (insertError) {
          setError(insertError.message);
          setSaving(false);
          return;
        }

        setNotes((current) => [data, ...current]);

        triggerToast({
          type: "success",
          title: "Note Created",
          message: `Added new note "${title.trim()}".`,
        });
      }

      setSaving(false);
      setShowModal(false);
      resetForm();
    } catch {
      setError("Unable to save note. Please check your network connection.");
      setSaving(false);
    }
  }

  async function handleTogglePin(note: Note) {
    const nextValue = !note.is_pinned;

    // Optimistic update
    setNotes((current) =>
      current.map((item) =>
        item.id === note.id ? { ...item, is_pinned: nextValue } : item
      )
    );

    try {
      const { error: updateError } = await supabase
        .from("notes")
        .update({
          is_pinned: nextValue,
          updated_at: new Date().toISOString(),
        })
        .eq("id", note.id);

      if (updateError) {
        // Revert
        setNotes((current) =>
          current.map((item) =>
            item.id === note.id ? { ...item, is_pinned: note.is_pinned } : item
          )
        );
        triggerToast({
          type: "error",
          title: "Pin Failed",
          message: updateError.message,
        });
      } else {
        triggerToast({
          type: "info",
          title: nextValue ? "Note Pinned" : "Note Unpinned",
          message: nextValue
            ? `Pinned "${note.title}" to top.`
            : `Unpinned "${note.title}".`,
        });
      }
    } catch {
      triggerToast({
        type: "error",
        title: "Network Error",
        message: "Failed to update pin state.",
      });
    }
  }

  async function handleConfirmDelete() {
    if (!noteToDelete) return;
    setDeleting(true);

    try {
      const { error: deleteError } = await supabase
        .from("notes")
        .delete()
        .eq("id", noteToDelete.id);

      if (deleteError) {
        triggerToast({
          type: "error",
          title: "Delete Failed",
          message: deleteError.message,
        });
        return;
      }

      setNotes((current) => current.filter((item) => item.id !== noteToDelete.id));

      if (viewNote?.id === noteToDelete.id) {
        setViewNote(null);
      }

      triggerToast({
        type: "info",
        title: "Note Deleted",
        message: `Removed note "${noteToDelete.title}".`,
      });
    } catch {
      triggerToast({
        type: "error",
        title: "Error",
        message: "Unable to delete note.",
      });
    } finally {
      setDeleting(false);
      setNoteToDelete(null);
    }
  }

  function toggleKpiFilter(filterName: string) {
    setActiveKpiFilter((curr) => (curr === filterName ? null : filterName));
  }

  const isFilterActive =
    search !== "" ||
    clientFilter !== "all" ||
    priorityFilter !== "all" ||
    activeKpiFilter !== null;

  const clearFilters = () => {
    setSearch("");
    setClientFilter("all");
    setPriorityFilter("all");
    setActiveKpiFilter(null);
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto pb-16 space-y-6 text-slate-900">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div
            className={`p-4 rounded-xl shadow-2xl border backdrop-blur-md flex items-start gap-3 ${
              toast.type === "success"
                ? "bg-slate-900/95 text-white border-emerald-500/50"
                : toast.type === "error"
                ? "bg-slate-900/95 text-white border-rose-500/50"
                : "bg-slate-900/95 text-white border-slate-700/60"
            }`}
          >
            {toast.type === "success" && (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            )}
            {toast.type === "error" && (
              <AlertTriangle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
            )}
            {toast.type === "info" && (
              <Info className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{toast.title}</p>
              <p className="text-xs text-slate-300 mt-0.5">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-semibold tracking-tight text-[#14243D]">
              Notes & Operational Memos
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-normal bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Workspace Memos
            </span>
          </div>
          <p className="mt-1 text-[13px] font-normal text-slate-500">
            Track client action items, deliverability reminders, inbox warmup deadlines, and operational memos.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isFilterActive && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Clear Filters
            </button>
          )}

          <button
            type="button"
            onClick={openNewNote}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[14px] font-medium text-white bg-slate-900 hover:bg-slate-800 active:scale-95 shadow-sm transition-all duration-150 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add New Note</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Filter Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div
          onClick={() => setActiveKpiFilter(null)}
          className={`cursor-pointer bg-white rounded-xl p-4 border transition-all duration-150 shadow-2xs hover:shadow-xs ${
            activeKpiFilter === null
              ? "border-slate-800 ring-2 ring-slate-800/10"
              : "border-slate-200/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[12px] font-normal text-slate-500">Total Notes</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <StickyNote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-[28px] font-semibold tracking-tight tabular-nums text-slate-900 mt-2">
            {notes.length}
          </div>
          <p className="text-[12px] font-normal text-slate-400 mt-0.5">All active memos</p>
        </div>

        <div
          onClick={() => toggleKpiFilter("pinned")}
          className={`cursor-pointer bg-white rounded-xl p-4 border transition-all duration-150 shadow-2xs hover:shadow-xs ${
            activeKpiFilter === "pinned"
              ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20"
              : "border-slate-200/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[12px] font-normal text-slate-500">Pinned</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Pin className="w-4 h-4 fill-amber-500" />
            </div>
          </div>
          <div className="text-[28px] font-semibold tracking-tight tabular-nums text-slate-900 mt-2">
            {pinnedCount}
          </div>
          <p className="text-[12px] font-normal text-slate-400 mt-0.5">Stickied to top</p>
        </div>

        <div
          onClick={() => toggleKpiFilter("important")}
          className={`cursor-pointer bg-white rounded-xl p-4 border transition-all duration-150 shadow-2xs hover:shadow-xs ${
            activeKpiFilter === "important"
              ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20"
              : "border-slate-200/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-[12px] font-normal text-slate-500">Important</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-[28px] font-semibold tracking-tight tabular-nums text-rose-600 mt-2">
            {importantCount}
          </div>
          <p className="text-[12px] font-normal text-slate-400 mt-0.5">High priority</p>
        </div>

        <div
          onClick={() => toggleKpiFilter("followup")}
          className={`cursor-pointer bg-white rounded-xl p-4 border transition-all duration-150 shadow-2xs hover:shadow-xs ${
            activeKpiFilter === "followup"
              ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20"
              : "border-slate-200/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-indigo-600">
            <span className="text-[12px] font-normal text-slate-500">Follow Up</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-[28px] font-semibold tracking-tight tabular-nums text-slate-900 mt-2">
            {followUpCount}
          </div>
          <p className="text-[12px] font-normal text-slate-400 mt-0.5">Pending action</p>
        </div>

        <div
          onClick={() => toggleKpiFilter("overdue")}
          className={`cursor-pointer bg-white rounded-xl p-4 border transition-all duration-150 shadow-2xs hover:shadow-xs col-span-2 sm:col-span-1 ${
            activeKpiFilter === "overdue"
              ? "border-red-500 ring-2 ring-red-500/20 bg-red-50/20"
              : "border-slate-200/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-red-600">
            <span className="text-[12px] font-normal text-slate-500">Overdue</span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              overdueCount > 0 ? "bg-red-100 text-red-700 animate-pulse" : "bg-slate-100 text-slate-400"
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-[28px] font-semibold tracking-tight tabular-nums text-red-600 mt-2">
            {overdueCount}
          </div>
          <p className="text-[12px] font-normal text-slate-400 mt-0.5">Past due date</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
          {/* Search Box */}
          <div className="relative lg:col-span-5">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes by title, content, or client..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Client Filter Dropdown */}
          <div className="lg:col-span-3">
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
            >
              <option value="all">All Clients ({clients.length})</option>
              {clients.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter Dropdown */}
          <div className="lg:col-span-2">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
            >
              <option value="all">All Priorities</option>
              <option value="Important">Important</option>
              <option value="Follow Up">Follow Up</option>
              <option value="Normal">Normal</option>
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="lg:col-span-2">
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
            >
              <option value="pinnedFirst">Sort: Pinned & Due</option>
              <option value="dueDate">Sort: Due Date</option>
              <option value="updatedNewest">Sort: Updated</option>
              <option value="createdNewest">Sort: Created</option>
              <option value="priorityDesc">Sort: Priority</option>
              <option value="titleAsc">Sort: Title (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Quick status count footer */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <div>
            Showing <span className="font-semibold text-slate-900">{filteredNotes.length}</span> of{" "}
            <span className="font-semibold text-slate-900">{notes.length}</span> notes
            {isFilterActive && " (filtered)"}
          </div>

          {dueTodayCount > 0 && (
            <div className="flex items-center gap-1.5 text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>{dueTodayCount} due today</span>
            </div>
          )}
        </div>
      </div>

      {/* Notes Grid or Empty State */}
      {filteredNotes.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/90 p-12 text-center flex flex-col items-center justify-center shadow-2xs">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <StickyNote className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-[16px] font-semibold text-[#14243D]">
            {notes.length === 0 ? "No notes added yet" : "No matching notes found"}
          </h3>
          <p className="text-[13px] font-normal text-slate-500 max-w-sm mt-1 mb-4 leading-relaxed">
            {notes.length === 0
              ? "Create your first memo to track client deliverables, inbox warmup reminders, and urgent action items."
              : "Try adjusting your search keywords or filter criteria to view more notes."}
          </p>
          {isFilterActive ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[14px] font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filters</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={openNewNote}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[14px] font-medium text-white bg-slate-900 hover:bg-slate-800 active:scale-95 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Note</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => {
            const isOverdue = note.due_date && note.due_date < today;
            const isDueToday = note.due_date && note.due_date === today;

            return (
              <div
                key={note.id}
                className={`group bg-white rounded-xl border transition-all duration-150 hover:shadow-sm flex flex-col justify-between overflow-hidden relative ${
                  note.is_pinned
                    ? "border-amber-300 bg-gradient-to-b from-amber-50/20 to-white"
                    : "border-slate-200/90 hover:border-slate-300"
                }`}
              >
                {/* Note Top Bar */}
                <div className="p-5 pb-3">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <PriorityBadge priority={note.priority} />

                      {note.client && (
                        <Link
                          href={`/clients/${createClientId(note.client)}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] font-normal bg-slate-100 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200/80 transition-colors"
                          title={`View client ${note.client}`}
                        >
                          <Building2 className="w-2.5 h-2.5 text-slate-500" />
                          <span className="truncate max-w-[120px]">
                            {note.client}
                          </span>
                        </Link>
                      )}
                    </div>

                    {/* Pin button */}
                    <button
                      type="button"
                      onClick={() => handleTogglePin(note)}
                      title={note.is_pinned ? "Unpin note" : "Pin note to top"}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                        note.is_pinned
                          ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                          : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Pin
                        className={`w-3.5 h-3.5 ${
                          note.is_pinned ? "fill-amber-600 text-amber-600" : ""
                        }`}
                      />
                    </button>
                  </div>

                  {/* Note Title */}
                  <h3
                    onClick={() => setViewNote(note)}
                    className="text-[16px] font-semibold text-[#14243D] group-hover:text-indigo-600 transition-colors cursor-pointer line-clamp-1"
                    title={note.title}
                  >
                    {note.title}
                  </h3>

                  {/* Note Content preview */}
                  <p
                    onClick={() => setViewNote(note)}
                    className="text-[13px] font-normal text-slate-600 mt-2 line-clamp-3 leading-relaxed cursor-pointer"
                  >
                    {note.content}
                  </p>
                </div>

                {/* Note Bottom Details & Actions */}
                <div className="p-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2 text-xs">
                  {/* Due Date Indicator */}
                  {note.due_date ? (
                    <div
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] font-normal ${
                        isOverdue
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : isDueToday
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Calendar className="w-3 h-3 shrink-0" />
                      <span>{formatDueDate(note.due_date)}</span>
                    </div>
                  ) : (
                    <span className="text-[12px] font-normal text-slate-400">
                      No deadline
                    </span>
                  )}

                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCopyContent(note)}
                      title="Copy note text"
                      className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      {copiedId === note.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewNote(note)}
                      title="View full note"
                      className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditNote(note)}
                      title="Edit note"
                      className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoteToDelete(note)}
                      title="Delete note"
                      className="w-7 h-7 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Note Modal */}
      {showModal && (
        <div
          onClick={closeModal}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="p-5 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                  {editingId ? (
                    <Pencil className="w-4 h-4" />
                  ) : (
                    <Plus className="w-5 h-5 stroke-[2.5]" />
                  )}
                </div>
                <div>
                  <h2 className="text-[16px] font-semibold text-[#14243D]">
                    {editingId ? "Edit Note" : "Create New Note"}
                  </h2>
                  <p className="text-[12px] font-normal text-slate-500">
                    {editingId
                      ? "Update action item details, priority, or client association"
                      : "Add a memo, client action item, or deliverability reminder"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-[12px] font-normal text-slate-700 uppercase tracking-wider mb-1.5">
                  Note Title *
                </label>
                <input
                  type="text"
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Follow up on DNS DKIM warmup thresholds"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                />
              </div>

              {/* Client and Due Date Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[12px] font-normal text-slate-700 uppercase tracking-wider mb-1.5">
                    Associated Client
                  </label>
                  <select
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">No Client (General Note)</option>
                    {clients.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-normal text-slate-700 uppercase tracking-wider mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  {/* Date Quick Shortcuts */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setDueDate(getTodayDate())}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setDueDate(getOffsetDate(1))}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium"
                    >
                      Tomorrow
                    </button>
                    <button
                      type="button"
                      onClick={() => setDueDate(getOffsetDate(7))}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium"
                    >
                      +1 Week
                    </button>
                    {dueDate && (
                      <button
                        type="button"
                        onClick={() => setDueDate("")}
                        className="text-[10px] text-rose-600 hover:underline ml-auto"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Priority Radio Pills */}
              <div>
                <label className="block text-[12px] font-normal text-slate-700 uppercase tracking-wider mb-2">
                  Priority Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Normal", "Important", "Follow Up"] as Priority[]).map((p) => {
                    const isSelected = priority === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? p === "Important"
                              ? "bg-rose-50 border-rose-400 text-rose-700 shadow-xs"
                              : p === "Follow Up"
                              ? "bg-indigo-50 border-indigo-400 text-indigo-700 shadow-xs"
                              : "bg-slate-100 border-slate-400 text-slate-800 shadow-xs"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        <span>{p}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Note Content */}
              <div>
                <label className="block text-[12px] font-normal text-slate-700 uppercase tracking-wider mb-1.5">
                  Note Content *
                </label>
                <textarea
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write task details, client decisions, numbers, or meeting action items..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all resize-y"
                />
              </div>

              {/* Pin Note Checkbox */}
              <div
                onClick={() => setIsPinned(!isPinned)}
                className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-colors ${
                  isPinned
                    ? "bg-amber-50/70 border-amber-300"
                    : "bg-slate-50/60 border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Pin
                    className={`w-4 h-4 ${
                      isPinned ? "fill-amber-600 text-amber-600" : "text-slate-400"
                    }`}
                  />
                  <div>
                    <span className="text-[13px] font-medium text-slate-900">
                      Pin to Top
                    </span>
                    <p className="text-[12px] font-normal text-slate-500">
                      Keep this note pinned prominently above normal memos
                    </p>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                    isPinned
                      ? "bg-amber-600 border-amber-600 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {isPinned && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-[14px] font-medium text-slate-700 hover:bg-slate-200/70 border border-slate-300/80 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 rounded-xl text-[14px] font-medium text-white bg-slate-900 hover:bg-slate-800 shadow-xs flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{editingId ? "Update Note" : "Save Note"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Full Note Modal */}
      {viewNote && (
        <div
          onClick={() => setViewNote(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-5 px-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/60">
              <div className="space-y-1.5 flex-1 pr-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <PriorityBadge priority={viewNote.priority} />
                  {viewNote.client && (
                    <Link
                      href={`/clients/${createClientId(viewNote.client)}`}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-normal bg-indigo-50 text-indigo-700 hover:underline border border-indigo-200"
                    >
                      <Building2 className="w-3 h-3" />
                      {viewNote.client}
                    </Link>
                  )}
                  {viewNote.is_pinned && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-normal bg-amber-50 text-amber-700 border border-amber-200">
                      <Pin className="w-3 h-3 fill-amber-500" />
                      Pinned
                    </span>
                  )}
                </div>
                <h2 className="text-[16px] font-semibold text-[#14243D] break-words">
                  {viewNote.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setViewNote(null)}
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Note Content */}
            <div className="p-6 overflow-y-auto space-y-4">
              {viewNote.due_date && (
                <div className="flex items-center gap-2 text-[12px] font-normal text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>Deadline: {formatDueDate(viewNote.due_date)}</span>
                </div>
              )}

              <div>
                <span className="text-[12px] font-normal uppercase tracking-wider text-slate-400 block mb-1.5">
                  Content
                </span>
                <div className="text-[13px] font-normal text-slate-800 leading-relaxed whitespace-pre-wrap break-words bg-slate-50/50 p-4 rounded-xl border border-slate-200/80">
                  {viewNote.content}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[12px] font-normal text-slate-500">
              <span>
                Updated: {new Date(viewNote.updated_at).toLocaleDateString()}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyContent(viewNote)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[14px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                >
                  {copiedId === viewNote.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => openEditNote(viewNote)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[14px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Note</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {noteToDelete && (
        <div
          onClick={() => !deleting && setNoteToDelete(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-1">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-[#14243D]">
                Delete Note?
              </h3>
              <p className="text-[13px] font-normal text-slate-600 mt-1 leading-relaxed">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-slate-900">
                  &ldquo;{noteToDelete.title}&rdquo;
                </span>
                ? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setNoteToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-[14px] font-medium text-slate-700 hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-[14px] font-medium text-white bg-rose-600 hover:bg-rose-700 shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {deleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Note</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  if (priority === "Important") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
        Important
      </span>
    );
  }

  if (priority === "Follow Up") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
        <Clock className="w-2.5 h-2.5 text-indigo-500" />
        Follow Up
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
      Normal
    </span>
  );
}

function formatDueDate(dateStr: string): string {
  const today = getTodayDate();
  if (dateStr === today) return "Due Today";
  if (dateStr < today) return `Overdue (${dateStr})`;
  return `Due ${dateStr}`;
}