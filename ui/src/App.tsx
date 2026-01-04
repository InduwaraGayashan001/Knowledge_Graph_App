import { useState } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Drawer,
  TextField,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  CircularProgress,
  Alert,
  Stack,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  AppBar,
  Divider,
  Chip,
  InputLabel,
  LinearProgress,
} from "@mui/material";
import BubbleChartIcon from "@mui/icons-material/BubbleChart";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import WikipediaIcon from "@mui/icons-material/Language";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import FilterListIcon from "@mui/icons-material/FilterList";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import HubIcon from "@mui/icons-material/Hub";
import LinkIcon from "@mui/icons-material/Link";
import GraphVisualization from "./components/GraphVisualization";
import { searchWikipedia, GraphData, Edge } from "./api";

const drawerWidth = 340;

function App() {
  const [inputMethod, setInputMethod] = useState<"wikipedia" | "custom">(
    "wikipedia"
  );
  const [query, setQuery] = useState("");
  const [customText, setCustomText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<Edge[]>([]);
  const [nodeFilterMode, setNodeFilterMode] = useState<"all" | "custom">("all");
  const [edgeFilterMode, setEdgeFilterMode] = useState<"all" | "custom">("all");
  const [nodeDialogOpen, setNodeDialogOpen] = useState(false);
  const [edgeDialogOpen, setEdgeDialogOpen] = useState(false);
  const [tempSelectedNodes, setTempSelectedNodes] = useState<string[]>([]);
  const [tempSelectedEdges, setTempSelectedEdges] = useState<Edge[]>([]);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState("");
  const [totalChunks, setTotalChunks] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setProgress(0);
    setProgressStatus("Starting...");
    setTotalChunks(0);
    setCurrentChunk(0);

    try {
      let text = "";
      if (inputMethod === "wikipedia") {
        if (!query.trim()) {
          setError("Please enter a search query");
          setLoading(false);
          return;
        }
        text = await searchWikipedia(query);
      } else {
        if (!customText.trim()) {
          setError("Please enter some text");
          setLoading(false);
          return;
        }
        text = customText;
      }

      // Send POST data via fetch first
      fetch("http://localhost:8000/api/generate-graph", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      }).then(async (response) => {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) return;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = JSON.parse(line.substring(6));

              if (data.error) {
                setError(data.error);
                setLoading(false);
                return;
              }

              if (data.progress !== undefined) {
                setProgress(data.progress);
                setProgressStatus(data.status || "");
                setTotalChunks(data.total || 0);
                setCurrentChunk(data.current || 0);
              }

              if (data.done) {
                setGraphData({ nodes: data.nodes, edges: data.edges });
                setSelectedNodes(data.nodes.map((n: any) => n.id));
                setSelectedEdges(data.edges);
                setNodeFilterMode("all");
                setEdgeFilterMode("all");
                setLoading(false);
              }
            }
          }
        }
      });
    } catch (err: any) {
      setError(
        err.response?.data?.detail || err.message || "An error occurred"
      );
      setLoading(false);
    }
  };

  const availableEdges = graphData
    ? graphData.edges.filter(
        (edge) =>
          selectedNodes.includes(edge.source) &&
          selectedNodes.includes(edge.target)
      )
    : [];

  const handleNodeFilterModeChange = (mode: "all" | "custom") => {
    setNodeFilterMode(mode);
    if (mode === "all" && graphData) {
      setSelectedNodes(graphData.nodes.map((n) => n.id));
    } else if (mode === "custom") {
      setTempSelectedNodes([...selectedNodes]);
      setNodeDialogOpen(true);
    }
  };

  const handleEdgeFilterModeChange = (mode: "all" | "custom") => {
    setEdgeFilterMode(mode);
    if (mode === "all" && graphData) {
      setSelectedEdges(availableEdges);
    } else if (mode === "custom") {
      setTempSelectedEdges([...selectedEdges]);
      setEdgeDialogOpen(true);
    }
  };

  const handleNodeToggle = (nodeId: string) => {
    const currentIndex = tempSelectedNodes.indexOf(nodeId);
    const newSelected = [...tempSelectedNodes];

    if (currentIndex === -1) {
      newSelected.push(nodeId);
    } else {
      newSelected.splice(currentIndex, 1);
    }

    setTempSelectedNodes(newSelected);
  };

  const handleEdgeToggle = (edge: Edge) => {
    const currentIndex = tempSelectedEdges.findIndex(
      (e) =>
        e.source === edge.source &&
        e.target === edge.target &&
        e.type === edge.type
    );
    const newSelected = [...tempSelectedEdges];

    if (currentIndex === -1) {
      newSelected.push(edge);
    } else {
      newSelected.splice(currentIndex, 1);
    }

    setTempSelectedEdges(newSelected);
  };

  const handleNodeDialogClose = () => {
    setNodeDialogOpen(false);
    setNodeFilterMode("all");
  };

  const handleNodeDialogApply = () => {
    setSelectedNodes(tempSelectedNodes);
    // Filter edges based on selected nodes
    const validEdges = selectedEdges.filter(
      (edge) =>
        tempSelectedNodes.includes(edge.source) &&
        tempSelectedNodes.includes(edge.target)
    );
    setSelectedEdges(validEdges);
    setNodeDialogOpen(false);
  };

  const handleEdgeDialogClose = () => {
    setEdgeDialogOpen(false);
    setEdgeFilterMode("all");
  };

  const handleEdgeDialogApply = () => {
    setSelectedEdges(tempSelectedEdges);
    setEdgeDialogOpen(false);
  };

  const handleResetFilters = () => {
    if (graphData) {
      setSelectedNodes(graphData.nodes.map((n) => n.id));
      setSelectedEdges(graphData.edges);
      setNodeFilterMode("all");
      setEdgeFilterMode("all");
    }
  };

  const getEdgeLabel = (edge: Edge) =>
    `${edge.source} → ${edge.target} (${edge.type})`;

  const filteredGraphData: GraphData | null = graphData
    ? {
        nodes: graphData.nodes.filter((node) =>
          selectedNodes.includes(node.id)
        ),
        edges: selectedEdges,
      }
    : null;

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: "1px solid rgba(255, 255, 255, 0.12)",
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ mb: 3 }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                background: "linear-gradient(90deg, #2196f3, #4caf50)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              <AccountTreeIcon sx={{ fontSize: 32, color: "#2196f3" }} />
              <Typography variant="h5" fontWeight={600}>
                NeuroGraph
              </Typography>
            </Box>
          </Stack>

          <Divider sx={{ mb: 3 }} />

          <FormControl component="fieldset" sx={{ mb: 3 }}>
            <FormLabel
              component="legend"
              sx={{
                mb: 1.5,
                fontWeight: 500,
                fontSize: "0.875rem",
              }}
            >
              Input Method
            </FormLabel>
            <RadioGroup
              value={inputMethod}
              onChange={(e) =>
                setInputMethod(e.target.value as "wikipedia" | "custom")
              }
            >
              <FormControlLabel
                value="wikipedia"
                control={<Radio />}
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <WikipediaIcon fontSize="small" />
                    <span>Wikipedia Search</span>
                  </Stack>
                }
              />
              <FormControlLabel
                value="custom"
                control={<Radio />}
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextFieldsIcon fontSize="small" />
                    <span>Custom Text</span>
                  </Stack>
                }
              />
            </RadioGroup>
          </FormControl>

          {inputMethod === "wikipedia" ? (
            <TextField
              label="Search Query"
              variant="outlined"
              fullWidth
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., Artificial Intelligence"
              InputProps={{
                startAdornment: (
                  <WikipediaIcon sx={{ mr: 1, color: "action.active" }} />
                ),
              }}
            />
          ) : (
            <TextField
              label="Custom Text"
              variant="outlined"
              fullWidth
              multiline
              rows={8}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Enter any text to generate a knowledge graph..."
            />
          )}

          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleGenerate}
            disabled={loading}
            startIcon={<PlayArrowIcon />}
            sx={{
              mt: 3,
              py: 1.5,
              opacity: loading ? 0.5 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            Generate Graph
          </Button>

          {graphData && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Stack direction="row" spacing={2}>
                <Chip
                  icon={<HubIcon />}
                  label={`${graphData.nodes.length} Nodes`}
                  variant="outlined"
                  size="small"
                />
                <Chip
                  icon={<LinkIcon />}
                  label={`${graphData.edges.length} Edges`}
                  variant="outlined"
                  size="small"
                />
              </Stack>
            </Box>
          )}
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.default",
        }}
      >
        <AppBar
          position="static"
          color="default"
          elevation={0}
          sx={{
            borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
            bgcolor: "background.paper",
          }}
        >
          <Toolbar>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <BubbleChartIcon color="primary" />
              <Typography variant="h6" fontWeight="500">
                Graph Visualization
              </Typography>
            </Stack>
          </Toolbar>
        </AppBar>

        <Container
          maxWidth={false}
          sx={{ flexGrow: 1, py: 3, display: "flex", flexDirection: "column" }}
        >
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {/* Filter Controls */}
          {graphData && (
            <Paper elevation={0} variant="outlined" sx={{ p: 2.5, mb: 2 }}>
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                flexWrap="wrap"
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <FilterListIcon color="action" />
                  <Typography variant="subtitle1" fontWeight="500">
                    Filters
                  </Typography>
                </Stack>

                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Nodes</InputLabel>
                  <Select
                    value={nodeFilterMode}
                    label="Nodes"
                    onChange={(e) =>
                      handleNodeFilterModeChange(
                        e.target.value as "all" | "custom"
                      )
                    }
                    startAdornment={
                      <HubIcon fontSize="small" sx={{ mr: 0.5, ml: -0.5 }} />
                    }
                  >
                    <MenuItem value="all">
                      All Nodes ({graphData.nodes.length})
                    </MenuItem>
                    <MenuItem value="custom">Custom Selection</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Edges</InputLabel>
                  <Select
                    value={edgeFilterMode}
                    label="Edges"
                    onChange={(e) =>
                      handleEdgeFilterModeChange(
                        e.target.value as "all" | "custom"
                      )
                    }
                    startAdornment={
                      <LinkIcon fontSize="small" sx={{ mr: 0.5, ml: -0.5 }} />
                    }
                  >
                    <MenuItem value="all">
                      All Edges ({availableEdges.length})
                    </MenuItem>
                    <MenuItem value="custom">Custom Selection</MenuItem>
                  </Select>
                </FormControl>

                {(nodeFilterMode === "custom" ||
                  edgeFilterMode === "custom") && (
                  <Chip
                    label={`Filtered: ${selectedNodes.length} nodes, ${selectedEdges.length} edges`}
                    color="primary"
                    size="small"
                    variant="outlined"
                  />
                )}

                <Box sx={{ flexGrow: 1 }} />

                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RestartAltIcon />}
                  onClick={handleResetFilters}
                >
                  Reset Filters
                </Button>
              </Stack>
            </Paper>
          )}

          <Paper
            elevation={2}
            sx={{
              flexGrow: 1,
              position: "relative",
              bgcolor: "background.paper",
              borderRadius: 2,
              overflow: "hidden",
              minHeight: 0,
            }}
          >
            {loading ? (
              <Box
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                  width: "80%",
                  maxWidth: 500,
                }}
              >
                <Stack spacing={3} alignItems="center">
                  <CircularProgress size={64} thickness={4} />
                  <Box sx={{ width: "100%" }}>
                    <Typography variant="h6" color="text.primary" gutterBottom>
                      Generating Knowledge Graph
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      {progressStatus ||
                        "Analyzing text and extracting entities..."}
                    </Typography>

                    {totalChunks > 1 && (
                      <Box sx={{ width: "100%", mt: 2 }}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          sx={{ mb: 1 }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            Chunk {currentChunk} of {totalChunks}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {Math.round(progress)}%
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={progress}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: "rgba(255,255,255,0.1)",
                            "& .MuiLinearProgress-bar": {
                              borderRadius: 4,
                            },
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                </Stack>
              </Box>
            ) : filteredGraphData ? (
              <Box sx={{ width: "100%", height: "100%", position: "absolute" }}>
                <GraphVisualization data={filteredGraphData} />
              </Box>
            ) : (
              <Box
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              >
                <Stack spacing={2} alignItems="center" sx={{ p: 4 }}>
                  <AccountTreeIcon
                    sx={{ fontSize: 64, color: "text.disabled" }}
                  />
                  <Typography variant="h6" color="text.secondary">
                    No Graph Generated
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.disabled"
                    textAlign="center"
                  >
                    Enter a Wikipedia query or custom text in the sidebar to
                    generate a knowledge graph
                  </Typography>
                </Stack>
              </Box>
            )}
          </Paper>
        </Container>
      </Box>

      {/* Node Selection Dialog */}
      <Dialog
        open={nodeDialogOpen}
        onClose={handleNodeDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <HubIcon color="primary" />
            <span>Select Nodes to Display</span>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {tempSelectedNodes.length} of {graphData?.nodes.length} nodes
            selected
          </Typography>
          <List sx={{ maxHeight: 400, overflow: "auto" }}>
            {graphData?.nodes.map((node) => (
              <ListItem key={node.id} disablePadding>
                <ListItemButton onClick={() => handleNodeToggle(node.id)} dense>
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={tempSelectedNodes.indexOf(node.id) !== -1}
                      tabIndex={-1}
                      disableRipple
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={node.id}
                    secondary={node.type}
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleNodeDialogClose} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleNodeDialogApply} variant="contained">
            Apply Selection
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edge Selection Dialog */}
      <Dialog
        open={edgeDialogOpen}
        onClose={handleEdgeDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <LinkIcon color="primary" />
            <span>Select Edges to Display</span>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {tempSelectedEdges.length} of {availableEdges.length} edges selected
          </Typography>
          <List sx={{ maxHeight: 400, overflow: "auto" }}>
            {availableEdges.map((edge, index) => {
              const isChecked = tempSelectedEdges.some(
                (e) =>
                  e.source === edge.source &&
                  e.target === edge.target &&
                  e.type === edge.type
              );
              return (
                <ListItem key={index} disablePadding>
                  <ListItemButton onClick={() => handleEdgeToggle(edge)} dense>
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={isChecked}
                        tabIndex={-1}
                        disableRipple
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={getEdgeLabel(edge)}
                      primaryTypographyProps={{
                        fontWeight: 500,
                        fontSize: "0.875rem",
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleEdgeDialogClose} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleEdgeDialogApply} variant="contained">
            Apply Selection
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default App;
