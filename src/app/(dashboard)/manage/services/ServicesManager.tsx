"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Search, X, Loader2, Save } from "lucide-react";
import {
  saveCategory, deleteCategory,
  saveSubcategory, deleteSubcategory,
  saveService, deleteService,
  type ActionResult,
} from "./actions";

interface Category { id: string; name: string; description: string | null; active: boolean; subCount: number; serviceCount: number }
interface Subcategory { id: string; name: string; active: boolean; serviceCategoryId: string; categoryName: string; serviceCount: number }
interface Service {
  id: string; name: string; active: boolean; taxPercent: number; sacCode: string | null; image: string | null;
  serviceCategoryId: string; serviceSubcategoryId: string | null; categoryName: string; subcategoryName: string | null; createdAt: string;
}

interface Props { categories: Category[]; subcategories: Subcategory[]; services: Service[] }

type Tab = "services" | "categories" | "subcategories";

const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const labelCls = "block text-sm font-medium text-slate-700 mb-1";
const UPLOAD_BASE = "/uploads";

function SaveBtn({ label = "Save" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 text-white font-medium px-4 py-2 text-sm">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      {pending ? "Saving..." : label}
    </button>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)] sticky top-0 bg-white">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/** Wraps a save action form; closes + refreshes on success. */
function useModalForm(action: (p: ActionResult | undefined, fd: FormData) => Promise<ActionResult>, onDone: () => void) {
  const [result, formAction] = useActionState<ActionResult | undefined, FormData>(action, undefined);
  const router = useRouter();
  useEffect(() => {
    if (result?.ok) { router.refresh(); onDone(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);
  return { result, formAction };
}

function DeleteBtn({ onDelete }: { onDelete: () => Promise<ActionResult> }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  return (
    <>
      <button
        onClick={() => {
          if (!confirm("Delete this item? This cannot be undone.")) return;
          setErr(null);
          start(async () => {
            const r = await onDelete();
            if (!r.ok) setErr(r.message);
            else router.refresh();
          });
        }}
        disabled={pending}
        className="text-slate-400 hover:text-red-600 disabled:opacity-50"
        title={err ?? "Delete"}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>
      {err && <span className="sr-only">{err}</span>}
    </>
  );
}

export function ServicesManager({ categories, subcategories, services }: Props) {
  const [tab, setTab] = useState<Tab>("services");
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<null | { type: Tab; editing?: Category | Subcategory | Service }>(null);

  const close = () => setModal(null);
  const search = q.trim().toLowerCase();

  const fServices = services.filter((s) =>
    !search || s.name.toLowerCase().includes(search) || s.categoryName.toLowerCase().includes(search) || (s.subcategoryName ?? "").toLowerCase().includes(search));
  const fCategories = categories.filter((c) => !search || c.name.toLowerCase().includes(search));
  const fSubs = subcategories.filter((s) => !search || s.name.toLowerCase().includes(search) || s.categoryName.toLowerCase().includes(search));

  const tabs: { key: Tab; label: string }[] = [
    { key: "services", label: "Services" },
    { key: "categories", label: "Categories" },
    { key: "subcategories", label: "Sub Categories" },
  ];

  const createLabel = tab === "services" ? "Service" : tab === "categories" ? "Category" : "Sub Category";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Services Management</h1>
        <p className="text-sm text-slate-500 mt-1">Manage categories, sub categories and services from a single place.</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--border)] flex gap-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setQ(""); }}
            className={`pb-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." className={`${inputCls} pl-9`} />
        </div>
        <button
          onClick={() => setModal({ type: tab })}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium px-4 py-2"
        >
          <Plus className="h-4 w-4" /> Create {createLabel}
        </button>
      </div>

      {/* Tables */}
      <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          {tab === "services" && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Subcategory</th>
                  <th className="px-4 py-3 font-medium">Service Name</th>
                  <th className="px-4 py-3 font-medium">Tax %</th>
                  <th className="px-4 py-3 font-medium">SAC</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {fServices.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No services yet. Click “Create Service”.</td></tr>}
                {fServices.map((s, i) => (
                  <tr key={s.id} className="border-b border-[var(--border)] last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-3 text-slate-700">{s.categoryName}</td>
                    <td className="px-4 py-3 text-slate-600">{s.subcategoryName ?? "—"}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {s.name}
                      {!s.active && <span className="ml-2 text-xs text-slate-400">(inactive)</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.taxPercent}%</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{s.sacCode ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => setModal({ type: "services", editing: s })} className="text-slate-400 hover:text-[var(--accent)]"><Pencil className="h-4 w-4" /></button>
                        <DeleteBtn onDelete={() => deleteService(s.id)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "categories" && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Sub Categories</th>
                  <th className="px-4 py-3 font-medium">Services</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {fCategories.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No categories.</td></tr>}
                {fCategories.map((c, i) => (
                  <tr key={c.id} className="border-b border-[var(--border)] last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                    <td className="px-4 py-3 text-slate-600">{c.subCount}</td>
                    <td className="px-4 py-3 text-slate-600">{c.serviceCount}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                        {c.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => setModal({ type: "categories", editing: c })} className="text-slate-400 hover:text-[var(--accent)]"><Pencil className="h-4 w-4" /></button>
                        <DeleteBtn onDelete={() => deleteCategory(c.id)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "subcategories" && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Sub Category</th>
                  <th className="px-4 py-3 font-medium">Services</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {fSubs.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No sub categories.</td></tr>}
                {fSubs.map((s, i) => (
                  <tr key={s.id} className="border-b border-[var(--border)] last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-3 text-slate-700">{s.categoryName}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                    <td className="px-4 py-3 text-slate-600">{s.serviceCount}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                        {s.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => setModal({ type: "subcategories", editing: s })} className="text-slate-400 hover:text-[var(--accent)]"><Pencil className="h-4 w-4" /></button>
                        <DeleteBtn onDelete={() => deleteSubcategory(s.id)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal?.type === "categories" && (
        <CategoryModal editing={modal.editing as Category | undefined} onClose={close} />
      )}
      {modal?.type === "subcategories" && (
        <SubcategoryModal editing={modal.editing as Subcategory | undefined} categories={categories} onClose={close} />
      )}
      {modal?.type === "services" && (
        <ServiceModal editing={modal.editing as Service | undefined} categories={categories} subcategories={subcategories} onClose={close} />
      )}
    </div>
  );
}

function FormError({ result }: { result?: ActionResult }) {
  if (!result || result.ok) return null;
  return <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{result.message}</p>;
}

function CategoryModal({ editing, onClose }: { editing?: Category; onClose: () => void }) {
  const { result, formAction } = useModalForm(saveCategory, onClose);
  return (
    <Modal title={editing ? "Edit Category" : "Create Category"} onClose={onClose}>
      <form action={formAction} className="space-y-4">
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <div><label className={labelCls}>Name *</label><input name="name" required defaultValue={editing?.name} className={inputCls} /></div>
        <div><label className={labelCls}>Description</label><input name="description" defaultValue={editing?.description ?? ""} className={inputCls} /></div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="hidden" name="active" value="false" />
          <input type="checkbox" name="active" value="true" defaultChecked={editing?.active ?? true} /> Active
        </label>
        <FormError result={result} />
        <div className="flex justify-end gap-2"><SaveBtn /></div>
      </form>
    </Modal>
  );
}

function SubcategoryModal({ editing, categories, onClose }: { editing?: Subcategory; categories: Category[]; onClose: () => void }) {
  const { result, formAction } = useModalForm(saveSubcategory, onClose);
  return (
    <Modal title={editing ? "Edit Sub Category" : "Create Sub Category"} onClose={onClose}>
      <form action={formAction} className="space-y-4">
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <div>
          <label className={labelCls}>Category *</label>
          <select name="serviceCategoryId" required defaultValue={editing?.serviceCategoryId ?? ""} className={inputCls}>
            <option value="">Select</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div><label className={labelCls}>Sub Category Name *</label><input name="name" required defaultValue={editing?.name} className={inputCls} /></div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="hidden" name="active" value="false" />
          <input type="checkbox" name="active" value="true" defaultChecked={editing?.active ?? true} /> Active
        </label>
        <FormError result={result} />
        <div className="flex justify-end gap-2"><SaveBtn /></div>
      </form>
    </Modal>
  );
}

function ServiceModal({ editing, categories, subcategories, onClose }: { editing?: Service; categories: Category[]; subcategories: Subcategory[]; onClose: () => void }) {
  const { result, formAction } = useModalForm(saveService, onClose);
  const [catId, setCatId] = useState(editing?.serviceCategoryId ?? "");
  const subs = subcategories.filter((s) => s.serviceCategoryId === catId);
  return (
    <Modal title={editing ? "Edit Service" : "Create Service"} onClose={onClose}>
      <form action={formAction} className="space-y-4">
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Category *</label>
            <select name="serviceCategoryId" required value={catId} onChange={(e) => setCatId(e.target.value)} className={inputCls}>
              <option value="">Select</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Sub Category</label>
            <select name="serviceSubcategoryId" defaultValue={editing?.serviceSubcategoryId ?? ""} className={inputCls}>
              <option value="">None</option>
              {subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2"><label className={labelCls}>Service Name *</label><input name="name" required defaultValue={editing?.name} className={inputCls} /></div>
          <div><label className={labelCls}>Tax %</label><input name="taxPercent" inputMode="decimal" defaultValue={editing?.taxPercent ?? 0} className={inputCls} /></div>
          <div><label className={labelCls}>SAC / HSN Code</label><input name="sacCode" defaultValue={editing?.sacCode ?? ""} className={inputCls} /></div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Image</label>
            <input name="image" type="file" accept="image/*" className={inputCls} />
            {editing?.image && (
              <a href={`${UPLOAD_BASE}/${editing.image}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--accent)] hover:underline mt-1 inline-block">Current image</a>
            )}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="hidden" name="active" value="false" />
          <input type="checkbox" name="active" value="true" defaultChecked={editing?.active ?? true} /> Active
        </label>
        <FormError result={result} />
        <div className="flex justify-end gap-2"><SaveBtn /></div>
      </form>
    </Modal>
  );
}
