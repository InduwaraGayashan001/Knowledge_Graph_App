from pyvis.network import Network
import os

def visualize_graph(graph_documents, valid_edges = None, valid_node_ids = None):
    # Remove existing HTML file to ensure fresh creation
    if os.path.exists("knowledge_graph.html"):
        try:
            os.remove("knowledge_graph.html")
        except:
            pass

    # Create a fresh network
    net = Network(height="1200px", width="100%", directed=True,
                      notebook=False, bgcolor="#222222", font_color="white")
    
    nodes = graph_documents[0].nodes
    relationships = graph_documents[0].relationships

    # Build lookup for valid nodes
    node_dict = {node.id: node for node in nodes}
    
    # If valid_edges and valid_node_ids are not provided or empty, populate them
    if valid_edges is None or len(valid_edges) == 0:
        if valid_edges is None:
            valid_edges = []
        if valid_node_ids is None:
            valid_node_ids = set()
            
        # Filter out invalid edges and collect valid node IDs
        for rel in relationships:
            if rel.source.id in node_dict and rel.target.id in node_dict:
                valid_edges.append(rel)
                valid_node_ids.update([rel.source.id, rel.target.id])

    # Add valid nodes
    for node_id in valid_node_ids:
        node = node_dict[node_id]
        try:
            net.add_node(node.id, label=node.id, title=node.type, group=node.type)
        except:
            continue  # skip if error

    # Add valid edges
    for rel in valid_edges:
        try:
            net.add_edge(rel.source.id, rel.target.id, label=rel.type.lower())
        except:
            continue  # skip if error

    # Configure physics
    net.set_options("""
            {
                "physics": {
                    "forceAtlas2Based": {
                        "gravitationalConstant": -100,
                        "centralGravity": 0.01,
                        "springLength": 200,
                        "springConstant": 0.08
                    },
                    "minVelocity": 0.75,
                    "solver": "forceAtlas2Based"
                }
            }
            """)
    
    # Save the network as HTML
    net.save_graph("knowledge_graph.html")
    
    return net