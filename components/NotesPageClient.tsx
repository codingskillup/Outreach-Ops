"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { clientDemoData } from "@/lib/clientDemoData";

import {
  Plus,
  Pin,
  Pencil,
  Trash2,
  X,
  Search,
  StickyNote,
  CalendarDays,
  Eye,
} from "lucide-react";

type Priority =
  | "Normal"
  | "Important"
  | "Follow Up";

type Note = {
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

export default function NotesPageClient({
  userId,
  initialNotes,
}: {
  userId: string;
  initialNotes: Note[];
}) {
  const supabase = createClient();

  const [notes, setNotes] =
    useState<Note[]>(initialNotes);

  const [search, setSearch] =
    useState("");

  const [
    clientFilter,
    setClientFilter,
  ] = useState("all");

  const [
    priorityFilter,
    setPriorityFilter,
  ] = useState("all");

  const [showModal, setShowModal] =
    useState(false);

  const [viewNote, setViewNote] =
    useState<Note | null>(null);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [title, setTitle] =
    useState("");

  const [client, setClient] =
    useState("");

  const [content, setContent] =
    useState("");

  const [priority, setPriority] =
    useState<Priority>("Normal");

  const [dueDate, setDueDate] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const clients = clientDemoData.map(
    (item) => item.name
  );

  const filteredNotes =
    useMemo(() => {
      const value =
        search.trim().toLowerCase();

      return notes
        .filter((note) => {
          const matchesSearch =
            !value ||
            note.title
              .toLowerCase()
              .includes(value) ||
            note.content
              .toLowerCase()
              .includes(value) ||
            note.client
              ?.toLowerCase()
              .includes(value);

          const matchesClient =
            clientFilter === "all" ||
            note.client === clientFilter;

          const matchesPriority =
            priorityFilter === "all" ||
            note.priority ===
              priorityFilter;

          return (
            matchesSearch &&
            matchesClient &&
            matchesPriority
          );
        })
        .sort((a, b) => {
          if (
            a.is_pinned !==
            b.is_pinned
          ) {
            return (
              Number(b.is_pinned) -
              Number(a.is_pinned)
            );
          }

          if (
            a.due_date &&
            b.due_date
          ) {
            return (
              new Date(
                a.due_date
              ).getTime() -
              new Date(
                b.due_date
              ).getTime()
            );
          }

          return (
            new Date(
              b.updated_at
            ).getTime() -
            new Date(
              a.updated_at
            ).getTime()
          );
        });
    }, [
      notes,
      search,
      clientFilter,
      priorityFilter,
    ]);

  const pinnedCount =
    notes.filter(
      (note) => note.is_pinned
    ).length;

  const importantCount =
    notes.filter(
      (note) =>
        note.priority === "Important"
    ).length;

  const followUpCount =
    notes.filter(
      (note) =>
        note.priority === "Follow Up"
    ).length;

  const overdueCount =
    notes.filter((note) => {
      if (!note.due_date) {
        return false;
      }

      return (
        note.due_date <
        getTodayDate()
      );
    }).length;

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setClient("");
    setContent("");
    setPriority("Normal");
    setDueDate("");
    setError("");
  }

  function openNewNote() {
    resetForm();
    setShowModal(true);
  }

  function openEditNote(
    note: Note
  ) {
    setEditingId(note.id);
    setTitle(note.title);
    setClient(
      note.client || ""
    );
    setContent(note.content);
    setPriority(note.priority);
    setDueDate(
      note.due_date || ""
    );
    setError("");
    setViewNote(null);
    setShowModal(true);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setShowModal(false);
    resetForm();
  }

  async function handleSave() {
    if (!title.trim()) {
      setError(
        "Note title is required."
      );
      return;
    }

    if (!content.trim()) {
      setError(
        "Note content is required."
      );
      return;
    }

    setSaving(true);
    setError("");

    if (editingId) {
      const {
        data,
        error: updateError,
      } = await supabase
        .from("notes")
        .update({
          title: title.trim(),
          client:
            client || null,
          content:
            content.trim(),
          priority,
          due_date:
            dueDate || null,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", editingId)
        .select()
        .single();

      if (updateError) {
        setError(
          updateError.message
        );
        setSaving(false);
        return;
      }

      setNotes((current) =>
        current.map((note) =>
          note.id === editingId
            ? data
            : note
        )
      );
    } else {
      const {
        data,
        error: insertError,
      } = await supabase
        .from("notes")
        .insert({
          user_id: userId,
          title: title.trim(),
          client:
            client || null,
          content:
            content.trim(),
          priority,
          due_date:
            dueDate || null,
          is_pinned: false,
        })
        .select()
        .single();

      if (insertError) {
        setError(
          insertError.message
        );
        setSaving(false);
        return;
      }

      setNotes((current) => [
        data,
        ...current,
      ]);
    }

    setSaving(false);
    setShowModal(false);
    resetForm();
  }

  async function handlePin(
    note: Note
  ) {
    const nextValue =
      !note.is_pinned;

    const {
      error: updateError,
    } = await supabase
      .from("notes")
      .update({
        is_pinned: nextValue,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", note.id);

    if (updateError) {
      alert(
        updateError.message
      );
      return;
    }

    setNotes((current) =>
      current.map((item) =>
        item.id === note.id
          ? {
              ...item,
              is_pinned:
                nextValue,
              updated_at:
                new Date().toISOString(),
            }
          : item
      )
    );
  }

  async function handleDelete(
    note: Note
  ) {
    const confirmed =
      window.confirm(
        `Delete "${note.title}"?`
      );

    if (!confirmed) {
      return;
    }

    const {
      error: deleteError,
    } = await supabase
      .from("notes")
      .delete()
      .eq("id", note.id);

    if (deleteError) {
      alert(
        deleteError.message
      );
      return;
    }

    setNotes((current) =>
      current.filter(
        (item) =>
          item.id !== note.id
      )
    );

    if (
      viewNote?.id === note.id
    ) {
      setViewNote(null);
    }
  }

  return (
    <div
      style={{
        width: "100%",
        minWidth: 0,
        color: "#111827",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 26,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 750,
            }}
          >
            Notes
          </h1>

          <p
            style={{
              marginTop: 7,
              marginBottom: 0,
              color: "#6B7280",
              fontSize: 14,
            }}
          >
            Keep client tasks,
            follow ups and due dates
            in one place.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewNote}
          style={{
            marginLeft: "auto",
            height: 42,
            border: 0,
            borderRadius: 9,
            background: "#111827",
            color: "#FFFFFF",
            paddingLeft: 14,
            paddingRight: 14,
            display: "flex",
            alignItems: "center",
            gap: 7,
            cursor: "pointer",
            fontWeight: 650,
          }}
        >
          <Plus size={16} />
          Add Note
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(5, minmax(0, 1fr))",
          gap: 14,
          marginBottom: 22,
        }}
      >
        <SummaryCard
          title="Total Notes"
          value={notes.length}
        />

        <SummaryCard
          title="Pinned"
          value={pinnedCount}
        />

        <SummaryCard
          title="Important"
          value={importantCount}
          warning
        />

        <SummaryCard
          title="Follow Up"
          value={followUpCount}
        />

        <SummaryCard
          title="Overdue"
          value={overdueCount}
          danger
        />
      </div>

      <div
        style={{
          background: "#FFFFFF",
          border:
            "1px solid #E5E7EB",
          borderRadius: 14,
          padding: 18,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "2fr 1fr 1fr",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              border:
                "1px solid #D1D5DB",
              borderRadius: 9,
              paddingLeft: 11,
              paddingRight: 11,
              height: 42,
              background: "#FFFFFF",
            }}
          >
            <Search
              size={15}
              color="#94A3B8"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search notes"
              style={{
                flex: 1,
                minWidth: 0,
                border: 0,
                outline: "none",
                marginLeft: 8,
                fontSize: 13,
                color: "#111827",
                background:
                  "transparent",
              }}
            />
          </div>

          <select
            value={clientFilter}
            onChange={(event) =>
              setClientFilter(
                event.target.value
              )
            }
            style={selectStyle}
          >
            <option value="all">
              All Clients
            </option>

            {clients.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              )
            )}
          </select>

          <select
            value={priorityFilter}
            onChange={(event) =>
              setPriorityFilter(
                event.target.value
              )
            }
            style={selectStyle}
          >
            <option value="all">
              All Priorities
            </option>

            <option value="Normal">
              Normal
            </option>

            <option value="Important">
              Important
            </option>

            <option value="Follow Up">
              Follow Up
            </option>
          </select>
        </div>
      </div>

      {filteredNotes.length ===
      0 ? (
        <div
          style={{
            background: "#FFFFFF",
            border:
              "1px solid #E5E7EB",
            borderRadius: 14,
            padding: 50,
            textAlign: "center",
          }}
        >
          <StickyNote
            size={30}
            color="#94A3B8"
          />

          <div
            style={{
              marginTop: 12,
              fontWeight: 700,
            }}
          >
            No notes found
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap: 16,
            width: "100%",
          }}
        >
          {filteredNotes.map(
            (note) => (
              <NoteCard
                key={note.id}
                note={note}
                onView={
                  setViewNote
                }
                onPin={
                  handlePin
                }
                onEdit={
                  openEditNote
                }
                onDelete={
                  handleDelete
                }
              />
            )
          )}
        </div>
      )}

      {viewNote && (
        <div
          onClick={() =>
            setViewNote(null)
          }
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(15, 23, 42, 0.48)",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",
            padding: 20,
            zIndex: 120,
          }}
        >
          <div
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              width: "100%",
              maxWidth: 650,
              maxHeight: "85vh",
              overflowY: "auto",
              background: "#FFFFFF",
              borderRadius: 16,
              padding: 26,
              boxShadow:
                "0 24px 70px rgba(15, 23, 42, 0.20)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems:
                  "flex-start",
                gap: 12,
              }}
            >
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <PriorityBadge
                  priority={
                    viewNote.priority
                  }
                />

                <h2
                  style={{
                    marginTop: 16,
                    marginBottom: 0,
                    fontSize: 23,
                    lineHeight: 1.3,
                    wordBreak:
                      "break-word",
                  }}
                >
                  {viewNote.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setViewNote(null)
                }
                style={{
                  width: 36,
                  height: 36,
                  border:
                    "1px solid #E5E7EB",
                  borderRadius: 9,
                  background: "#FFFFFF",
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {viewNote.client && (
              <div
                style={{
                  marginTop: 13,
                  color: "#2563EB",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {viewNote.client}
              </div>
            )}

            {viewNote.due_date && (
              <div
                style={{
                  marginTop: 13,
                  display: "flex",
                  alignItems:
                    "center",
                  gap: 7,
                }}
              >
                <CalendarDays
                  size={15}
                  color="#64748B"
                />

                <DueDateBadge
                  date={
                    viewNote.due_date
                  }
                />
              </div>
            )}

            <div
              style={{
                marginTop: 22,
                paddingTop: 20,
                borderTop:
                  "1px solid #E5E7EB",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#64748B",
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                Description
              </div>

              <div
                style={{
                  color: "#334155",
                  fontSize: 14,
                  lineHeight: 1.8,
                  whiteSpace:
                    "pre-wrap",
                  overflowWrap:
                    "anywhere",
                  wordBreak:
                    "break-word",
                }}
              >
                {viewNote.content}
              </div>
            </div>

            <div
              style={{
                marginTop: 22,
                paddingTop: 16,
                borderTop:
                  "1px solid #E5E7EB",
                display: "flex",
                alignItems:
                  "center",
              }}
            >
              <span
                style={{
                  color: "#94A3B8",
                  fontSize: 11,
                }}
              >
                Updated{" "}
                {new Date(
                  viewNote.updated_at
                ).toLocaleString()}
              </span>

              <button
                type="button"
                onClick={() =>
                  openEditNote(
                    viewNote
                  )
                }
                style={{
                  marginLeft: "auto",
                  height: 38,
                  border:
                    "1px solid #D1D5DB",
                  borderRadius: 8,
                  background: "#FFFFFF",
                  padding:
                    "0 13px",
                  display: "flex",
                  alignItems:
                    "center",
                  gap: 6,
                  cursor: "pointer",
                  fontWeight: 650,
                }}
              >
                <Pencil
                  size={14}
                />
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",
            padding: 20,
            zIndex: 130,
          }}
        >
          <div
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              width: "100%",
              maxWidth: 520,
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#FFFFFF",
              borderRadius: 16,
              padding: 24,
              boxShadow:
                "0 20px 60px rgba(0, 0, 0, 0.18)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 22,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 20,
                  }}
                >
                  {editingId
                    ? "Edit Note"
                    : "Add Note"}
                </h2>

                <p
                  style={{
                    marginTop: 5,
                    marginBottom: 0,
                    color: "#6B7280",
                    fontSize: 13,
                  }}
                >
                  Add task details
                  and due date.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                style={{
                  marginLeft: "auto",
                  border: 0,
                  background:
                    "transparent",
                  cursor: "pointer",
                  color: "#64748B",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <label
              style={labelStyle}
            >
              Title
            </label>

            <input
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value
                )
              }
              placeholder="Example: Check Reverba campaigns"
              style={fieldStyle}
            />

            <label
              style={labelStyle}
            >
              Client
            </label>

            <select
              value={client}
              onChange={(event) =>
                setClient(
                  event.target.value
                )
              }
              style={fieldStyle}
            >
              <option value="">
                General
              </option>

              {clients.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )}
            </select>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: 12,
              }}
            >
              <div>
                <label
                  style={labelStyle}
                >
                  Priority
                </label>

                <select
                  value={priority}
                  onChange={(event) =>
                    setPriority(
                      event.target
                        .value as Priority
                    )
                  }
                  style={fieldStyle}
                >
                  <option value="Normal">
                    Normal
                  </option>

                  <option value="Important">
                    Important
                  </option>

                  <option value="Follow Up">
                    Follow Up
                  </option>
                </select>
              </div>

              <div>
                <label
                  style={labelStyle}
                >
                  Due Date
                </label>

                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) =>
                    setDueDate(
                      event.target.value
                    )
                  }
                  style={fieldStyle}
                />
              </div>
            </div>

            <label
              style={labelStyle}
            >
              Note
            </label>

            <textarea
              value={content}
              onChange={(event) =>
                setContent(
                  event.target.value
                )
              }
              placeholder="Write task details or client update"
              rows={6}
              style={{
                ...fieldStyle,
                height: "auto",
                minHeight: 130,
                paddingTop: 11,
                paddingBottom: 11,
                resize: "vertical",
                fontFamily:
                  "inherit",
              }}
            />

            {error && (
              <div
                style={{
                  background:
                    "#FEF2F2",
                  border:
                    "1px solid #FECACA",
                  color: "#B91C1C",
                  padding: 11,
                  borderRadius: 8,
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                style={{
                  flex: 1,
                  height: 44,
                  border:
                    "1px solid #D1D5DB",
                  borderRadius: 9,
                  background: "#FFFFFF",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1,
                  height: 44,
                  border: 0,
                  borderRadius: 9,
                  background: "#111827",
                  color: "#FFFFFF",
                  cursor: "pointer",
                  fontWeight: 650,
                  opacity:
                    saving
                      ? 0.7
                      : 1,
                }}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save Changes"
                    : "Add Note"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const selectStyle = {
  width: "100%",
  height: 42,
  border:
    "1px solid #D1D5DB",
  borderRadius: 9,
  paddingLeft: 11,
  paddingRight: 11,
  background: "#FFFFFF",
  color: "#111827",
  fontSize: 13,
  outline: "none",
  boxSizing:
    "border-box" as const,
};

const fieldStyle = {
  display: "block",
  width: "100%",
  minWidth: 0,
  height: 44,
  border:
    "1px solid #D1D5DB",
  borderRadius: 9,
  paddingLeft: 11,
  paddingRight: 11,
  background: "#FFFFFF",
  color: "#111827",
  fontSize: 13,
  outline: "none",
  marginBottom: 16,
  boxSizing:
    "border-box" as const,
};

const labelStyle = {
  display: "block",
  fontSize: 13,
  fontWeight: 650,
  marginBottom: 7,
  color: "#374151",
};

function SummaryCard({
  title,
  value,
  warning,
  danger,
}: {
  title: string;
  value: number;
  warning?: boolean;
  danger?: boolean;
}) {
  let color = "#111827";

  if (warning) {
    color = "#B45309";
  }

  if (danger) {
    color = "#B91C1C";
  }

  return (
    <div
      style={{
        background: "#FFFFFF",
        border:
          "1px solid #E5E7EB",
        borderRadius: 13,
        padding: 18,
      }}
    >
      <div
        style={{
          color: "#64748B",
          fontSize: 12,
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: 25,
          fontWeight: 750,
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function NoteCard({
  note,
  onView,
  onPin,
  onEdit,
  onDelete,
}: {
  note: Note;
  onView: (
    note: Note
  ) => void;
  onPin: (
    note: Note
  ) => void;
  onEdit: (
    note: Note
  ) => void;
  onDelete: (
    note: Note
  ) => void;
}) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border:
          note.is_pinned
            ? "1px solid #BFDBFE"
            : "1px solid #E5E7EB",
        borderRadius: 14,
        padding: 20,
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
        }}
      >
        <PriorityBadge
          priority={
            note.priority
          }
        />

        {note.is_pinned && (
          <div
            style={{
              marginLeft: 8,
              color: "#2563EB",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            Pinned
          </div>
        )}

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 7,
          }}
        >
          <IconButton
            title="View"
            onClick={() =>
              onView(note)
            }
          >
            <Eye size={15} />
          </IconButton>

          <IconButton
            title={
              note.is_pinned
                ? "Unpin"
                : "Pin"
            }
            onClick={() =>
              onPin(note)
            }
          >
            <Pin size={15} />
          </IconButton>

          <IconButton
            title="Edit"
            onClick={() =>
              onEdit(note)
            }
          >
            <Pencil size={15} />
          </IconButton>

          <IconButton
            title="Delete"
            onClick={() =>
              onDelete(note)
            }
            danger
          >
            <Trash2 size={15} />
          </IconButton>
        </div>
      </div>

      <h3
        style={{
          marginTop: 16,
          marginBottom: 0,
          fontSize: 17,
          color: "#111827",
          overflowWrap:
            "anywhere",
          wordBreak:
            "break-word",
        }}
      >
        {note.title}
      </h3>

      {note.client && (
        <div
          style={{
            color: "#2563EB",
            fontSize: 12,
            fontWeight: 650,
            marginTop: 6,
          }}
        >
          {note.client}
        </div>
      )}

      {note.due_date && (
        <div
          style={{
            marginTop: 12,
            display: "flex",
            alignItems:
              "center",
            gap: 7,
          }}
        >
          <CalendarDays
            size={14}
            color="#64748B"
          />

          <DueDateBadge
            date={note.due_date}
          />
        </div>
      )}

      <p
        style={{
          color: "#475569",
          fontSize: 13,
          lineHeight: 1.65,
          marginTop: 14,
          marginBottom: 10,

          display:
            "-webkit-box",

          WebkitLineClamp: 3,

          WebkitBoxOrient:
            "vertical",

          overflow: "hidden",

          overflowWrap:
            "anywhere",

          wordBreak:
            "break-word",

          whiteSpace:
            "pre-wrap",
        }}
      >
        {note.content}
      </p>

      <button
        type="button"
        onClick={() =>
          onView(note)
        }
        style={{
          border: 0,
          padding: 0,
          marginTop: 2,
          background:
            "transparent",
          color: "#2563EB",
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        View full note
      </button>

      <div
        style={{
          marginTop: 18,
          color: "#94A3B8",
          fontSize: 11,
        }}
      >
        Updated{" "}
        {new Date(
          note.updated_at
        ).toLocaleString()}
      </div>
    </div>
  );
}

function PriorityBadge({
  priority,
}: {
  priority: Priority;
}) {
  let background =
    "#F1F5F9";

  let color = "#475569";

  if (
    priority === "Important"
  ) {
    background = "#FEF3C7";
    color = "#B45309";
  }

  if (
    priority === "Follow Up"
  ) {
    background = "#EFF6FF";
    color = "#2563EB";
  }

  return (
    <div
      style={{
        background,
        color,
        padding: "5px 8px",
        borderRadius: 7,
        fontSize: 10,
        fontWeight: 700,
      }}
    >
      {priority}
    </div>
  );
}

function DueDateBadge({
  date,
}: {
  date: string;
}) {
  const today =
    getTodayDate();

  const overdue =
    date < today;

  const dueToday =
    date === today;

  let background =
    "#EFF6FF";

  let color = "#2563EB";

  let prefix = "Due";

  if (dueToday) {
    background = "#FEF3C7";
    color = "#B45309";
    prefix = "Today";
  }

  if (overdue) {
    background = "#FEF2F2";
    color = "#B91C1C";
    prefix = "Overdue";
  }

  const [
    year,
    month,
    day,
  ] = date.split("-");

  const formattedDate =
    `${day}/${month}/${year}`;

  return (
    <span
      style={{
        display:
          "inline-block",
        padding: "5px 8px",
        borderRadius: 7,
        background,
        color,
        fontSize: 10,
        fontWeight: 700,
      }}
    >
      {prefix} ·{" "}
      {formattedDate}
    </span>
  );
}

function IconButton({
  children,
  title,
  onClick,
  danger,
}: {
  children:
    React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        width: 32,
        height: 32,
        border:
          danger
            ? "1px solid #FECACA"
            : "1px solid #E5E7EB",
        borderRadius: 8,
        background: "#FFFFFF",
        color:
          danger
            ? "#B91C1C"
            : "#475569",
        display: "flex",
        alignItems:
          "center",
        justifyContent:
          "center",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function getTodayDate() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}