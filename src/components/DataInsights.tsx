import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  Chip, 
  Grid, 
  CircularProgress,
  Alert,
  IconButton,
  Collapse
} from '@mui/material';
// Using text-based icons for backwards compatibility
const TrendingUpIcon = () => <span style={{ fontSize: '20px' }}>📈</span>;
const WarningIcon = () => <span style={{ fontSize: '20px' }}>⚠️</span>;
const CheckCircleIcon = () => <span style={{ fontSize: '20px' }}>✅</span>;
const InfoIcon = () => <span style={{ fontSize: '20px' }}>ℹ️</span>;
const ErrorIcon = () => <span style={{ fontSize: '20px' }}>❌</span>;
const ExpandMoreIcon = () => <span style={{ fontSize: '16px' }}>▼</span>;
const ExpandLessIcon = () => <span style={{ fontSize: '16px' }}>▲</span>;
const BarChartIcon = () => <span style={{ fontSize: '20px' }}>📊</span>;
const LightbulbIcon = () => <span style={{ fontSize: '20px' }}>💡</span>;
const SecurityIcon = () => <span style={{ fontSize: '20px' }}>🛡️</span>;

interface Insight {
  title: string;
  description: string;
  type: 'warning' | 'success' | 'info' | 'critical';
  impact: 'high' | 'medium' | 'low';
  actionable: string;
}

interface Bottleneck {
  area: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}

interface Opportunity {
  title: string;
  description: string;
  benefit: string;
  effort: 'low' | 'medium' | 'high';
}

interface RiskAlert {
  risk: string;
  probability: 'high' | 'medium' | 'low';
  mitigation: string;
}

interface InsightsData {
  keyInsights: Insight[];
  bottlenecks: Bottleneck[];
  opportunities: Opportunity[];
  riskAlerts: RiskAlert[];
}

interface Statistics {
  totalClients: number;
  totalWorkers: number;
  totalTasks: number;
  highPriorityClients: number;
  uniqueSkills: number;
  totalPhases: number;
}

import type { DataInsightsProps } from '@/types';

const DataInsights: React.FC<DataInsightsProps> = ({ clientsData, workersData, tasksData }) => {
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    insights: true,
    bottlenecks: false,
    opportunities: false,
    risks: false
  });

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircleIcon />;
      case 'warning': return <WarningIcon />;
      case 'critical': return <ErrorIcon />;
      default: return <InfoIcon />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#2196F3';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#2196F3';
    }
  };

  const handleGenerateInsights = async () => {
    if (!clientsData.length && !workersData.length && !tasksData.length) {
      setError('Please upload data files first to generate insights.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/data-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientsData,
          workersData,
          tasksData
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate insights: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setInsights(data.insights || data.fallbackInsights);
      setStatistics(data.statistics);
    } catch (error) {
      console.error('Error generating insights:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate insights');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <Box>
      {/* Generate Insights Button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleGenerateInsights}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <BarChartIcon />}
          sx={{
            backgroundColor: '#6366F1',
            color: 'white',
            '&:hover': { backgroundColor: '#5B21B6' },
            fontSize: '1rem',
            px: 4,
            py: 1.5,
            borderRadius: '12px',
            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
          }}
        >
          {loading ? 'Analyzing Data...' : 'Generate Smart Insights'}
        </Button>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, backgroundColor: '#3f1a1a', color: 'white' }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      {statistics && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={2}>
            <Card sx={{ backgroundColor: '#1a1a1a', color: 'white', textAlign: 'center' }}>
              <CardContent sx={{ py: 1.5 }}>
                <Typography variant="h4" sx={{ color: '#4CAF50', fontWeight: 'bold' }}>
                  {statistics.totalClients}
                </Typography>
                <Typography variant="caption">Clients</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={2}>
            <Card sx={{ backgroundColor: '#1a1a1a', color: 'white', textAlign: 'center' }}>
              <CardContent sx={{ py: 1.5 }}>
                <Typography variant="h4" sx={{ color: '#2196F3', fontWeight: 'bold' }}>
                  {statistics.totalWorkers}
                </Typography>
                <Typography variant="caption">Workers</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={2}>
            <Card sx={{ backgroundColor: '#1a1a1a', color: 'white', textAlign: 'center' }}>
              <CardContent sx={{ py: 1.5 }}>
                <Typography variant="h4" sx={{ color: '#FF9800', fontWeight: 'bold' }}>
                  {statistics.totalTasks}
                </Typography>
                <Typography variant="caption">Tasks</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={2}>
            <Card sx={{ backgroundColor: '#1a1a1a', color: 'white', textAlign: 'center' }}>
              <CardContent sx={{ py: 1.5 }}>
                <Typography variant="h4" sx={{ color: '#F44336', fontWeight: 'bold' }}>
                  {statistics.highPriorityClients}
                </Typography>
                <Typography variant="caption">High Priority</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={2}>
            <Card sx={{ backgroundColor: '#1a1a1a', color: 'white', textAlign: 'center' }}>
              <CardContent sx={{ py: 1.5 }}>
                <Typography variant="h4" sx={{ color: '#9C27B0', fontWeight: 'bold' }}>
                  {statistics.uniqueSkills}
                </Typography>
                <Typography variant="caption">Skills</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={2}>
            <Card sx={{ backgroundColor: '#1a1a1a', color: 'white', textAlign: 'center' }}>
              <CardContent sx={{ py: 1.5 }}>
                <Typography variant="h4" sx={{ color: '#00BCD4', fontWeight: 'bold' }}>
                  {statistics.totalPhases}
                </Typography>
                <Typography variant="caption">Phases</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Insights Sections */}
      {insights && (
        <Box sx={{ space: 2 }}>
          {/* Key Insights */}
          <Card sx={{ backgroundColor: '#1a1a1a', color: 'white', mb: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUpIcon />
                  Key Insights ({insights.keyInsights.length})
                </Typography>
                <IconButton onClick={() => toggleSection('insights')} sx={{ color: 'white' }}>
                  {expandedSections.insights ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
              <Collapse in={expandedSections.insights}>
                <Box sx={{ mt: 2 }}>
                  {insights.keyInsights.map((insight, index) => (
                    <Box key={index} sx={{ mb: 2, p: 2, backgroundColor: '#2a2a2a', borderRadius: '8px' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {getInsightIcon(insight.type)}
                        <Typography variant="subtitle2" fontWeight="bold">{insight.title}</Typography>
                        <Chip 
                          label={insight.impact} 
                          size="small" 
                          sx={{ 
                            backgroundColor: getImpactColor(insight.impact), 
                            color: 'white',
                            fontSize: '0.7rem',
                            height: '20px'
                          }} 
                        />
                      </Box>
                      <Typography variant="body2" sx={{ mb: 1, color: '#ccc' }}>
                        {insight.description}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#4CAF50', fontWeight: 'bold' }}>
                        💡 {insight.actionable}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Collapse>
            </CardContent>
          </Card>

          {/* Bottlenecks */}
          {insights.bottlenecks.length > 0 && (
            <Card sx={{ backgroundColor: '#1a1a1a', color: 'white', mb: 2 }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon />
                    Bottlenecks ({insights.bottlenecks.length})
                  </Typography>
                  <IconButton onClick={() => toggleSection('bottlenecks')} sx={{ color: 'white' }}>
                    {expandedSections.bottlenecks ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Box>
                <Collapse in={expandedSections.bottlenecks}>
                  <Box sx={{ mt: 2 }}>
                    {insights.bottlenecks.map((bottleneck, index) => (
                      <Box key={index} sx={{ mb: 2, p: 2, backgroundColor: '#2a2a2a', borderRadius: '8px' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="subtitle2" fontWeight="bold">{bottleneck.area}</Typography>
                          <Chip 
                            label={bottleneck.severity} 
                            size="small" 
                            sx={{ 
                              backgroundColor: getSeverityColor(bottleneck.severity), 
                              color: 'white',
                              fontSize: '0.7rem',
                              height: '20px'
                            }} 
                          />
                        </Box>
                        <Typography variant="body2" sx={{ mb: 1, color: '#ccc' }}>
                          {bottleneck.description}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#FF9800', fontWeight: 'bold' }}>
                          🔧 {bottleneck.recommendation}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          )}

          {/* Opportunities */}
          {insights.opportunities.length > 0 && (
            <Card sx={{ backgroundColor: '#1a1a1a', color: 'white', mb: 2 }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LightbulbIcon />
                    Opportunities ({insights.opportunities.length})
                  </Typography>
                  <IconButton onClick={() => toggleSection('opportunities')} sx={{ color: 'white' }}>
                    {expandedSections.opportunities ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Box>
                <Collapse in={expandedSections.opportunities}>
                  <Box sx={{ mt: 2 }}>
                    {insights.opportunities.map((opportunity, index) => (
                      <Box key={index} sx={{ mb: 2, p: 2, backgroundColor: '#2a2a2a', borderRadius: '8px' }}>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                          {opportunity.title}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1, color: '#ccc' }}>
                          {opportunity.description}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#4CAF50', fontWeight: 'bold', display: 'block' }}>
                          💰 {opportunity.benefit}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#FFC107' }}>
                          ⚡ Effort: {opportunity.effort}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          )}

          {/* Risk Alerts */}
          {insights.riskAlerts.length > 0 && (
            <Card sx={{ backgroundColor: '#1a1a1a', color: 'white', mb: 2 }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SecurityIcon />
                    Risk Alerts ({insights.riskAlerts.length})
                  </Typography>
                  <IconButton onClick={() => toggleSection('risks')} sx={{ color: 'white' }}>
                    {expandedSections.risks ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Box>
                <Collapse in={expandedSections.risks}>
                  <Box sx={{ mt: 2 }}>
                    {insights.riskAlerts.map((risk, index) => (
                      <Box key={index} sx={{ mb: 2, p: 2, backgroundColor: '#2a2a2a', borderRadius: '8px' }}>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: '#F44336' }}>
                          {risk.risk}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#FF9800', display: 'block', mb: 1 }}>
                          🎯 Probability: {risk.probability}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#4CAF50', fontWeight: 'bold' }}>
                          🛡️ {risk.mitigation}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          )}
        </Box>
      )}
    </Box>
  );
};

export default DataInsights;
