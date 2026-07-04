"use client";

import { useState, useRef, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCw, Download, ExternalLink, FileText, ImageOff } from "lucide-react";

export interface DocFile {
  key: string;
  label: string;
  /** Same-origin URL, e.g. /uploads/document/T.../file.jpg */
  url: string;
  isImage: boolean;
}

interface Props {
  documents: DocFile[];
}

export function DocumentViewer({ documents }: Props) {
  const [active, setActive] = useState(0);
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef<{ x: number; y: number } | null>(null);

  const reset = useCallback(() => {
    setScale(1);
    setRotate(0);
    setOffset({ x: 0, y: 0 });
  }, []);

  const select = (i: number) => {
    setActive(i);
    reset();
  };

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <ImageOff className="h-8 w-8 mb-2" />
        <p className="text-sm">No documents uploaded yet.</p>
        <p className="text-xs mt-1">Documents appear here once the technician submits them from the mobile app.</p>
      </div>
    );
  }

  const doc = documents[Math.min(active, documents.length - 1)];

  const onMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    dragging.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    setOffset({ x: e.clientX - dragging.current.x, y: e.clientY - dragging.current.y });
  };
  const onMouseUp = () => { dragging.current = null; };

  return (
    <div>
      {/* Document type tabs */}
      <div className="flex flex-wrap gap-2 pb-4 border-b border-[var(--border)]">
        {documents.map((d, i) => (
          <button
            key={d.key}
            onClick={() => select(i)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              i === active
                ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                : "bg-white text-slate-600 border-slate-200 hover:border-[var(--accent)] hover:text-[var(--accent)]"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Viewer */}
      <div className="mt-4 rounded-lg bg-slate-100 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
          <span className="text-xs text-slate-500 truncate max-w-[40%]" title={doc.label}>{doc.label}</span>
          <div className="flex items-center gap-1">
            {doc.isImage && (
              <>
                <button onClick={() => setRotate((r) => r + 90)} title="Rotate" className="p-1.5 rounded hover:bg-slate-200 text-slate-600"><RotateCw className="h-4 w-4" /></button>
                <button onClick={() => setScale((s) => Math.max(0.5, s - 0.25))} title="Zoom out" className="p-1.5 rounded hover:bg-slate-200 text-slate-600"><ZoomOut className="h-4 w-4" /></button>
                <span className="text-xs text-slate-500 w-10 text-center">{Math.round(scale * 100)}%</span>
                <button onClick={() => setScale((s) => Math.min(4, s + 0.25))} title="Zoom in" className="p-1.5 rounded hover:bg-slate-200 text-slate-600"><ZoomIn className="h-4 w-4" /></button>
              </>
            )}
            <a href={doc.url} download title="Download" className="p-1.5 rounded hover:bg-slate-200 text-slate-600"><Download className="h-4 w-4" /></a>
            <a href={doc.url} target="_blank" rel="noopener noreferrer" title="Open in new tab" className="p-1.5 rounded hover:bg-slate-200 text-slate-600"><ExternalLink className="h-4 w-4" /></a>
          </div>
        </div>

        {/* Canvas */}
        <div
          className="relative h-[420px] flex items-center justify-center overflow-hidden select-none"
          style={{ cursor: doc.isImage && scale > 1 ? (dragging.current ? "grabbing" : "grab") : "default" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {doc.isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={doc.url}
              alt={doc.label}
              draggable={false}
              className="max-h-full max-w-full object-contain transition-transform"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotate}deg)`,
              }}
            />
          ) : (
            <div className="flex flex-col items-center text-slate-500">
              <FileText className="h-12 w-12 mb-3" />
              <p className="text-sm mb-3">This is a PDF / non-image file.</p>
              <a href={doc.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] text-white text-sm px-4 py-2 hover:bg-[var(--accent-hover)]">
                <ExternalLink className="h-4 w-4" /> Open document
              </a>
            </div>
          )}
        </div>
      </div>
      {doc.isImage && scale > 1 && (
        <p className="text-xs text-slate-400 mt-2 text-center">Drag to pan when zoomed in.</p>
      )}
    </div>
  );
}
