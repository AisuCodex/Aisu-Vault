"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getBrowserClient } from "../lib/supabase-browser";
import { ACCEPTED_FILE_TYPES, validateFile } from "../lib/file-validation";

type RecordItem = { id: number; title: string; type: "note" | "file"; collection_id: number | null; updated_at: string; archived: boolean; file_size: number | null; content: string | null; storage_path: string | null; file_name: string | null; mime_type: string | null };
type Collection = { id: number; name: string };
type UserProfile = { id: string; display_name: string; role: "user" | "admin"; disabled: boolean; created_at: string };
type ActivityLog = { id: number; actor_id: string | null; action: string; record_id: number | null; created_at: string };
const ACCEPTED_TYPES = ACCEPTED_FILE_TYPES;

function formatSize(bytes: number | null) { if (!bytes) return ""; if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`; return `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)); }

export default function Home() {
  const supabase = useMemo(() => getBrowserClient(), []);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [userName, setUserName] = useState("Aisu Codex");
  const [userEmail, setUserEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState<"library" | "admin">("library");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All items");
  const [showArchived, setShowArchived] = useState(false);
  const [modal, setModal] = useState<"note" | "file" | "collection" | null>(null);
  const [collectionName, setCollectionName] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [selectedCollection, setSelectedCollection] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [viewRecord, setViewRecord] = useState<RecordItem | null>(null);
  const [fileViewerUrl, setFileViewerUrl] = useState("");
  const [editingRecord, setEditingRecord] = useState<RecordItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const loadVault = useCallback(async () => {
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.assign("/login"); return; }
    setUserEmail(user.email ?? "");
    setUserName(user.user_metadata?.display_name || user.email?.split("@")[0] || "Aisu Codex");
    const recordsQuery = supabase.from("records").select("id,title,type,collection_id,updated_at,archived,file_size,content,storage_path,file_name,mime_type").order("updated_at", { ascending: false });
    if (!showArchived) recordsQuery.eq("archived", false);
    const [recordsResult, collectionsResult, profilesResult, activityResult] = await Promise.all([
      recordsQuery,
      supabase.from("collections").select("id,name").order("name"),
      supabase.from("profiles").select("id,display_name,role,disabled,created_at").order("created_at", { ascending: false }),
      supabase.from("activity_logs").select("id,actor_id,action,record_id,created_at").order("created_at", { ascending: false }).limit(20),
    ]);
    if (recordsResult.error) throw recordsResult.error;
    if (collectionsResult.error) throw collectionsResult.error;
    if (profilesResult.error) throw profilesResult.error;
    if (activityResult.error) throw activityResult.error;
    const loadedProfiles = (profilesResult.data ?? []) as UserProfile[];
    const ownProfile = loadedProfiles.find(profile => profile.id === user.id);
    if (ownProfile?.disabled) { await supabase.auth.signOut(); window.location.assign("/login"); return; }
    setIsAdmin(ownProfile?.role === "admin"); setRecords((recordsResult.data ?? []) as RecordItem[]); setCollections(collectionsResult.data ?? []); setProfiles(loadedProfiles); setActivityLogs((activityResult.data ?? []) as ActivityLog[]);
    setLoading(false);
  }, [supabase, showArchived]);

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

  function openEditNote(record: RecordItem) {
    setViewRecord(null);
    setEditingRecord(record);
    setEditTitle(record.title);
    setEditContent(record.content ?? "");
    setError("");
  }
  async function updateNote(event: FormEvent) {
    event.preventDefault();
    const title = editTitle.trim();
    if (!editingRecord || !title) return;
    setSaving(true); setError("");
    const { error: updateError } = await supabase.from("records").update({ title, content: editContent }).eq("id", editingRecord.id).eq("type", "note");
    if (updateError) setError(updateError.message);
    else { await logActivity("note_updated", editingRecord.id); setEditingRecord(null); setEditTitle(""); setEditContent(""); await loadVault(); }
    setSaving(false);
  }
  async function addCollection(event: FormEvent) {
    event.preventDefault();
    const name = collectionName.trim();
    if (!name) return;
    setSaving(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error: insertError } = await supabase.from("collections").insert({ owner_id: user.id, name });
    if (insertError) setError(insertError.code === "23505" ? "That collection already exists." : insertError.message);
    else { setCollectionName(""); setModal(null); await logActivity(`collection_created:${name}`); await loadVault(); }
    setSaving(false);
  }

  async function addNote(event: FormEvent) {
    event.preventDefault(); if (!noteTitle.trim()) return; setSaving(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error: insertError } = await supabase.from("records").insert({ owner_id: user.id, title: noteTitle.trim(), type: "note", content: noteContent, collection_id: selectedCollection ? Number(selectedCollection) : null });
    if (insertError) setError(insertError.message); else { setNoteTitle(""); setNoteContent(""); setSelectedCollection(""); setModal(null); await logActivity("note_created"); await loadVault(); }
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
    if (inserted.error) { await supabase.storage.from("vault-files").remove([path]); setError(inserted.error.message); } else { setSelectedCollection(""); setModal(null); await logActivity("file_uploaded"); await loadVault(); }
    setSaving(false);
  }

  async function removeRecord(record: RecordItem) {
    if (!window.confirm(`Delete “${record.title}”?`)) return;
    if (record.storage_path) await supabase.storage.from("vault-files").remove([record.storage_path]);
    const { error: deleteError } = await supabase.from("records").delete().eq("id", record.id);
    if (deleteError) setError(deleteError.message); else { await logActivity("record_deleted", record.id); setRecords(current => current.filter(item => item.id !== record.id)); }
  }
  async function getFileUrl(record: RecordItem) {
    if (!record.storage_path) throw new Error("This file has no storage path.");
    const { data, error: urlError } = await supabase.storage.from("vault-files").createSignedUrl(record.storage_path, 60);
    if (urlError) throw urlError;
    return data.signedUrl;
  }
  async function viewFile(record: RecordItem) {
    setError("");
    try { setFileViewerUrl(await getFileUrl(record)); setViewRecord(record); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to preview this file."); }
  }
  async function downloadRecord(record: RecordItem) {
    setError("");
    try {
      const signedUrl = await getFileUrl(record);
      const response = await fetch(signedUrl);
      if (!response.ok) throw new Error("The file could not be downloaded.");
      const blobUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = record.file_name || record.title;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(blobUrl);
      await logActivity("file_downloaded", record.id);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to download this file."); }
  }
  async function archiveRecord(record: RecordItem) {
    const { error: archiveError } = await supabase.from("records").update({ archived: !record.archived }).eq("id", record.id);
    if (archiveError) { setError(archiveError.message); return; }
    await logActivity(record.archived ? "record_restored" : "record_archived", record.id);
    await loadVault();
  }
  async function logActivity(action: string, recordId?: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("activity_logs").insert({ actor_id: user.id, action, record_id: recordId ?? null });
  }
  async function updateProfile(profile: UserProfile, changes: Partial<Pick<UserProfile, "role" | "disabled">>) {
    const { error: updateError } = await supabase.from("profiles").update(changes).eq("id", profile.id);
    if (updateError) setError(updateError.message); else { await logActivity(`profile_updated:${profile.id}`); await loadVault(); }
  }
  async function signOut() { await supabase.auth.signOut(); window.location.assign("/login"); }
  const totalFiles = records.filter(record => record.type === "file").length;

  if (loading) return <main className="shell"><section className="content"><div className="loading-state">Loading your vault…</div></section></main>;
  return <main className="shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark">◇</span><span>Aisu<span className="brand-accent">Vault</span></span></div><nav className="nav"><button className={view === "library" ? "nav-item active" : "nav-item"} onClick={() => setView("library")}><span>⌂</span> My library</button><div className="nav-label">COLLECTIONS</div>{collections.map(collection => <button className="nav-item" key={collection.id} onClick={() => { setCategory(collection.name); setView("library"); }}><span>▱</span> {collection.name}</button>)}<button className="nav-item" onClick={() => setModal("collection")}><span>＋</span> New collection</button><div className="nav-spacer" />{isAdmin && <button className={view === "admin" ? "nav-item active" : "nav-item"} onClick={() => setView("admin")}><span>⚙</span> Admin console</button>}</nav><div className="storage"><div className="storage-head"><span>Storage</span><b>{Math.min(100, Math.round(records.reduce((sum, item) => sum + (item.file_size ?? 0), 0) / (10 * 1024 * 1024 * 1024) * 100))}%</b></div><div className="progress"><i /></div><p>{formatSize(records.reduce((sum, item) => sum + (item.file_size ?? 0), 0)) || "0 KB"} of 10 GB used</p></div><div className="profile"><div className="avatar">{userName.slice(0, 2).toUpperCase()}</div><div><strong>{userName}</strong><span>{userEmail}</span></div><button className="dots" onClick={signOut} aria-label="Sign out">↪</button></div></aside>
    <section className="content"><header className="topbar"><div className="mobile-brand">◇ Aisu<span>Vault</span></div><div className="top-actions"><button className="button secondary" onClick={signOut}>Sign out</button><div className="top-avatar">{userName.slice(0, 2).toUpperCase()}</div></div></header>
      {error && <div className="error-banner" role="alert">{error}</div>}
      {view === "admin" && isAdmin ? <Admin records={records} profiles={profiles} activityLogs={activityLogs} onDelete={removeRecord} onUpdateProfile={updateProfile} /> : <><div className="welcome"><div><p className="eyebrow">PRIVATE LIBRARY</p><h1>Good morning, {userName} <span>✦</span></h1><p className="muted">Your knowledge, organized and within reach.</p></div><div className="actions"><button className="button secondary" onClick={() => setModal("note")}>＋ <span>New note</span></button><button className="button primary" onClick={() => setModal("file")}>↥ <span>Upload file</span></button></div></div><div className="stats"><div className="stat-card"><div className="stat-icon purple">▱</div><div><span>Total items</span><strong>{records.length}</strong></div></div><div className="stat-card"><div className="stat-icon gold">▤</div><div><span>Notes</span><strong>{records.filter(record => record.type === "note").length}</strong></div></div><div className="stat-card"><div className="stat-icon blue">↥</div><div><span>Files</span><strong>{totalFiles}</strong><small className="muted">in your vault</small></div></div></div><div className="section-head"><div><h2>All items</h2><p className="muted">Everything you&apos;ve saved in one place</p></div></div><div className="toolbar"><div className="search"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search your vault..." /></div><select value={category} onChange={event => setCategory(event.target.value)}>{categories.map(item => <option key={item}>{item}</option>)}</select><label className="archive-toggle"><input type="checkbox" checked={showArchived} onChange={event => setShowArchived(event.target.checked)} /> Show archived</label></div><div className="table-wrap"><table><thead><tr><th>Name</th><th>Type</th><th>Collection</th><th>Last updated</th><th /></tr></thead><tbody>{filtered.map(record => { const collection = collections.find(item => item.id === record.collection_id)?.name ?? "Unsorted"; return <tr key={record.id}><td><div className="record-name"><span className={record.type === "note" ? "record-icon note" : "record-icon file"}>{record.type === "note" ? "≡" : "▤"}</span><div><strong>{record.title}</strong>{record.file_size && <small>{formatSize(record.file_size)}</small>}</div></div></td><td><span className={record.type === "note" ? "pill note-pill" : "pill file-pill"}>{record.type === "note" ? "Note" : "File"}</span></td><td><span className="collection-dot" /> {collection}</td><td className="muted">{formatDate(record.updated_at)}</td><td><div className="row-actions"><button className="row-menu" onClick={() => archiveRecord(record)}>{record.archived ? "Restore" : "Archive"}</button><button className="row-menu" onClick={() => record.type === "file" ? viewFile(record) : setViewRecord(record)}>View</button>{record.type === "file" && <button className="row-menu" onClick={() => downloadRecord(record)}>Download</button>}<button className="row-menu danger" onClick={() => removeRecord(record)}>Delete</button></div></td></tr>; })}</tbody></table>{filtered.length === 0 && <div className="empty">{records.length ? "No items match your search." : "Your vault is empty. Create a note or upload a file to get started."}</div>}</div><p className="showing">Showing <b>{filtered.length}</b> of <b>{records.length}</b> items</p></>}
    </section>
    {viewRecord?.type === "note" && <div className="modal-backdrop" onClick={() => setViewRecord(null)}><article className="modal note-view-modal" role="dialog" aria-modal="true" aria-labelledby="note-view-title" onClick={event => event.stopPropagation()}><button type="button" className="close" onClick={() => setViewRecord(null)} aria-label="Close note">×</button><p className="eyebrow">NOTE</p><h2 id="note-view-title">{viewRecord.title}</h2><p className="note-view-meta">Updated {formatDate(viewRecord.updated_at)}</p><div className="note-view-content">{viewRecord.content || "This note has no content."}</div><div className="modal-actions"><button type="button" className="button secondary" onClick={() => openEditNote(viewRecord)}>Edit note</button><button type="button" className="button primary" onClick={() => setViewRecord(null)}>Done</button></div></article></div>}
    {viewRecord?.type === "file" && <div className="modal-backdrop" onClick={() => { setViewRecord(null); setFileViewerUrl(""); }}><article className="modal file-view-modal" role="dialog" aria-modal="true" aria-labelledby="file-view-title" onClick={event => event.stopPropagation()}><button type="button" className="close" onClick={() => { setViewRecord(null); setFileViewerUrl(""); }} aria-label="Close file preview">×</button><p className="eyebrow">FILE PREVIEW</p><h2 id="file-view-title">{viewRecord.title}</h2>{fileViewerUrl && viewRecord.mime_type?.startsWith("image/") ? <img className="file-image-preview" src={fileViewerUrl} alt={viewRecord.title} /> : fileViewerUrl ? <iframe className="file-iframe-preview" src={fileViewerUrl} title={viewRecord.title} /> : <div className="loading-state">Loading preview…</div>}<div className="modal-actions"><button type="button" className="button secondary" onClick={() => downloadRecord(viewRecord)}>Download file</button><button type="button" className="button primary" onClick={() => { setViewRecord(null); setFileViewerUrl(""); }}>Done</button></div></article></div>}
    {editingRecord && <div className="modal-backdrop"><form className="modal" onSubmit={updateNote}><button type="button" className="close" onClick={() => setEditingRecord(null)} aria-label="Close editor">×</button><p className="eyebrow">EDIT NOTE</p><h2>Update note</h2><label>Title<input required autoFocus maxLength={200} value={editTitle} onChange={event => setEditTitle(event.target.value)} /></label><label>Content<textarea value={editContent} onChange={event => setEditContent(event.target.value)} /></label><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setEditingRecord(null)}>Cancel</button><button disabled={saving} className="button primary">{saving ? "Saving…" : "Save changes"}</button></div></form></div>}
    {modal === "collection" && <div className="modal-backdrop"><form className="modal" onSubmit={addCollection}><button type="button" className="close" onClick={() => setModal(null)}>×</button><p className="eyebrow">ORGANIZE</p><h2>New collection</h2><label>Name<input required autoFocus maxLength={80} value={collectionName} onChange={event => setCollectionName(event.target.value)} placeholder="e.g. Research" /></label><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setModal(null)}>Cancel</button><button disabled={saving} className="button primary">{saving ? "Creating…" : "Create collection"}</button></div></form></div>}
    {modal === "note" && <div className="modal-backdrop"><form className="modal" onSubmit={addNote}><button type="button" className="close" onClick={() => setModal(null)}>×</button><p className="eyebrow">NEW ITEM</p><h2>Create a note</h2><label>Title<input required autoFocus value={noteTitle} onChange={event => setNoteTitle(event.target.value)} placeholder="e.g. Meeting notes" /></label><label>Collection<select value={selectedCollection} onChange={event => setSelectedCollection(event.target.value)}><option value="">Unsorted</option>{collections.map(collection => <option value={collection.id} key={collection.id}>{collection.name}</option>)}</select></label><label>Content<textarea value={noteContent} onChange={event => setNoteContent(event.target.value)} placeholder="Write something worth remembering..." /></label><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setModal(null)}>Cancel</button><button disabled={saving} className="button primary">{saving ? "Saving…" : "Save note"}</button></div></form></div>}
    {modal === "file" && <div className="modal-backdrop"><div className="modal"><button type="button" className="close" onClick={() => setModal(null)}>×</button><p className="eyebrow">PRIVATE UPLOAD</p><h2>Add a file</h2><label>Collection<select value={selectedCollection} onChange={event => setSelectedCollection(event.target.value)}><option value="">Unsorted</option>{collections.map(collection => <option value={collection.id} key={collection.id}>{collection.name}</option>)}</select></label><label className="dropzone"><span className="upload-icon">↥</span><strong>Choose a file to upload</strong><small>PDF, DOCX, XLSX, PNG or JPG up to 25 MB</small><input type="file" accept={ACCEPTED_TYPES.join(",")} onChange={addFile} disabled={saving} /></label><button className="button secondary full" onClick={() => setModal(null)}>Cancel</button></div></div>}
  </main>;
}

function Admin({ records, profiles, activityLogs, onDelete, onUpdateProfile }: { records: RecordItem[]; profiles: UserProfile[]; activityLogs: ActivityLog[]; onDelete: (record: RecordItem) => void; onUpdateProfile: (profile: UserProfile, changes: Partial<Pick<UserProfile, "role" | "disabled">>) => void }) { return <div className="admin-view"><div className="welcome"><div><p className="eyebrow">ADMIN CONSOLE</p><h1>Workspace overview</h1><p className="muted">Manage your vault and keep everything running smoothly.</p></div><span className="admin-badge">Administrator</span></div><div className="admin-grid"><div className="admin-card"><span className="stat-icon purple">▤</span><div><p>Content items</p><strong>{records.length}</strong></div></div><div className="admin-card"><span className="stat-icon blue">↥</span><div><p>Files</p><strong>{records.filter(record => record.type === "file").length}</strong></div></div><div className="admin-card"><span className="stat-icon gold">♙</span><div><p>Members</p><strong>{profiles.length}</strong></div></div></div><div className="admin-panel"><div className="section-head"><div><h2>Members</h2><p className="muted">Manage roles and account access</p></div></div><div className="admin-list">{profiles.map(profile => <div className="admin-row" key={profile.id}><span className="record-icon note">♙</span><div><strong>{profile.display_name || "Unnamed member"}</strong><small>{profile.id}</small></div><select value={profile.role} onChange={event => onUpdateProfile(profile, { role: event.target.value as UserProfile["role"] })} aria-label={`Role for ${profile.display_name || profile.id}`}><option value="user">User</option><option value="admin">Admin</option></select><button className="row-menu" onClick={() => onUpdateProfile(profile, { disabled: !profile.disabled })}>{profile.disabled ? "Enable" : "Disable"}</button></div>)}</div></div><div className="admin-panel"><div className="section-head"><div><h2>Activity log</h2><p className="muted">Recent workspace actions</p></div></div><div className="admin-list">{activityLogs.length === 0 && <p className="muted">No activity recorded yet.</p>}{activityLogs.map(log => <div className="admin-row" key={log.id}><span className="record-icon note">◉</span><div><strong>{log.action.replaceAll("_", " ")}</strong><small>{log.actor_id ?? "System"} · {formatDate(log.created_at)}</small></div></div>)}</div></div><div className="admin-panel"><div className="section-head"><div><h2>Recent content</h2><p className="muted">Review and manage workspace items</p></div></div><div className="admin-list">{records.slice(0, 10).map(record => <div className="admin-row" key={record.id}><span className="record-icon file">▤</span><div><strong>{record.title}</strong><small>{formatDate(record.updated_at)}</small></div><span className="status">{record.archived ? "Archived" : "Active"}</span><button className="row-menu" onClick={() => onDelete(record)}>Delete</button></div>)}</div></div></div>; }
