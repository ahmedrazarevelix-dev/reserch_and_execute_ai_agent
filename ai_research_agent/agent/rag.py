"""
RAG Module - Vector DB + Document Processing
ChromaDB + Sentence Transformers (FREE)
Supports: PDF, Word, TXT, CSV
"""
 
import os
import json
import hashlib
from typing import List, Dict, Optional
from pathlib import Path
 
# Document loaders
import fitz  # PyMuPDF for PDF
import docx  # python-docx for Word
import csv
import io
 
# Vector DB
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
 
# ── CONFIG ─────────────────────────────────────────────────────────
CHROMA_DIR = os.getenv("CHROMA_DIR", "./chroma_db")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 500))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 50))
TOP_K = int(os.getenv("RAG_TOP_K", 5))
 
# ── EMBEDDING MODEL ────────────────────────────────────────────────
_embedder = None
 
def get_embedder():
    global _embedder
    if _embedder is None:
        print(f"Loading embedding model: {EMBEDDING_MODEL}")
        _embedder = SentenceTransformer(EMBEDDING_MODEL)
    return _embedder
 
 
# ── CHROMA CLIENT ──────────────────────────────────────────────────
_chroma_client = None
_collection = None
 
def get_collection():
    global _chroma_client, _collection
    if _collection is None:
        _chroma_client = chromadb.PersistentClient(
            path=CHROMA_DIR,
            settings=Settings(anonymized_telemetry=False)
        )
        _collection = _chroma_client.get_or_create_collection(
            name="research_docs",
            metadata={"hnsw:space": "cosine"}
        )
    return _collection
 
 
# ── TEXT CHUNKER ───────────────────────────────────────────────────
def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """Text ko chunks mein todta hai"""
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
        i += chunk_size - overlap
    return [c for c in chunks if len(c.strip()) > 50]
 
 
# ── DOCUMENT PARSERS ───────────────────────────────────────────────
def parse_pdf(file_bytes: bytes) -> str:
    """PDF se text extract karta hai"""
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    return text
 
 
def parse_docx(file_bytes: bytes) -> str:
    """Word document se text extract karta hai"""
    doc = docx.Document(io.BytesIO(file_bytes))
    return "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
 
 
def parse_txt(file_bytes: bytes) -> str:
    """TXT file se text extract karta hai"""
    return file_bytes.decode("utf-8", errors="ignore")
 
 
def parse_csv(file_bytes: bytes) -> str:
    """CSV file se text extract karta hai"""
    text = file_bytes.decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(text))
    rows = []
    for row in reader:
        rows.append(" | ".join([f"{k}: {v}" for k, v in row.items()]))
    return "\n".join(rows)
 
 
def parse_document(file_bytes: bytes, filename: str) -> str:
    """File type detect karke parse karta hai"""
    ext = Path(filename).suffix.lower()
    parsers = {
        ".pdf": parse_pdf,
        ".docx": parse_docx,
        ".doc": parse_docx,
        ".txt": parse_txt,
        ".csv": parse_csv,
    }
    parser = parsers.get(ext)
    if not parser:
        raise ValueError(f"Unsupported file type: {ext}")
    return parser(file_bytes)
 
 
# ── DOCUMENT STORAGE ───────────────────────────────────────────────
def add_document(file_bytes: bytes, filename: str, metadata: Dict = None) -> Dict:
    """
    Document ko ChromaDB mein store karta hai (permanent).
    Returns: stats dict
    """
    # Parse
    text = parse_document(file_bytes, filename)
    if not text.strip():
        return {"error": "Document mein koi text nahi mila"}
 
    # Chunk
    chunks = chunk_text(text)
    if not chunks:
        return {"error": "Chunks nahi bane"}
 
    # Embeddings
    embedder = get_embedder()
    embeddings = embedder.encode(chunks).tolist()
 
    # IDs
    doc_hash = hashlib.md5(file_bytes).hexdigest()[:8]
    ids = [f"{doc_hash}_{i}" for i in range(len(chunks))]
 
    # Metadata
    meta = metadata or {}
    meta["filename"] = filename
    meta["doc_hash"] = doc_hash
    metas = [meta.copy() for _ in chunks]
 
    # Store in ChromaDB
    collection = get_collection()
    collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=metas
    )
 
    return {
        "status": "success",
        "filename": filename,
        "chunks": len(chunks),
        "doc_hash": doc_hash,
        "characters": len(text)
    }
 
 
def search_documents(query: str, top_k: int = TOP_K, filename_filter: str = None) -> List[Dict]:
    """
    ChromaDB mein query se relevant chunks dhundta hai (permanent DB).
    """
    collection = get_collection()
    if collection.count() == 0:
        return []
 
    embedder = get_embedder()
    query_embedding = embedder.encode([query]).tolist()
 
    where = {"filename": filename_filter} if filename_filter else None
 
    results = collection.query(
        query_embeddings=query_embedding,
        n_results=min(top_k, collection.count()),
        where=where,
        include=["documents", "metadatas", "distances"]
    )
 
    output = []
    for i, doc in enumerate(results["documents"][0]):
        output.append({
            "content": doc,
            "filename": results["metadatas"][0][i].get("filename", "unknown"),
            "score": round(1 - results["distances"][0][i], 3)
        })
    return output
 
 
def list_documents() -> List[Dict]:
    """ChromaDB mein stored documents ki list"""
    collection = get_collection()
    if collection.count() == 0:
        return []
 
    results = collection.get(include=["metadatas"])
    seen = {}
    for meta in results["metadatas"]:
        h = meta.get("doc_hash", "unknown")
        if h not in seen:
            seen[h] = {
                "filename": meta.get("filename", "unknown"),
                "doc_hash": h
            }
    return list(seen.values())
 
 
def delete_document(doc_hash: str) -> Dict:
    """Document ko ChromaDB se delete karta hai"""
    collection = get_collection()
    results = collection.get(where={"doc_hash": doc_hash}, include=["metadatas"])
    if not results["ids"]:
        return {"error": "Document nahi mila"}
    collection.delete(ids=results["ids"])
    return {"status": "deleted", "doc_hash": doc_hash, "chunks_removed": len(results["ids"])}
 
 
# ── TEMPORARY SESSION SEARCH ───────────────────────────────────────
_session_store: Dict[str, List[Dict]] = {}
 
def add_temp_document(file_bytes: bytes, filename: str, session_id: str = "default") -> Dict:
    """
    Temporary document — session mein store hota hai, restart pe delete.
    """
    text = parse_document(file_bytes, filename)
    chunks = chunk_text(text)
    embedder = get_embedder()
    embeddings = embedder.encode(chunks).tolist()
 
    if session_id not in _session_store:
        _session_store[session_id] = []
 
    _session_store[session_id].append({
        "filename": filename,
        "chunks": chunks,
        "embeddings": embeddings
    })
 
    return {
        "status": "success",
        "filename": filename,
        "chunks": len(chunks),
        "session_id": session_id,
        "type": "temporary"
    }
 
 
def search_temp_documents(query: str, session_id: str = "default", top_k: int = TOP_K) -> List[Dict]:
    """Temporary session documents mein search"""
    if session_id not in _session_store or not _session_store[session_id]:
        return []
 
    embedder = get_embedder()
    query_emb = embedder.encode([query])[0]
 
    results = []
    for doc in _session_store[session_id]:
        for i, (chunk, emb) in enumerate(zip(doc["chunks"], doc["embeddings"])):
            import numpy as np
            score = float(np.dot(query_emb, emb) / (np.linalg.norm(query_emb) * np.linalg.norm(emb) + 1e-9))
            results.append({
                "content": chunk,
                "filename": doc["filename"],
                "score": round(score, 3)
            })
 
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_k]
 
 
def clear_temp_session(session_id: str = "default"):
    """Session ke temporary documents clear karta hai"""
    if session_id in _session_store:
        del _session_store[session_id]
    return {"status": "cleared", "session_id": session_id}