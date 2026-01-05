import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

export interface Node {
  id: string;
  type: string;
}

export interface Edge {
  source: string;
  target: string;
  type: string;
}

export interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

export const searchWikipedia = async (query: string): Promise<string> => {
  const response = await axios.post(`${API_BASE_URL}/api/wikipedia-search`, {
    query,
  });
  return response.data.text;
};

export const uploadFile = async (file: File): Promise<{ text: string; filename: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await axios.post(`${API_BASE_URL}/api/upload-file`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const generateGraph = async (text: string): Promise<GraphData> => {
  const response = await axios.post(`${API_BASE_URL}/api/generate-graph`, {
    text,
  });
  return response.data;
};

export const filterGraph = async (
  text: string,
  selectedNodes: string[],
  selectedEdges: Edge[]
): Promise<GraphData> => {
  const response = await axios.post(`${API_BASE_URL}/api/filter-graph`, {
    text,
    selected_nodes: selectedNodes,
    selected_edges: selectedEdges,
  });
  return response.data;
};
