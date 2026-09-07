"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getBrowserClient } from "../lib/supabase-browser";
import { ACCEPTED_FILE_TYPES, validateFile } from "../lib/file-validation";

type RecordItem = { id: number; title: string; type: "note" | "file"; collection_id: number | null; updated_at: string; file_size: number | null; content: string | null; storage_path: string | null; file_name: string | null };
type Collection = { id: number; name: string };
const ACCEPTED_TYPES = ACCEPTED_FILE_TYPES;

function formatSize(bytes: number | null) { if (!bytes) return ""; if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`; return `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)); }

export default function Home() {
  const supabase = useMemo(() => getBrowserClient(), []);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [userName, setUserName] = useState("Aisu Codex");
  const [userEmail, setUserEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState<"library" | "admin">("library");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All items");
  const [modal, setModal] = useState<"note" | "file" | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [selectedCollection, setSelectedCollection] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadVault = useCallback(async () => {
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.assign("/login"); return; }
    setUserEmail(user.email ?? "");
    setUserName(user.user_metadata?.display_name || user.email?.split("@")[0] || "Aisu Codex");
    const [recordsResult, collectionsResult, profileResult] = await Promise.all([
      supabase.from("records").select("id,title,type,collection_id,updated_at,file_size,content,storage_path,file_name").eq("archived", false).order("updated_at", { ascending: false }),
      supabase.from("collections").select("id,name").order("name"),
      supabase.from("profiles").select("role,disabled").eq("id", user.id).single(),
    ]);
    if (recordsResult.error) throw recordsResult.error;
    if (collectionsResult.error) throw collectionsResult.error;
    if (profileResult.error && profileResult.error.code !== "PGRST116") throw profileResult.error;
    if (profileResult.data?.disabled) { await supabase.auth.signOut(); window.location.assign("/login"); return; }
    setIsAdmin(profileResult.data?.role === "admin"); setRecords((recordsResult.data ?? []) as RecordItem[]); setCollections(collectionsResult.data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const load = async () => {
      try { await loadVault(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load your vault."); setLoading(false); }
    };
    void load();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => { if (event === "SIGNED_OUT") window.location.assign("/login"); });
    return () => listener.subscription.unsubscribe();
  }, [loadVault, supabase]);

  const categories = ["All items", ...collections.map(collection => collection.name)];
  const filtered = useMemo(() => records.filter(record => {
    const collection = collections.find(item => item.id === record.collection_id)?.name ?? "Unsorted";
    return record.title.toLowerCase().includes(query.toLowerCase()) && (category === "All items" || collection === category);
  }), [records, collections, query, category]);

  async function addNote(event: FormEvent) {
    event.preventDefault(); if (!noteTitle.trim()) return; setSaving(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error: insertError } = await supabase.from("records").insert({ owner_id: user.id, title: noteTitle.trim(), type: "note", content: noteContent, collection_id: selectedCollection ? Number(selectedCollection) : null });
    if (insertError) setError(insertError.message); else { setNoteTitle(""); setNoteContent(""); setSelectedCollection(""); setModal(null); await loadVault(); }
    setSaving(false);
  }

  async function addFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return; setError("");
    const fileError = validateFile(file);
    if (fileError) { setError(fileError); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const upload = await supabase.storage.from("vault-files").upload(path, file, { contentType: file.type, upsert: false });
    if (upload.error) { setError(upload.error.message); setSaving(false); return; }
    const inserted = await supabase.from("records").insert({ owner_id: user.id, title: file.name, type: "file", storage_path: path, file_name: file.name, mime_type: file.type, file_size: file.size, collection_id: selectedCollection ? Number(selectedCollection) : null });
    if (inserted.error) { await supabase.storage.from("vault-files").remove([path]); setError(inserted.error.message); } else { setSelectedCollection(""); setModal(null); await loadVault(); }
    setSaving(false);
  }

  async function removeRecord(record: RecordItem) {
    if (!window.confirm(`Delete “${record.title}”?`)) return;
    if (record.storage_path) await supabase.storage.from("vault-files").remove([record.storage_path]);
    const { error: deleteError } = await supabase.from("records").delete().eq("id", record.id);
    if (deleteError) setError(deleteError.message); else setRecords(current => current.filter(item => item.id !== record.id));
  }
  async function signOut() { await supabase.auth.signOut(); window.location.assign("/login"); }
  const totalFiles = records.filter(record => record.type === "file").length;

  if (loading) return <main className="shell"><section className="content"><div className="loading-state">Loading your vault…</div></section></main>;
  return <main className="shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark">◇</span><span>Aisu<span className="brand-accent">Vault</span></span></div><nav className="nav"><button className={view === "library" ? "nav-item active" : "nav-item"} onClick={() => setView("library")}><span>⌂</span> My library</button><div className="nav-label">COLLECTIONS</div>{collections.map(collection => <button className="nav-item" key={collection.id} onClick={() => { setCategory(collection.name); setView("library"); }}><span>▱</span> {collection.name}</button>)}<button className="nav-item"><span>＋</span> New collection</button><div className="nav-spacer" />{isAdmin && <button className={view === "admin" ? "nav-item active" : "nav-item"} onClick={() => setView("admin")}><span>⚙</span> Admin console</button>}</nav><div className="storage"><div className="storage-head"><span>Storage</span><b>{Math.min(100, Math.round(records.reduce((sum, item) => sum + (item.file_size ?? 0), 0) / (10 * 1024 * 1024 * 1024) * 100))}%</b></div><div className="progress"><i /></div><p>{formatSize(records.reduce((sum, item) => sum + (item.file_size ?? 0), 0)) || "0 KB"} of 10 GB used</p></div><div className="profile"><div className="avatar">{userName.slice(0, 2).toUpperCase()}</div><div><strong>{userName}</strong><span>{userEmail}</span></div><button className="dots" onClick={signOut} aria-label="Sign out">↪</button></div></aside>
    <section className="content"><header className="topbar"><div className="mobile-brand">◇ Aisu<span>Vault</span></div><div className="top-actions"><button className="button secondary" onClick={signOut}>Sign out</button><div className="top-avatar">{userName.slice(0, 2).toUpperCase()}</div></div></header>
      {error && <div className="error-banner" role="alert">{error}</div>}
      {view === "admin" && isAdmin ? <Admin records={records} onDelete={removeRecord} /> : <><div className="welcome"><div><p className="eyebrow">PRIVATE LIBRARY</p><h1>Good morning, {userName} <span>✦</span></h1><p className="muted">Your knowledge, organized and within reach.</p></div><div className="actions"><button className="button secondary" onClick={() => setModal("note")}>＋ <span>New note</span></button><button className="button primary" onClick={() => setModal("file")}>↥ <span>Upload file</span></button></div></div><div className="stats"><div className="stat-card"><div className="stat-icon purple">▱</div><div><span>Total items</span><strong>{records.length}</strong></div></div><div className="stat-card"><div className="stat-icon gold">▤</div><div><span>Notes</span><strong>{records.filter(record => record.type === "note").length}</strong></div></div><div className="stat-card"><div className="stat-icon blue">↥</div><div><span>Files</span><strong>{totalFiles}</strong><small className="muted">in your vault</small></div></div></div><div className="section-head"><div><h2>All items</h2><p className="muted">Everything you&apos;ve saved in one place</p></div></div><div className="toolbar"><div className="search"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search your vault..." /></div><select value={category} onChange={event => setCategory(event.target.value)}>{categories.map(item => <option key={item}>{item}</option>)}</select></div><div className="table-wrap"><table><thead><tr><th>Name</th><th>Type</th><th>Collection</th><th>Last updated</th><th /></tr></thead><tbody>{filtered.map(record => { const collection = collections.find(item => item.id === record.collection_id)?.name ?? "Unsorted"; return <tr key={record.id}><td><div className="record-name"><span className={record.type === "note" ? "record-icon note" : "record-icon file"}>{record.type === "note" ? "≡" : "▤"}</span><div><strong>{record.title}</strong>{record.file_size && <small>{formatSize(record.file_size)}</small>}</div></div></td><td><span className={record.type === "note" ? "pill note-pill" : "pill file-pill"}>{record.type === "note" ? "Note" : "File"}</span></td><td><span className="collection-dot" /> {collection}</td><td className="muted">{formatDate(record.updated_at)}</td><td><button className="row-menu" onClick={() => removeRecord(record)}>Delete</button></td></tr>; })}</tbody></table>{filtered.length === 0 && <div className="empty">{records.length ? "No items match your search." : "Your vault is empty. Create a note or upload a file to get started."}</div>}</div><p className="showing">Showing <b>{filtered.length}</b> of <b>{records.length}</b> items</p></>}
    </section>
    {modal === "note" && <div className="modal-backdrop"><form className="modal" onSubmit={addNote}><button type="button" className="close" onClick={() => setModal(null)}>×</button><p className="eyebrow">NEW ITEM</p><h2>Create a note</h2><label>Title<input required autoFocus value={noteTitle} onChange={event => setNoteTitle(event.target.value)} placeholder="e.g. Meeting notes" /></label><label>Collection<select value={selectedCollection} onChange={event => setSelectedCollection(event.target.value)}><option value="">Unsorted</option>{collections.map(collection => <option value={collection.id} key={collection.id}>{collection.name}</option>)}</select></label><label>Content<textarea value={noteContent} onChange={event => setNoteContent(event.target.value)} placeholder="Write something worth remembering..." /></label><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setModal(null)}>Cancel</button><button disabled={saving} className="button primary">{saving ? "Saving…" : "Save note"}</button></div></form></div>}
    {modal === "file" && <div className="modal-backdrop"><div className="modal"><button type="button" className="close" onClick={() => setModal(null)}>×</button><p className="eyebrow">PRIVATE UPLOAD</p><h2>Add a file</h2><label>Collection<select value={selectedCollection} onChange={event => setSelectedCollection(event.target.value)}><option value="">Unsorted</option>{collections.map(collection => <option value={collection.id} key={collection.id}>{collection.name}</option>)}</select></label><label className="dropzone"><span className="upload-icon">↥</span><strong>Choose a file to upload</strong><small>PDF, DOCX, XLSX, PNG or JPG up to 25 MB</small><input type="file" accept={ACCEPTED_TYPES.join(",")} onChange={addFile} disabled={saving} /></label><button className="button secondary full" onClick={() => setModal(null)}>Cancel</button></div></div>}
  </main>;
}

function Admin({ records, onDelete }: { records: RecordItem[]; onDelete: (record: RecordItem) => void }) { return <div className="admin-view"><div className="welcome"><div><p className="eyebrow">ADMIN CONSOLE</p><h1>Workspace overview</h1><p className="muted">Manage your vault and keep everything running smoothly.</p></div><span className="admin-badge">Administrator</span></div><div className="admin-grid"><div className="admin-card"><span className="stat-icon purple">▤</span><div><p>Content items</p><strong>{records.length}</strong></div></div><div className="admin-card"><span className="stat-icon blue">↥</span><div><p>Files</p><strong>{records.filter(record => record.type === "file").length}</strong></div></div></div><div className="admin-panel"><div className="section-head"><div><h2>Recent content</h2><p className="muted">Review and manage workspace items</p></div></div><div className="admin-list">{records.slice(0, 10).map(record => <div className="admin-row" key={record.id}><span className="record-icon file">▤</span><div><strong>{record.title}</strong><small>{formatDate(record.updated_at)}</small></div><span className="status">Active</span><button className="row-menu" onClick={() => onDelete(record)}>Delete</button></div>)}</div></div></div>; }
