import { useEffect, useRef } from "react";
import { Network } from "vis-network";
import { GraphData } from "../api";
import { Box } from "@mui/material";

interface GraphVisualizationProps {
  data: GraphData;
}

const GraphVisualization = ({ data }: GraphVisualizationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Prepare nodes for vis-network
    const nodes = data.nodes.map((node) => ({
      id: node.id,
      label: node.id,
      title: node.type,
      group: node.type,
    }));

    // Prepare edges for vis-network
    const edges = data.edges.map((edge, index) => ({
      id: index,
      from: edge.source,
      to: edge.target,
      label: edge.type.toLowerCase(),
      arrows: "to",
    }));

    const graphData = {
      nodes,
      edges,
    };

    const options = {
      nodes: {
        shape: "dot",
        size: 16,
        font: {
          size: 14,
          color: "#ffffff",
        },
        borderWidth: 2,
        shadow: true,
      },
      edges: {
        width: 1,
        shadow: true,
        smooth: {
          enabled: true,
          type: "continuous",
          roundness: 0.5,
        },
        font: {
          size: 14,
          color: "#ffffff",
          align: "middle",
          strokeWidth: 0,
          strokeColor: "transparent",
        },
      },
      physics: {
        forceAtlas2Based: {
          gravitationalConstant: -100,
          centralGravity: 0.01,
          springLength: 200,
          springConstant: 0.08,
        },
        minVelocity: 0.75,
        solver: "forceAtlas2Based",
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
      },
    };

    // Destroy existing network if any
    if (networkRef.current) {
      networkRef.current.destroy();
    }

    // Create new network
    networkRef.current = new Network(containerRef.current, graphData, options);

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [data]);

  return (
    <Box
      ref={containerRef}
      sx={{
        width: "100%",
        height: "100%",
        position: "relative",
        backgroundColor: "#1a1a1a",
        "& canvas": {
          outline: "none",
        },
      }}
    />
  );
};

export default GraphVisualization;
