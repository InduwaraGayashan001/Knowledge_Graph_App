from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import json
import asyncio
import io
from PyPDF2 import PdfReader

from wikipedia_search import search_wikipedia
from generate_knowledge_graph import generate_knowledge_graph

app = FastAPI(title="Knowledge Graph API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class WikipediaSearchRequest(BaseModel):
    query: str

class CustomTextRequest(BaseModel):
    text: str

class PDFUploadRequest(BaseModel):
    pdf_base64: str  # Base64 encoded PDF content

class NodeFilterRequest(BaseModel):
    text: str
    selected_nodes: List[str]
    selected_edges: List[dict]

class Node(BaseModel):
    id: str
    type: str

class Edge(BaseModel):
    source: str
    target: str
    type: str

class GraphResponse(BaseModel):
    nodes: List[Node]
    edges: List[Edge]

@app.get("/")
async def root():
    return {"message": "Knowledge Graph API"}

@app.post("/api/wikipedia-search")
async def wikipedia_search(request: WikipediaSearchRequest):
    """Search Wikipedia and return the summary text."""
    try:
        text = search_wikipedia(request.query)
        if "error occurred" in text.lower():
            raise HTTPException(status_code=400, detail=text)
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload-file")
async def upload_file(file: UploadFile = File(...)):
    """Upload and extract text from PDF or TXT file."""
    try:
        # Check file type
        file_extension = file.filename.split('.')[-1].lower() if file.filename else ""
        
        if file_extension not in ['pdf', 'txt']:
            raise HTTPException(
                status_code=400, 
                detail="Only PDF and TXT files are supported"
            )
        
        # Read file content
        content = await file.read()
        
        # Extract text based on file type
        if file_extension == 'pdf':
            # Extract text from PDF
            pdf_reader = PdfReader(io.BytesIO(content))
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            
            if not text.strip():
                raise HTTPException(
                    status_code=400,
                    detail="Could not extract text from PDF"
                )
        else:  # txt file
            try:
                text = content.decode('utf-8')
            except UnicodeDecodeError:
                # Try different encodings
                try:
                    text = content.decode('latin-1')
                except:
                    raise HTTPException(
                        status_code=400,
                        detail="Could not decode text file"
                    )
        
        return {"text": text, "filename": file.filename}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-graph")
async def generate_graph(request: CustomTextRequest):
    """Generate knowledge graph from text with progress updates."""
    
    async def event_stream():
        try:
            progress_queue = asyncio.Queue()
            
            # Start graph generation in background
            async def generate_with_progress():
                return await generate_knowledge_graph(request.text, progress_callback=progress_queue)
            
            generation_task = asyncio.create_task(generate_with_progress())
            
            # Stream progress updates
            while not generation_task.done():
                try:
                    progress = await asyncio.wait_for(progress_queue.get(), timeout=0.1)
                    yield f"data: {json.dumps(progress)}\n\n"
                except asyncio.TimeoutError:
                    continue
            
            # Get the result
            graph_documents = await generation_task
            
            if not graph_documents or len(graph_documents) == 0:
                yield f"data: {json.dumps({'error': 'No graph generated'})}\n\n"
                return
            
            # Extract nodes and edges
            nodes_data = []
            edges_data = []
            
            graph_doc = graph_documents[0]
            node_dict = {node.id: node for node in graph_doc.nodes}
            
            # Collect valid edges
            for rel in graph_doc.relationships:
                if rel.source.id in node_dict and rel.target.id in node_dict:
                    edges_data.append({
                        "source": rel.source.id,
                        "target": rel.target.id,
                        "type": rel.type
                    })
            
            # Collect nodes that are part of relationships
            connected_node_ids = set()
            for edge in edges_data:
                connected_node_ids.add(edge["source"])
                connected_node_ids.add(edge["target"])
            
            # Add only connected nodes
            for node_id in connected_node_ids:
                node = node_dict[node_id]
                nodes_data.append({
                    "id": node.id,
                    "type": node.type
                })
            
            result = {
                "done": True,
                "nodes": nodes_data,
                "edges": edges_data
            }
            yield f"data: {json.dumps(result)}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(event_stream(), media_type="text/event-stream")

@app.post("/api/filter-graph", response_model=GraphResponse)
async def filter_graph(request: NodeFilterRequest):
    """Filter graph by selected nodes and edges."""
    try:
        # Return only the selected nodes and edges
        nodes_data = [{"id": node_id, "type": "Unknown"} for node_id in request.selected_nodes]
        edges_data = request.selected_edges
        
        return {
            "nodes": nodes_data,
            "edges": edges_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
