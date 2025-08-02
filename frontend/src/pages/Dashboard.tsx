import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { FormSummary } from '../types';
import { formsApi } from '../utils/api';
import Header from '../components/Header';

const Dashboard: React.FC = () => {
  const [summaries, setSummaries] = useState<FormSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newFormData, setNewFormData] = useState('');
  const [creating, setCreating] = useState(false);

  const loadSummaries = async () => {
    try {
      setLoading(true);
      const response = await formsApi.getSummaries();
      if (response.success && response.data) {
        setSummaries(response.data);
      } else {
        setError(response.message || 'Failed to load summaries');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load summaries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummaries();
  }, []);

  const handleCreateSummary = async () => {
    if (!newFormData.trim()) return;

    try {
      setCreating(true);
      const response = await formsApi.createSummary({ formData: newFormData });
      if (response.success) {
        setCreateDialogOpen(false);
        setNewFormData('');
        loadSummaries();
      } else {
        setError(response.message || 'Failed to create summary');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create summary');
    } finally {
      setCreating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <>
      <Header />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Dashboard
          </Typography>
          <Box>
            <IconButton onClick={loadSummaries} sx={{ mr: 1 }}>
              <RefreshIcon />
            </IconButton>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              New Summary
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {summaries.length === 0 ? (
              <Grid item xs={12}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 6 }}>
                    <UploadIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No form summaries yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Upload your first form to get started with AI-powered summarization
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => setCreateDialogOpen(true)}
                    >
                      Create First Summary
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ) : (
              summaries.map((summary) => (
                <Grid item xs={12} sm={6} md={4} key={summary.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
                          {summary.title}
                        </Typography>
                        <Chip
                          label={summary.status}
                          color={getStatusColor(summary.status) as any}
                          size="small"
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {summary.summary.length > 100
                          ? `${summary.summary.substring(0, 100)}...`
                          : summary.summary}
                      </Typography>
                      
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                        Created: {new Date(summary.createdAt).toLocaleDateString()}
                      </Typography>
                      
                      <Button
                        size="small"
                        startIcon={<ViewIcon />}
                        onClick={() => {
                          // Navigate to summary details
                        }}
                      >
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        )}

        {/* Create Summary Dialog */}
        <Dialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Create New Form Summary</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Form Data (JSON or text)"
              multiline
              rows={10}
              fullWidth
              variant="outlined"
              value={newFormData}
              onChange={(e) => setNewFormData(e.target.value)}
              placeholder="Paste your form data here..."
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreateSummary}
              variant="contained"
              disabled={creating || !newFormData.trim()}
            >
              {creating ? <CircularProgress size={20} /> : 'Create Summary'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
};

export default Dashboard;