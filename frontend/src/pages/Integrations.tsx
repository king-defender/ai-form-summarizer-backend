import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  TestTube as TestIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { IntegrationSettings } from '../types';
import { integrationsApi } from '../utils/api';
import Header from '../components/Header';

const integrationTypes = [
  { value: 'webhook', label: 'Webhook' },
  { value: 'api', label: 'API' },
  { value: 'database', label: 'Database' },
];

const Integrations: React.FC = () => {
  const [integrations, setIntegrations] = useState<IntegrationSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<IntegrationSettings | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'webhook' as const,
    endpoint: '',
    apiKey: '',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const response = await integrationsApi.getAll();
      if (response.success && response.data) {
        setIntegrations(response.data);
      } else {
        setError(response.message || 'Failed to load integrations');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const handleOpenDialog = (integration?: IntegrationSettings) => {
    if (integration) {
      setEditingIntegration(integration);
      setFormData({
        name: integration.name,
        type: integration.type,
        endpoint: integration.endpoint,
        apiKey: integration.apiKey || '',
        isActive: integration.isActive,
      });
    } else {
      setEditingIntegration(null);
      setFormData({
        name: '',
        type: 'webhook',
        endpoint: '',
        apiKey: '',
        isActive: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingIntegration(null);
    setFormData({
      name: '',
      type: 'webhook',
      endpoint: '',
      apiKey: '',
      isActive: true,
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      let response;
      
      if (editingIntegration) {
        response = await integrationsApi.update(editingIntegration.id, formData);
      } else {
        response = await integrationsApi.create(formData);
      }

      if (response.success) {
        handleCloseDialog();
        loadIntegrations();
      } else {
        setError(response.message || 'Failed to save integration');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save integration');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this integration?')) {
      return;
    }

    try {
      const response = await integrationsApi.delete(id);
      if (response.success) {
        loadIntegrations();
      } else {
        setError(response.message || 'Failed to delete integration');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete integration');
    }
  };

  const handleTest = async (id: string) => {
    try {
      setTesting(id);
      const response = await integrationsApi.test(id);
      if (response.success) {
        alert('Integration test successful!');
      } else {
        alert(`Integration test failed: ${response.message}`);
      }
    } catch (err: any) {
      alert(`Integration test failed: ${err.message}`);
    } finally {
      setTesting(null);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'webhook':
        return 'primary';
      case 'api':
        return 'secondary';
      case 'database':
        return 'success';
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
            Integration Settings
          </Typography>
          <Box>
            <IconButton onClick={loadIntegrations} sx={{ mr: 1 }}>
              <RefreshIcon />
            </IconButton>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Add Integration
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
            {integrations.length === 0 ? (
              <Grid item xs={12}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 6 }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No integrations configured
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Add your first integration to connect with external services
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => handleOpenDialog()}
                    >
                      Add Integration
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ) : (
              integrations.map((integration) => (
                <Grid item xs={12} sm={6} md={4} key={integration.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" component="h2">
                          {integration.name}
                        </Typography>
                        <Box>
                          <Chip
                            label={integration.type.toUpperCase()}
                            color={getTypeColor(integration.type) as any}
                            size="small"
                            sx={{ mr: 1 }}
                          />
                          <Chip
                            label={integration.isActive ? 'Active' : 'Inactive'}
                            color={integration.isActive ? 'success' : 'default'}
                            size="small"
                          />
                        </Box>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {integration.endpoint}
                      </Typography>
                      
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                        Created: {new Date(integration.createdAt).toLocaleDateString()}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleTest(integration.id)}
                          disabled={testing === integration.id}
                        >
                          {testing === integration.id ? (
                            <CircularProgress size={16} />
                          ) : (
                            <TestIcon />
                          )}
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(integration)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(integration.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        )}

        {/* Add/Edit Integration Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingIntegration ? 'Edit Integration' : 'Add New Integration'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Name"
                fullWidth
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              
              <TextField
                select
                label="Type"
                fullWidth
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              >
                {integrationTypes.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              
              <TextField
                label="Endpoint URL"
                fullWidth
                value={formData.endpoint}
                onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
              />
              
              <TextField
                label="API Key (optional)"
                fullWidth
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                }
                label="Active"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={saving || !formData.name || !formData.endpoint}
            >
              {saving ? <CircularProgress size={20} /> : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
};

export default Integrations;