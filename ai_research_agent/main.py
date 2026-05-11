"""
main.py - AI Research Agent
FastAPI + LangGraph + Tavily Search + RAG (ChromaDB)
"""
 
import os
import json
import asyncio
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv
 
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage
 
from agent.graph import research_agent, AgentState
 
load_dotenv()
 
# ── APP SETUP ──────────────────────────────────────────────────────
app = FastAPI(
    title="AI Research Agent",
    description="FastAPI + LangGraph + Tavily + RAG (ChromaDB) — Deep Research + Document Search + Code Execution",
    version="2.0.0"
)
 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
 
 
# ── MODELS ─────────────────────────────────────────────────────────
class ResearchRequest(BaseModel):
    query: str = Field(..., example="Pakistan economy 2025")
    deep_search: bool = Field(True)
    language: str = Field("english")
 
class ExecuteRequest(BaseModel):
    task: str = Field(..., example="Python mein fibonacci banao")
    code: Optional[str] = Field(None)
    research_first: bool = Field(False)
 
class ChatRequest(BaseModel):
    message: str
    history: list = Field([])
    session_id: str = Field("default")
 
 
# ── HELPERS ────────────────────────────────────────────────────────
def extract_sources(search_results: list) -> list:
    sources = []
    for r in search_results:
        if isinstance(r, dict) and r.get("url"):
            sources.append({
                "title": r.get("title", "No title"),
                "url": r.get("url", ""),
                "snippet": (r.get("content", "")[:200] + "...") if r.get("content") else ""
            })
    return sources
 
 
def get_lang_instruction(lang: str) -> str:
    return {
        "english": "Respond in English.",
        "urdu": "پوری response اردو میں دو۔",
        "urdu_english": "Mix Urdu and English. Use English for technical terms."
    }.get(lang, "Respond in English.")
 
 
def get_last_ai_message(state) -> str:
    for msg in reversed(state["messages"]):
        if hasattr(msg, 'content') and msg.content and not hasattr(msg, 'tool_calls'):
            return msg.content
    return ""
 
 
# ── ROUTES ─────────────────────────────────────────────────────────
 
@app.get("/")
async def root():
    return {
        "name": "AI Research Agent v2.0",
        "status": "running ✅",
        "endpoints": {
            "POST /research": "Deep web research",
            "POST /research/stream": "Real-time streaming research",
            "POST /execute": "Code/task execution",
            "POST /chat": "General chat with RAG support",
            "POST /docs/upload": "Upload document to permanent KB",
            "POST /docs/upload/temp": "Upload temporary document (session)",
            "GET /docs/list": "List all documents in KB",
            "DELETE /docs/{doc_hash}": "Delete document from KB",
            "POST /docs/search": "Search documents directly",
            "GET /health": "Health check"
        },
        "docs": "http://localhost:8000/docs"
    }
 
 
@app.get("/health")
async def health():
    groq_ok = os.getenv("GROQ_API_KEY", "").startswith("gsk_")
    tavily_ok = os.getenv("TAVILY_API_KEY", "").startswith("tvly-")
    try:
        from agent.rag import get_collection
        col = get_collection()
        doc_count = col.count()
        rag_ok = True
    except Exception as e:
        doc_count = 0
        rag_ok = False
 
    return {
        "status": "healthy" if (groq_ok and tavily_ok) else "keys missing",
        "groq_key": "SET" if groq_ok else "MISSING",
        "tavily_key": "SET" if tavily_ok else "MISSING",
        "model": os.getenv("LLM_MODEL", "llama-3.3-70b-versatile"),
        "rag_status": "ready ✅" if rag_ok else "not initialized",
        "documents_in_kb": doc_count,
        "time": datetime.now().isoformat()
    }
 
 
# ── DOCUMENT ROUTES ────────────────────────────────────────────────
 
@app.post("/docs/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Document ko permanent ChromaDB knowledge base mein upload karo.
    Supported: PDF, DOCX, TXT, CSV
    """
    try:
        from agent.rag import add_document
        allowed = [".pdf", ".docx", ".doc", ".txt", ".csv"]
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in allowed:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}. Allowed: {allowed}")
 
        file_bytes = await file.read()
        result = add_document(file_bytes, file.filename)
        return result
 
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})
 
 
@app.post("/docs/upload/temp")
async def upload_temp_document(
    file: UploadFile = File(...),
    session_id: str = Form("default")
):
    """
    Temporary document upload — session mein store hota hai.
    Server restart pe delete ho jata hai.
    """
    try:
        from agent.rag import add_temp_document
        allowed = [".pdf", ".docx", ".doc", ".txt", ".csv"]
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in allowed:
            raise HTTPException(status_code=400, detail=f"Unsupported file: {ext}")
 
        file_bytes = await file.read()
        result = add_temp_document(file_bytes, file.filename, session_id=session_id)
        return result
 
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})
 
 
@app.get("/docs/list")
async def list_documents():
    """Permanent knowledge base mein stored documents ki list"""
    try:
        from agent.rag import list_documents as _list
        docs = _list()
        return {"documents": docs, "total": len(docs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})
 
 
@app.delete("/docs/{doc_hash}")
async def delete_document(doc_hash: str):
    """Document ko permanent KB se delete karo"""
    try:
        from agent.rag import delete_document as _delete
        result = _delete(doc_hash)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})
 
 
class SearchDocsRequest(BaseModel):
    query: str
    session_id: Optional[str] = None
    top_k: int = 5
 
@app.post("/docs/search")
async def search_docs(request: SearchDocsRequest):
    """Documents mein directly search karo"""
    try:
        from agent.rag import search_documents, search_temp_documents
        results = []
 
        # Permanent KB search
        perm = search_documents(request.query, top_k=request.top_k)
        for r in perm:
            r["source"] = "permanent"
            results.append(r)
 
        # Temp session search
        if request.session_id:
            temp = search_temp_documents(request.query, session_id=request.session_id, top_k=request.top_k)
            for r in temp:
                r["source"] = "temporary"
                results.append(r)
 
        results.sort(key=lambda x: x["score"], reverse=True)
        return {"results": results[:request.top_k], "total": len(results)}
 
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})
 
 
# ── RESEARCH ROUTES ────────────────────────────────────────────────
 
@app.post("/research")
async def research(request: ResearchRequest):
    """Deep web research — structured report + URLs"""
    start = datetime.now()
    try:
        lang = get_lang_instruction(request.language)
        prompt = f"""{lang}
 
Research Task: {request.query}
 
{"Multiple search queries use karo. Comprehensive report chahiye." if request.deep_search else "Quick research karo."}
 
ZAROOR include karo:
- Executive Summary
- Numbered Key Findings
- ALL source URLs
- Analysis
"""
        state: AgentState = {
            "messages": [HumanMessage(content=prompt)],
            "query": request.query,
            "search_results": [],
            "research_report": "",
            "execution_result": "",
            "mode": "research",
            "steps_taken": ["Research started"]
        }
 
        result = research_agent.invoke(state, config={"recursion_limit": 25})
        secs = (datetime.now() - start).total_seconds()
 
        report = result.get("research_report") or get_last_ai_message(result)
        sources = extract_sources(result.get("search_results", []))
 
        return {
            "status": "success",
            "query": request.query,
            "report": report,
            "sources": sources,
            "total_sources": len(sources),
            "steps": result.get("steps_taken", []),
            "time_seconds": round(secs, 2)
        }
 
    except Exception as e:
        raise HTTPException(status_code=500, detail={
            "error": str(e),
            "fix": "GET /health se check karo"
        })
 
 
@app.post("/research/stream")
async def research_stream(request: ResearchRequest):
    """Real-time streaming research"""
 
    async def generate():
        try:
            prompt = f"Research karo: {request.query}\nDetailed report with all URLs."
            state: AgentState = {
                "messages": [HumanMessage(content=prompt)],
                "query": request.query,
                "search_results": [],
                "research_report": "",
                "execution_result": "",
                "mode": "research",
                "steps_taken": []
            }
 
            yield f"data: {json.dumps({'type': 'start', 'msg': 'Research shuru...'})}\n\n"
 
            async for event in research_agent.astream(state, config={"recursion_limit": 25}, stream_mode="updates"):
                for node, output in event.items():
                    if node == "tools":
                        yield f"data: {json.dumps({'type': 'searching', 'msg': 'Search ho rahi hai...'})}\n\n"
                    elif node == "compile_report":
                        report = output.get("research_report", "")
                        yield f"data: {json.dumps({'type': 'report', 'content': report})}\n\n"
                    steps = output.get("steps_taken", [])
                    if steps:
                        yield f"data: {json.dumps({'type': 'step', 'steps': steps})}\n\n"
                    await asyncio.sleep(0.05)
 
            yield f"data: {json.dumps({'type': 'done', 'msg': 'Complete!'})}\n\n"
 
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'msg': str(e)})}\n\n"
 
    return StreamingResponse(generate(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
 
 
@app.post("/execute")
async def execute(request: ExecuteRequest):
    """Code ya koi bhi task execute karo"""
    start = datetime.now()
    try:
        if request.code:
            prompt = f"Execute this Python code and show output:\n\n```python\n{request.code}\n```"
        else:
            prompt = f"""Task: {request.task}
 
{"Pehle research karo agar info chahiye." if request.research_first else "Directly karo."}
 
Steps:
1. Task samjho
2. Code likho
3. Execute karo
4. Output dikhao clearly"""
 
        state: AgentState = {
            "messages": [HumanMessage(content=prompt)],
            "query": request.task,
            "search_results": [],
            "research_report": "",
            "execution_result": "",
            "mode": "execute",
            "steps_taken": ["Execution started"]
        }
 
        result = research_agent.invoke(state, config={"recursion_limit": 20})
        secs = (datetime.now() - start).total_seconds()
 
        return {
            "status": "success",
            "task": request.task,
            "result": get_last_ai_message(result),
            "steps": result.get("steps_taken", []),
            "time_seconds": round(secs, 2)
        }
 
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})
 
 
@app.post("/chat")
async def chat(request: ChatRequest):
    """General chat — agent khud decide karta hai search/RAG karna hai ya nahi"""
    start = datetime.now()
    try:
        msgs = [HumanMessage(content=h["content"])
                for h in request.history[-6:] if h.get("role") == "user"]
        msgs.append(HumanMessage(content=request.message))
 
        state: AgentState = {
            "messages": msgs,
            "query": request.message,
            "search_results": [],
            "research_report": "",
            "execution_result": "",
            "mode": "chat",
            "steps_taken": []
        }
 
        result = research_agent.invoke(state, config={"recursion_limit": 15})
        secs = (datetime.now() - start).total_seconds()
 
        return {
            "status": "success",
            "message": request.message,
            "response": get_last_ai_message(result),
            "sources": extract_sources(result.get("search_results", [])),
            "steps": result.get("steps_taken", []),
            "time_seconds": round(secs, 2)
        }
 
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})
 
 
# ── START SERVER ───────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    print("""
╔══════════════════════════════════════════╗
║      AI Research Agent  v2.0            ║
║   FastAPI + LangGraph + RAG + Tavily    ║
╠══════════════════════════════════════════╣
║  API  →  http://localhost:8000          ║
║  DOCS →  http://localhost:8000/docs     ║
╚══════════════════════════════════════════╝
    """)
    uvicorn.run("main:app",
                host=os.getenv("HOST", "0.0.0.0"),
                port=int(os.getenv("PORT", 8000)),
                reload=True)