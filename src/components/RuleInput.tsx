import { useState } from 'react';
import { Box, Select, MenuItem, FormControl, InputLabel, TextField, Button } from '@mui/material';
import type { TypedBusinessRule, RuleInputProps } from '@/types';

const RuleInput: React.FC<RuleInputProps> = ({ onAddRule }) => {
  const [ruleType, setRuleType] = useState<string>('');
  const [ruleDetails, setRuleDetails] = useState<Record<string, string | number>>({});

  const textFieldStyles = {
    mb: 1,
    '& .MuiInputBase-input': { color: 'white', fontSize: '0.85rem' },
    '& .MuiInputLabel-root': { color: '#bbb', fontSize: '0.85rem' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#777' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
  };

  const handleRuleTypeChange = (event: { target: { value: string } }) => {
    setRuleType(event.target.value);
    setRuleDetails({}); // Reset details when rule type changes
  };

  const handleDetailChange = (field: string, value: string | number) => {
    setRuleDetails({ ...ruleDetails, [field]: value });
  };

  const renderRuleForm = () => {
    switch (ruleType) {
      case 'coRun':
        return (
          <TextField
            label="Task IDs (comma-separated)"
            value={ruleDetails.tasks || ''}
            onChange={(e) => handleDetailChange('tasks', e.target.value)}
            fullWidth
            size="small"
            sx={textFieldStyles}
          />
        );
      case 'slotRestriction':
        return (
          <>
            <TextField
              label="Client/Worker Group"
              value={ruleDetails.group || ''}
              onChange={(e) => handleDetailChange('group', e.target.value)}
              fullWidth
              size="small"
              sx={textFieldStyles}
            />
            <TextField
              label="Min Common Slots"
              type="number"
              value={ruleDetails.minCommonSlots || ''}
              onChange={(e) => handleDetailChange('minCommonSlots', e.target.value)}
              fullWidth
              size="small"
              sx={textFieldStyles}
            />
          </>
        );
      case 'loadLimit':
        return (
          <>
            <TextField
              label="Worker Group"
              value={ruleDetails.workerGroup || ''}
              onChange={(e) => handleDetailChange('workerGroup', e.target.value)}
              fullWidth
              size="small"
              sx={textFieldStyles}
            />
            <TextField
              label="Max Slots Per Phase"
              type="number"
              value={ruleDetails.maxSlotsPerPhase || ''}
              onChange={(e) => handleDetailChange('maxSlotsPerPhase', e.target.value)}
              fullWidth
              size="small"
              sx={textFieldStyles}
            />
          </>
        );
      case 'phaseWindow':
        return (
          <>
            <TextField
              label="Task ID"
              value={ruleDetails.taskId || ''}
              onChange={(e) => handleDetailChange('taskId', e.target.value)}
              fullWidth
              size="small"
              sx={textFieldStyles}
            />
            <TextField
              label="Allowed Phases (e.g., [1,3,5] or 1-3)"
              value={ruleDetails.allowedPhases || ''}
              onChange={(e) => handleDetailChange('allowedPhases', e.target.value)}
              fullWidth
              size="small"
              sx={textFieldStyles}
            />
          </>
        );
      case 'patternMatch':
        return (
          <>
            <TextField
              label="Regex Pattern"
              value={ruleDetails.regex || ''}
              onChange={(e) => handleDetailChange('regex', e.target.value)}
              fullWidth
              size="small"
              sx={textFieldStyles}
            />
            <TextField
              label="Rule Template"
              value={ruleDetails.template || ''}
              onChange={(e) => handleDetailChange('template', e.target.value)}
              fullWidth
              size="small"
              sx={textFieldStyles}
            />
            <TextField
              label="Parameters (JSON)"
              value={ruleDetails.parameters || ''}
              onChange={(e) => handleDetailChange('parameters', e.target.value)}
              fullWidth
              size="small"
              sx={textFieldStyles}
            />
          </>
        );
      case 'precedenceOverride':
        return (
          <>
            <TextField
              label="Rule Scope"
              value={ruleDetails.scope || ''}
              onChange={(e) => handleDetailChange('scope', e.target.value)}
              fullWidth
              size="small"
              sx={textFieldStyles}
            />
            <TextField
              label="Priority Order"
              type="number"
              value={ruleDetails.priority || ''}
              onChange={(e) => handleDetailChange('priority', e.target.value)}
              fullWidth
              size="small"
              sx={textFieldStyles}
            />
          </>
        );
      default:
        return null;
    }
  };

  const handleAddRule = () => {
    if (ruleType) {
      onAddRule({ type: ruleType, ...ruleDetails } as TypedBusinessRule);
      setRuleType('');
      setRuleDetails({});
    }
  };

  return (
    <Box>
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel sx={{ color: '#bbb', fontSize: '0.85rem' }}>Rule Type</InputLabel>
        <Select
          value={ruleType}
          label="Rule Type"
          onChange={handleRuleTypeChange}
          sx={{
            color: 'white',
            fontSize: '0.85rem',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#777' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
            '& .MuiSvgIcon-root': { color: 'white' },
          }}
        >
          <MenuItem value="">Select Rule Type</MenuItem>
          <MenuItem value="coRun">Co-run</MenuItem>
          <MenuItem value="slotRestriction">Slot-restriction</MenuItem>
          <MenuItem value="loadLimit">Load-limit</MenuItem>
          <MenuItem value="phaseWindow">Phase-window</MenuItem>
          <MenuItem value="patternMatch">Pattern-match</MenuItem>
          <MenuItem value="precedenceOverride">Precedence override</MenuItem>
        </Select>
      </FormControl>
      
      <Box sx={{ mb: 2, maxHeight: '150px', overflow: 'auto' }}>
        {renderRuleForm()}
      </Box>
      
      <Button
        variant="contained"
        size="small"
        onClick={handleAddRule}
        disabled={!ruleType}
        fullWidth
        sx={{ 
          backgroundColor: '#4CAF50', 
          color: 'white', 
          '&:hover': { backgroundColor: '#45a049' },
          fontSize: '0.8rem'
        }}
      >
        Add Rule
      </Button>
    </Box>
  );
};

export default RuleInput;