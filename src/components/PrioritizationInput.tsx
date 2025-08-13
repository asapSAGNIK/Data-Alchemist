import { useState } from 'react';
import { Box, Typography, Slider, TextField, FormControl, InputLabel, Select, MenuItem, Button } from '@mui/material';
import type { PrioritizationInputProps, PrioritizationSettings } from '@/types';

const criteria = [
  { id: 'priorityLevelFulfillment', name: 'Client Priority Level Fulfillment', defaultValue: 50 },
  { id: 'taskDurationEfficiency', name: 'Task Duration Efficiency', defaultValue: 50 },
  { id: 'workerLoadBalance', name: 'Worker Load Balance', defaultValue: 50 },
  { id: 'skillCoverage', name: 'Skill Coverage', defaultValue: 50 },
  { id: 'maxConcurrencyAdherence', name: 'Max Concurrency Adherence', defaultValue: 50 },
];

const presetProfiles = {
  'Maximize Fulfillment': {
    priorityLevelFulfillment: 90,
    taskDurationEfficiency: 30,
    workerLoadBalance: 40,
    skillCoverage: 70,
    maxConcurrencyAdherence: 80,
  },
  'Fair Distribution': {
    priorityLevelFulfillment: 50,
    taskDurationEfficiency: 50,
    workerLoadBalance: 80,
    skillCoverage: 60,
    maxConcurrencyAdherence: 50,
  },
  'Minimize Workload': {
    priorityLevelFulfillment: 30,
    taskDurationEfficiency: 80,
    workerLoadBalance: 90,
    skillCoverage: 50,
    maxConcurrencyAdherence: 40,
  },
  'Default': {
    priorityLevelFulfillment: 50,
    taskDurationEfficiency: 50,
    workerLoadBalance: 50,
    skillCoverage: 50,
    maxConcurrencyAdherence: 50,
  }
};

const PrioritizationInput: React.FC<PrioritizationInputProps> = ({ onSettingsChange }) => {
  const [priorities, setPriorities] = useState<PrioritizationSettings>(() => {
    const initialPriorities: PrioritizationSettings = {};
    criteria.forEach(criterion => {
      initialPriorities[criterion.id] = criterion.defaultValue;
    });
    return initialPriorities;
  });
  const [selectedPreset, setSelectedPreset] = useState<string>('Default');

  const handleSliderChange = (id: string) => (event: Event, newValue: number | number[]) => {
    setPriorities(prev => ({
      ...prev,
      [id]: newValue as number,
    }));
  };

  const handleTextFieldChange = (id: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    if (!isNaN(value) && value >= 0 && value <= 100) {
      setPriorities(prev => ({
        ...prev,
        [id]: value,
      }));
    }
  };

  const handlePresetChange = (event: { target: { value: string } }) => {
    const presetName = event.target.value as keyof typeof presetProfiles;
    setSelectedPreset(presetName);
    setPriorities(presetProfiles[presetName]);
  };

  return (
    <Box>
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel sx={{ color: '#bbb', fontSize: '0.85rem' }}>Preset Profiles</InputLabel>
        <Select
          value={selectedPreset}
          label="Preset Profiles"
          onChange={handlePresetChange}
          sx={{
            color: 'white',
            fontSize: '0.85rem',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#777' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
            '& .MuiSvgIcon-root': { color: 'white' },
          }}
        >
          {Object.keys(presetProfiles).map((presetName) => (
            <MenuItem key={presetName} value={presetName}>
              {presetName}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box sx={{ maxHeight: '200px', overflow: 'auto', mb: 2 }}>
        {criteria.map((criterion) => (
          <Box key={criterion.id} sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ color: 'white', fontSize: '0.75rem', display: 'block', mb: 0.5 }}>
              {criterion.name}: {priorities[criterion.id]}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Slider
                value={priorities[criterion.id]}
                onChange={handleSliderChange(criterion.id)}
                aria-labelledby={`${criterion.id}-slider`}
                valueLabelDisplay="auto"
                min={0}
                max={100}
                size="small"
                sx={{
                  color: '#4CAF50',
                  '& .MuiSlider-thumb': { color: '#4CAF50' },
                  '& .MuiSlider-track': { color: '#4CAF50' },
                  '& .MuiSlider-rail': { color: '#777' },
                }}
              />
              <TextField
                type="number"
                value={priorities[criterion.id]}
                onChange={handleTextFieldChange(criterion.id)}
                inputProps={{ min: 0, max: 100 }}
                size="small"
                sx={{ 
                  width: '60px',
                  '& .MuiInputBase-input': { color: 'white', fontSize: '0.75rem', textAlign: 'center' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#777' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                }}
              />
            </Box>
          </Box>
        ))}
      </Box>
      
      <Button
        variant="contained"
        size="small"
        onClick={() => onSettingsChange(priorities)}
        fullWidth
        sx={{ 
          backgroundColor: '#1976D2', 
          color: 'white', 
          '&:hover': { backgroundColor: '#1565C0' },
          fontSize: '0.8rem'
        }}
      >
        Apply Priorities
      </Button>
    </Box>
  );
};

export default PrioritizationInput;