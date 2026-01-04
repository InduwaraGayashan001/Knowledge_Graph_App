from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

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

@app.post("/api/generate-graph", response_model=GraphResponse)
async def generate_graph(request: CustomTextRequest):
    """Generate knowledge graph from text."""
    try:
        graph_documents = await generate_knowledge_graph(request.text)
        
        if not graph_documents or len(graph_documents) == 0:
            raise HTTPException(status_code=400, detail="No graph generated")
        
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
        
        return {
            "nodes": nodes_data,
            "edges": edges_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
