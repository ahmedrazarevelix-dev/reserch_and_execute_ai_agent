
"""
LangGraph Research Agent - Core Graph
Groq LLM + Tavily Search + Python Executor + Shell Executor + RAG
Groq = FREE + Ultra Fast (llama-3.3-70b)
"""

import os
import json
import subprocess
import tempfile
import operator
from typing import TypedDict, List, Annotated, Optional
from dotenv import load_dotenv
 
from langchain_groq import ChatGroq
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END, START
from langgraph.prebuilt import ToolNode
 
load_dotenv()
 
 
# ── STATE ──────────────────────────────────────────────────────────
class AgentState(TypedDict):
    messages: Annotated[list, operator.add]
    query: str
    search_results: List[dict]
    research_report: str
    execution_result: str
    mode: str
    steps_taken: List[str]  
 
 
# ── TOOLS ──────────────────────────────────────────────────────────
 
# FIX 1: max_results=3 (tokens bachane ke liye)
tavily_search = TavilySearchResults(
    max_results=3,
)
    
 
@tool
def search_knowledge_base(query: str) -> str:
    """
    Permanent knowledge base (ChromaDB) mein search karta hai.
    Uploaded documents mein se relevant information dhundta hai.
    Args:
        query: Search query
    Returns:
        Relevant document chunks
    """
    try:
        from agent.rag import search_documents
        results = search_documents(query, top_k=5)
        if not results:
            return "Knowledge base mein koi relevant document nahi mila. Pehle /docs/upload se documents add karo."
        output = []
        for r in results:
            output.append(f"[{r['filename']} | score: {r['score']}]\n{r['content']}")
        return "\n\n---\n\n".join(output)
    except Exception as e:
        return f"Knowledge base search error: {str(e)}"
 
 
@tool
def search_session_docs(query: str, session_id: str = "default") -> str:
    """
    Temporary uploaded documents mein search karta hai (current session).
    Args:
        query: Search query
        session_id: Session ID (default: 'default')
    Returns:
        Relevant chunks from temp documents
    """
    try:
        from agent.rag import search_temp_documents
        results = search_temp_documents(query, session_id=session_id, top_k=5)
        if not results:
            return "Is session mein koi temporary document nahi hai."
        output = []
        for r in results:
            output.append(f"[{r['filename']} | score: {r['score']}]\n{r['content']}")
        return "\n\n---\n\n".join(output)
    except Exception as e:
        return f"Session document search error: {str(e)}"
 
 
@tool
def execute_python(code: str) -> str:
    """
    Python code execute karta hai aur output return karta hai.
    Args:
        code: Python code string
    Returns:
        Code output ya error message
    """
    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(code)
            tmp_path = f.name
        result = subprocess.run(
            ['python', tmp_path],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            return f"SUCCESS:\n{result.stdout}"
        else:
            return f"ERROR:\n{result.stderr}"
    except subprocess.TimeoutExpired:
        return "TIMEOUT: Code 30 seconds se zyada chala"
    except Exception as e:
        return f"EXCEPTION: {str(e)}"
 
 
@tool
def execute_shell(command: str) -> str:
    """
    Safe shell commands execute karta hai.
    Args:
        command: Shell command
    Returns:
        Command output ya error
    """
    blocked = ['rm -rf', 'sudo', 'format', 'del /f', 'rmdir /s']
    for b in blocked:
        if b.lower() in command.lower():
            return f"BLOCKED: '{b}' command allowed nahi hai"
    try:
        result = subprocess.run(
            command, shell=True,
            capture_output=True, text=True, timeout=15
        )
        return result.stdout or result.stderr or "Command chala, koi output nahi"
    except Exception as e:
        return f"ERROR: {str(e)}"
 
 
ALL_TOOLS = [tavily_search, search_knowledge_base, search_session_docs, execute_python, execute_shell]
TOOL_NODE = ToolNode(ALL_TOOLS)
 
 
# ── GROQ LLM SETUP ─────────────────────────────────────────────────
def get_llm(with_tools: bool = True):
    llm = ChatGroq(
        model=os.getenv("LLM_MODEL", "llama-3.3-70b-versatile"),
        temperature=0,
        groq_api_key=os.getenv("GROQ_API_KEY"),
    )
    if with_tools:
        return llm.bind_tools(ALL_TOOLS)
    return llm

 
# ── SYSTEM PROMPT ──────────────────────────────────────────────────
SYSTEM_PROMPT = """You are an elite AI Research Agent with these capabilities:
 
1. RESEARCH: Deep web research using Tavily search
   - Search multiple times with different queries
   - Always include ALL source URLs
   - Verify from multiple sources
 
2. DOCUMENTS: Search uploaded documents using RAG
   - Use search_knowledge_base for permanent documents
   - Use search_session_docs for temporarily uploaded documents
   - Always mention which document the info came from
 
3. EXECUTE: Run code when user asks
   - Write and execute Python code
   - Show results clearly
 
DECISION RULES:
- If user mentions "document", "file", "uploaded" → use search_knowledge_base or search_session_docs
- If user asks about current events/news → use tavily_search
- If user asks to write/run code → use execute_python
- You can combine multiple tools in one response
 
ALWAYS format research reports like this:
---
## Research Report: [Topic]
 
### Executive Summary
[2-3 line summary]
 
### Key Findings
1. [Finding - Source: filename or URL]
2. [Finding - Source: filename or URL]
 
### Sources
1. [URL or Document name]
 
### Analysis
[Your analysis]
---
 
STRICT RULES:
- ALWAYS cite sources (URL or document filename)
- Be factual — never make up information
- For documents: mention the exact filename
"""
 
 
# ── NODES ──────────────────────────────────────────────────────────
 
def agent_node(state: AgentState) -> dict:
    """Main agent node - Groq LLM decide karta hai kya karna hai"""
    llm_with_tools = get_llm(with_tools=True)
    messages = [SystemMessage(content=SYSTEM_PROMPT)] + state["messages"][-4:]
    response = llm_with_tools.invoke(messages)
 
    steps = state.get("steps_taken", [])
    if hasattr(response, 'tool_calls') and response.tool_calls:
        for tc in response.tool_calls:
            steps.append(f"Tool used: {tc['name']}")
 
    return {"messages": [response], "steps_taken": steps}
 
 
def process_results_node(state: AgentState) -> dict:
    """Tavily search results parse karke store karta hai"""
    results = []
    steps = state.get("steps_taken", [])
    for msg in reversed(state["messages"]):
        if isinstance(msg, ToolMessage) and "tavily" in str(msg.name).lower():
            try:
                data = json.loads(msg.content) if isinstance(msg.content, str) else msg.content
                if isinstance(data, list):
                    results.extend(data)
                    steps.append(f"{len(data)} search results mile")
            except Exception:
                pass
            break
    return {"search_results": results, "steps_taken": steps}
 
 
# ── HELPER: Tavily results se URL list nikalo ──────────────────────
def _extract_url_sources(state: AgentState) -> list:
    """
    Tavily ToolMessages se actual URL + content pairs nikalta hai.
    Returns: [{"url": "...", "title": "...", "content": "..."}, ...]
    """
    sources = []
    seen = set()
 
    for msg in state["messages"]:
        if not isinstance(msg, ToolMessage):
            continue
        try:
            data = json.loads(msg.content) if isinstance(msg.content, str) else msg.content
            if not isinstance(data, list):
                continue
            for item in data:
                url = item.get("url", "")
                if url and url not in seen:
                    seen.add(url)
                    sources.append({
                        "url": url,
                        "title": item.get("title") or url,
                        "content": item.get("content", ""),
                    })
        except Exception:
            continue
 
    return sources
 
 
def compile_report_node(state: AgentState) -> dict:
    """Final plain text report — no JSON, no dictionary"""
    llm = get_llm(with_tools=False)

    url_sources = _extract_url_sources(state)

    if not url_sources:
        all_content = []
        for msg in state["messages"]:
            if isinstance(msg, ToolMessage):
                all_content.append(str(msg.content))
            elif isinstance(msg, AIMessage) and msg.content:
                all_content.append(msg.content)

        if not all_content:
            return {"research_report": "Koi data nahi mila.", "steps_taken": state.get("steps_taken", []) + ["Report compiled"]}

        prompt = f"""Write a clean research report in plain English.
Topic: {state.get('query', '')}
Data: {chr(10).join(all_content[-4:])}
Format: Executive Summary + Key Findings + Analysis. Plain text only, no JSON."""
        response = llm.invoke([HumanMessage(content=prompt)])
        return {"research_report": response.content.strip(), "steps_taken": state.get("steps_taken", []) + ["Report compiled"]}

    combined = ""
    for s in url_sources:
        combined += f"Source: {s['title']}\nURL: {s['url']}\n{s['content'][:800]}\n\n"

    prompt = f"""You are a research writer. Write a clean simple research report in plain English.

Topic: {state.get('query', '')}

Research Data:
{combined[:4000]}

RULES:
- Write like you are explaining to someone naturally
- No headings like Executive Summary, Key Findings, Analysis
- No bullet points, no numbering
- No bold text, no markdown
- Just simple flowing paragraphs like ChatGPT or Claude would write
- 3-4 paragraphs total
- Mention source names naturally in the text like "According to IBM..." or "Microsoft reports that..."
"""
    response = llm.invoke([HumanMessage(content=prompt)])
    steps = state.get("steps_taken", []) + ["Report compiled"]
    return {"research_report": response.content.strip(), "steps_taken": steps}
 
# ── ROUTING LOGIC ──────────────────────────────────────────────────
 
def should_continue(state: AgentState) -> str:
    """Agent ke baad: tool call hai toh tools, warna report banao"""
    last = state["messages"][-1]
    if hasattr(last, 'tool_calls') and last.tool_calls:
        return "use_tools"
    return "compile"
 
 
def after_tools(state: AgentState) -> str:
    """Tools ke baad: enough research ho gayi? Ya aur karo?"""
    tool_msgs = [m for m in state["messages"] if isinstance(m, ToolMessage)]
    if len(tool_msgs) >= 2:
        return "compile"
    return "agent"
 
 
# ── BUILD GRAPH ────────────────────────────────────────────────────
 
def build_graph():
    graph = StateGraph(AgentState)
 
    graph.add_node("agent", agent_node)
    graph.add_node("tools", TOOL_NODE)
    graph.add_node("process_results", process_results_node)
    graph.add_node("compile_report", compile_report_node)
 
    graph.add_edge(START, "agent")
    graph.add_conditional_edges("agent", should_continue, {
        "use_tools": "tools",
        "compile": "compile_report"
    })
    graph.add_edge("tools", "process_results")
    graph.add_conditional_edges("process_results", after_tools, {
        "agent": "agent",
        "compile": "compile_report"
    })
    graph.add_edge("compile_report", END)
 
    return graph.compile()
 
 
# Compiled agent - import karke use karo
research_agent = build_graph()
 