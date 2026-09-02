"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

type RecordItem = {
  id: number;
  title: string;
  type: "note" | "file";
  category: string;
  updated: string;
  size?: string;
  content?: string;
};

const starterRecords: RecordItem[] = [
  { id: 1, title: "Q4 planning notes", type: "note", category: "Work", updated: "Today", content: "Priorities, milestones, and team notes for the quarter." },
  { id: 2, title: "Product roadmap.pdf", type: "file", category: "Work", updated: "Yesterday", size: "2.4 MB" },
  { id: 3, title: "Travel checklist", type: "note", category: "Personal", updated: "Oct 18, 2024", content: "Passport, chargers, insurance, and reservations." },
  { id: 4, title: "Tax documents 2024.zip", type: "file", category: "Finance", updated: "Oct 12, 2024", size: "8.1 MB" },
  { id: 5, title: "Brand guidelines.pdf", type: "file", category: "Work", updated: "Oct 08, 2024", size: "4.7 MB" },
];

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Home() {
  const [records, setRecords] = useState<RecordItem[]>(() => {
    if (typeof window === "undefined") return starterRecords;
    const saved = window.localStorage.getItem("document-vault-records");
    return saved ? JSON.parse(saved) : starterRecords;
  });
  const [view, setView] = useState<"library" | "admin">("library");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All items");
  const [modal, setModal] = useState<"note" | "file" | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  useEffect(() => {
    window.localStorage.setItem("document-vault-records", JSON.stringify(records));
  }, [records]);

  const categories = ["All items", ...Array.from(new Set(records.map((record) => record.category)))];
  const filtered = useMemo(() => records.filter((record) => {
    const matchesQuery = record.title.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "All items" || record.category === category;
    return matchesQuery && matchesCategory;
  }), [records, query, category]);

  function addNote(event: FormEvent) {
    event.preventDefault();
    if (!noteTitle.trim()) return;
    setRecords([{ id: Date.now(), title: noteTitle.trim(), type: "note", category: "Personal", updated: "Just now", content: noteContent }, ...records]);
    setNoteTitle(""); setNoteContent(""); setModal(null);
  }

  function addFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setRecords([{ id: Date.now(), title: file.name, type: "file", category: "Personal", updated: "Just now", size: formatSize(file.size) }, ...records]);
    setModal(null);
  }

  function removeRecord(id: number) { setRecords(records.filter((record) => record.id !== id)); }

  const totalSize = records.reduce((total, record) => total + (record.type === "file" ? 1 : 0), 0);

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">◇</span><span>Aisu<span className="brand-accent">Vault</span></span></div>
        <nav className="nav">
          <button className={view === "library" ? "nav-item active" : "nav-item"} onClick={() => setView("library")}><span>⌂</span> My library</button>
          <button className="nav-item"><span>☆</span> Favorites <small>3</small></button>
          <div className="nav-label">COLLECTIONS</div>
          <button className="nav-item"><span>▱</span> Work <small>12</small></button>
          <button className="nav-item"><span>▱</span> Personal <small>8</small></button>
          <button className="nav-item"><span>▱</span> Finance <small>5</small></button>
          <button className="nav-item"><span>＋</span> New collection</button>
          <div className="nav-spacer" />
          <button className={view === "admin" ? "nav-item active" : "nav-item"} onClick={() => setView("admin")}><span>⚙</span> Admin console</button>
          <button className="nav-item"><span>?</span> Help & support</button>
        </nav>
        <div className="storage"><div className="storage-head"><span>Storage</span><b>24%</b></div><div className="progress"><i /></div><p>2.4 GB of 10 GB used</p><button>Upgrade storage <span>→</span></button></div>
        <div className="profile"><div className="avatar">AC</div><div><strong>Aisu Codex</strong><span>Free plan</span></div><span className="dots">•••</span></div>
      </aside>
      <section className="content">
        <header className="topbar"><div className="mobile-brand">◇ Aisu<span>Vault</span></div><div className="top-actions"><button className="icon-btn">⌕</button><button className="icon-btn">♧</button><div className="top-avatar">AC</div></div></header>
        {view === "admin" ? <Admin records={records} onDelete={removeRecord} /> : <>
          <div className="welcome"><div><p className="eyebrow">MONDAY, OCTOBER 21, 2024</p><h1>Good morning, Aisu <span>✦</span></h1><p className="muted">Your knowledge, organized and within reach.</p></div><div className="actions"><button className="button secondary" onClick={() => setModal("note")}>＋ <span>New note</span></button><button className="button primary" onClick={() => setModal("file")}>↥ <span>Upload file</span></button></div></div>
          <div className="stats"><div className="stat-card"><div className="stat-icon purple">▱</div><div><span>Total items</span><strong>{records.length}</strong><small className="green">↑ 12% <em>vs last month</em></small></div></div><div className="stat-card"><div className="stat-icon gold">▤</div><div><span>Notes</span><strong>{records.filter((record) => record.type === "note").length}</strong><small className="green">↑ 8% <em>vs last month</em></small></div></div><div className="stat-card"><div className="stat-icon blue">↥</div><div><span>Files</span><strong>{totalSize}</strong><small className="muted">of 10 GB storage</small></div></div><div className="stat-card"><div className="stat-icon green">♧</div><div><span>Shared with you</span><strong>7</strong><small className="green">↑ 3 <em>this week</em></small></div></div></div>
          <div className="section-head"><div><h2>All items</h2><p className="muted">Everything you&apos;ve saved in one place</p></div><div className="view-toggle"><button className="selected">▦</button><button>☷</button></div></div>
          <div className="toolbar"><div className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your vault..." /></div><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select><button className="filter">☷ <span>Filters</span></button></div>
          <div className="table-wrap"><table><thead><tr><th>Name</th><th>Type</th><th>Collection</th><th>Last updated</th><th></th></tr></thead><tbody>{filtered.map((record) => <tr key={record.id}><td><div className="record-name"><span className={record.type === "note" ? "record-icon note" : "record-icon file"}>{record.type === "note" ? "≡" : "▤"}</span><div><strong>{record.title}</strong>{record.size && <small>{record.size}</small>}</div></div></td><td><span className={record.type === "note" ? "pill note-pill" : "pill file-pill"}>{record.type === "note" ? "Note" : "PDF / File"}</span></td><td><span className="collection-dot" /> {record.category}</td><td className="muted">{record.updated}</td><td><button className="row-menu" onClick={() => removeRecord(record.id)}>•••</button></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty">No items match your search.</div>}</div>
          <p className="showing">Showing <b>{filtered.length}</b> of <b>{records.length}</b> items</p>
        </>}
      </section>
      {modal === "note" && <div className="modal-backdrop"><form className="modal" onSubmit={addNote}><button type="button" className="close" onClick={() => setModal(null)}>×</button><p className="eyebrow">NEW ITEM</p><h2>Create a note</h2><label>Title<input autoFocus value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} placeholder="e.g. Meeting notes" /></label><label>Content<textarea value={noteContent} onChange={(event) => setNoteContent(event.target.value)} placeholder="Write something worth remembering..." /></label><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setModal(null)}>Cancel</button><button className="button primary">Save note</button></div></form></div>}
      {modal === "file" && <div className="modal-backdrop"><div className="modal"><button type="button" className="close" onClick={() => setModal(null)}>×</button><p className="eyebrow">UPLOAD</p><h2>Add a file</h2><label className="dropzone"><span className="upload-icon">↥</span><strong>Choose a file to upload</strong><small>PDF, DOCX, XLSX, PNG or JPG up to 25 MB</small><input type="file" onChange={addFile} /></label><button className="button secondary full" onClick={() => setModal(null)}>Cancel</button></div></div>}
    </main>
  );
}

function Admin({ records, onDelete }: { records: RecordItem[]; onDelete: (id: number) => void }) {
  return <div className="admin-view"><div className="welcome"><div><p className="eyebrow">ADMIN CONSOLE</p><h1>Workspace overview</h1><p className="muted">Manage your vault and keep everything running smoothly.</p></div><span className="admin-badge">Administrator</span></div><div className="admin-grid"><div className="admin-card"><span className="stat-icon purple">♙</span><div><p>Total members</p><strong>24</strong><small className="green">↑ 6.4%</small></div></div><div className="admin-card"><span className="stat-icon blue">▤</span><div><p>Content items</p><strong>{records.length}</strong><small className="green">↑ 12.1%</small></div></div><div className="admin-card"><span className="stat-icon gold">◷</span><div><p>Storage used</p><strong>2.4 GB</strong><small className="muted">of 10 GB</small></div></div></div><div className="admin-panel"><div className="section-head"><div><h2>Recent content</h2><p className="muted">Review and manage workspace items</p></div><button className="button secondary">Export CSV</button></div><div className="admin-list">{records.slice(0, 5).map((record) => <div className="admin-row" key={record.id}><span className={record.type === "note" ? "record-icon note" : "record-icon file"}>{record.type === "note" ? "≡" : "▤"}</span><div><strong>{record.title}</strong><small>{record.category} · {record.updated}</small></div><span className="status">Active</span><button className="row-menu" onClick={() => onDelete(record.id)}>Delete</button></div>)}</div></div><div className="admin-panel"><div className="section-head"><div><h2>Admin tools</h2><p className="muted">Workspace controls and access management</p></div></div><div className="tool-cards"><button><b>♙ Manage members</b><span>Roles, access, and invitations →</span></button><button><b>◉ Activity log</b><span>Review recent workspace actions →</span></button><button><b>⚙ Workspace settings</b><span>Limits, branding, and preferences →</span></button></div></div></div>;
}
