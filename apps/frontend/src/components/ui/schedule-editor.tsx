'use client';

import { useState, useEffect, useRef } from 'react';

// Import generateCron at the top level so it can be used in the initialization useEffect
function generateCron(
  days: number[],
  hour: number | null,
  minute: number | null
): string {
  const min = minute ?? 0;

  if (hour === null) {
    // Every hour
    if (days.length === 0) {
      // Every hour of every day
      return `${min} * * * *`;
    } else {
      // Every hour of specific days
      const daysStr = days.sort((a, b) => a - b).join(',');
      return `${min} * * * ${daysStr}`;
    }
  }

  if (days.length === 0) {
    // Specific hour, every day
    return `${min} ${hour} * * *`;
  }

  // Specific hour and specific days
  const daysStr = days.sort((a, b) => a - b).join(',');
  return `${min} ${hour} * * ${daysStr}`;
}
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TimezoneSelect } from '@/components/ui/timezone-select';

interface ScheduleEditorProps {
  value: string; // Cron expression
  onChange: (cron: string) => void;
  timezone?: string;
  onTimezoneChange?: (timezone: string) => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'D', fullLabel: 'Dimanche' },
  { value: 1, label: 'L', fullLabel: 'Lundi' },
  { value: 2, label: 'M', fullLabel: 'Mardi' },
  { value: 3, label: 'M', fullLabel: 'Mercredi' },
  { value: 4, label: 'J', fullLabel: 'Jeudi' },
  { value: 5, label: 'V', fullLabel: 'Vendredi' },
  { value: 6, label: 'S', fullLabel: 'Samedi' },
];

const HOURS = [
  { value: null, label: 'Toutes les heures' },
  ...Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: `${i}h`,
  })),
];

const MINUTES = Array.from({ length: 60 }, (_, i) => ({
  value: i,
  label: i === 0 ? '0 min' : `${i} min`,
}));

// Parse cron expression to extract components
function parseCron(cron: string): {
  minute: number | null;
  hour: number | null;
  days: number[];
  isAdvanced: boolean;
} {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) {
    return { minute: null, hour: null, days: [], isAdvanced: true };
  }

  const [minuteStr, hourStr, dayOfMonthStr, monthStr, dayOfWeekStr] = parts;

  // Check if it's a simple pattern we can parse
  // Minute must be a number (0-59) or *
  let minute: number | null = null;
  if (minuteStr !== '*') {
    const parsedMinute = parseInt(minuteStr, 10);
    if (!isNaN(parsedMinute) && parsedMinute >= 0 && parsedMinute <= 59) {
      minute = parsedMinute;
    } else {
      // Complex minute expression (e.g., */5, 0-30)
      return { minute: null, hour: null, days: [], isAdvanced: true };
    }
  }

  // Hour must be a number (0-23) or *
  let hour: number | null = null;
  if (hourStr !== '*') {
    const parsedHour = parseInt(hourStr, 10);
    if (!isNaN(parsedHour) && parsedHour >= 0 && parsedHour <= 23) {
      hour = parsedHour;
    } else {
      // Complex hour expression (e.g., */2, 9-17)
      return { minute: null, hour: null, days: [], isAdvanced: true };
    }
  }

  // Day of month and month must be * for simple mode
  if (dayOfMonthStr !== '*' || monthStr !== '*') {
    return { minute: null, hour: null, days: [], isAdvanced: true };
  }

  // Parse days of week
  let days: number[] = [];
  if (dayOfWeekStr && dayOfWeekStr !== '*') {
    if (dayOfWeekStr.includes(',')) {
      const dayParts = dayOfWeekStr.split(',').map(d => parseInt(d.trim(), 10));
      if (dayParts.every(d => !isNaN(d) && d >= 0 && d <= 7)) {
        days = dayParts.filter(d => d !== 7); // Convert 7 (Sunday) to 0
        if (dayParts.includes(7) && !days.includes(0)) {
          days.push(0);
        }
      } else {
        return { minute: null, hour: null, days: [], isAdvanced: true };
      }
    } else if (dayOfWeekStr.includes('-')) {
      const [startStr, endStr] = dayOfWeekStr.split('-').map(d => d.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end) && start >= 0 && start <= 7 && end >= 0 && end <= 7) {
        const rangeStart = start === 7 ? 0 : start;
        const rangeEnd = end === 7 ? 0 : end;
        if (rangeStart <= rangeEnd) {
          days = Array.from({ length: rangeEnd - rangeStart + 1 }, (_, i) => rangeStart + i);
        } else {
          // Wrap around (e.g., 5-1 means Fri-Sun)
          days = Array.from({ length: 7 - rangeStart + rangeEnd + 1 }, (_, i) => (rangeStart + i) % 7);
        }
      } else {
        return { minute: null, hour: null, days: [], isAdvanced: true };
      }
    } else {
      const day = parseInt(dayOfWeekStr, 10);
      if (!isNaN(day) && day >= 0 && day <= 7) {
        days = [day === 7 ? 0 : day];
      } else {
        return { minute: null, hour: null, days: [], isAdvanced: true };
      }
    }
  }

  return { minute, hour, days, isAdvanced: false };
}

// generateCron is now defined at the top level (above)

export function ScheduleEditor({ value, onChange, timezone = 'Europe/Paris', onTimezoneChange }: ScheduleEditorProps) {
  // Ensure default timezone is Europe/Paris
  const effectiveTimezone = timezone || 'Europe/Paris';
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [selectedMinute, setSelectedMinute] = useState<number | null>(null);
  const [customCron, setCustomCron] = useState('');
  const isInitializingRef = useRef(true);
  const lastSentCronRef = useRef<string>('');
  const lastReceivedValueRef = useRef<string>('');
  const currentValueRef = useRef<string>(value);
  const hasInitializedRef = useRef(false);

  // Initialize from cron value (only when value changes externally)
  useEffect(() => {
    // Update current value ref
    currentValueRef.current = value;

    // Skip if this is the cron we just sent (to avoid infinite loops)
    if (value === lastSentCronRef.current && lastSentCronRef.current !== '') {
      return;
    }

    // Skip if this is the same value we already processed
    if (value === lastReceivedValueRef.current) {
      return;
    }

    isInitializingRef.current = true;
    lastReceivedValueRef.current = value;

    if (!value) {
      // Default: every day at 9 AM
      setSelectedDays([]);
      setSelectedHour(9);
      setSelectedMinute(0);
      setIsAdvanced(false);
      lastSentCronRef.current = '';
      // Use setTimeout to ensure state updates are processed before allowing cron generation
      setTimeout(() => {
        isInitializingRef.current = false;
      }, 0);
      return;
    }

    const parsed = parseCron(value);
    setIsAdvanced(parsed.isAdvanced);

    if (parsed.isAdvanced) {
      setCustomCron(value);
      // For advanced mode, update lastSentCronRef to the current value
      lastSentCronRef.current = value;
      isInitializingRef.current = false;
    } else {
      // Always update state, even if values seem the same
      // Ensure minute defaults to 0 if null (for "every hour" case)
      const minute = parsed.minute ?? 0;

      // IMPORTANT: Set hasInitialized BEFORE updating states to prevent race condition
      // This ensures the cron generation effect won't fire during state updates
      hasInitializedRef.current = false; // Temporarily disable to prevent premature generation

      // Update all states synchronously
      setSelectedDays(parsed.days);
      setSelectedHour(parsed.hour);
      setSelectedMinute(minute);

      // For simple mode, update lastSentCronRef to match the parsed value
      // This ensures that when user modifies days, the comparison works correctly
      lastSentCronRef.current = value;

      // Re-enable after states are updated
      hasInitializedRef.current = true;
      
      // Use a longer timeout to ensure state updates are fully processed
      // This prevents the cron generation useEffect from firing with stale values
      setTimeout(() => {
        isInitializingRef.current = false;
      }, 10);
    }
  }, [value]);

  // Update cron when simple mode changes (only after initialization)
  useEffect(() => {
    // Skip during initialization or in advanced mode
    if (isInitializingRef.current || isAdvanced) {
      return;
    }

    // Don't generate cron if we haven't initialized yet (prevents generating with null values)
    if (!hasInitializedRef.current) {
      return;
    }

    const cron = generateCron(selectedDays, selectedHour, selectedMinute);

    // Only update if cron is different from what we last sent
    // AND different from the current value prop (to avoid overwriting loaded values)
    // This ensures changes to days/hour/minute are propagated, but doesn't overwrite
    // values that were just loaded from the database
    // Use currentValueRef to avoid stale closure issues
    const currentValue = currentValueRef.current;
    if (cron !== lastSentCronRef.current && cron !== currentValue) {
      lastSentCronRef.current = cron;
      onChange(cron);
    }
  }, [selectedDays, selectedHour, selectedMinute, isAdvanced, onChange]);

  // Update cron when advanced mode changes (only after initialization)
  useEffect(() => {
    if (isInitializingRef.current || !isAdvanced || !customCron) return;
    
    // Only call onChange if the custom cron is different from what we last sent
    if (customCron !== lastSentCronRef.current) {
      lastSentCronRef.current = customCron;
      onChange(customCron);
    }
  }, [customCron, isAdvanced, onChange]);

  const toggleDay = (day: number) => {
    // Ignore changes during initialization
    if (isInitializingRef.current) {
      return;
    }
    setSelectedDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  const selectAllDays = () => {
    setSelectedDays(DAYS_OF_WEEK.map(d => d.value));
  };

  const clearDays = () => {
    setSelectedDays([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Fréquence de diffusion</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsAdvanced(!isAdvanced)}
          className="text-sm"
        >
          {isAdvanced ? 'Mode simple' : 'Mode avancé'}
        </Button>
      </div>

      {!isAdvanced ? (
        <div className="space-y-4">
          {/* Days selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-normal">Jours de la semaine</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={selectAllDays}
                  className="text-xs h-7"
                >
                  Tous
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearDays}
                  className="text-xs h-7"
                >
                  Aucun
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              {DAYS_OF_WEEK.map(day => (
                <div key={day.value} className="flex flex-col items-center gap-1">
                  <Checkbox
                    checked={selectedDays.includes(day.value)}
                    onCheckedChange={() => toggleDay(day.value)}
                    id={`day-${day.value}`}
                  />
                  <Label
                    htmlFor={`day-${day.value}`}
                    className="text-xs cursor-pointer"
                    title={day.fullLabel}
                  >
                    {day.label}
                  </Label>
                </div>
              ))}
            </div>
            {selectedDays.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Aucun jour sélectionné = tous les jours
              </p>
            )}
          </div>

          {/* Hour selection */}
          <div>
            <Label>Heure</Label>
            <Select
              value={selectedHour === null ? 'all' : selectedHour.toString()}
              onValueChange={(val) => {
                // Ignore changes during initialization to prevent Radix UI from overwriting our loaded values
                if (isInitializingRef.current) {
                  return;
                }
                if (val === 'all') {
                  setSelectedHour(null);
                } else {
                  const hour = parseInt(val, 10);
                  setSelectedHour(isNaN(hour) ? null : hour);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une heure" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {HOURS.map(h => (
                  <SelectItem key={h.value === null ? 'all' : h.value.toString()} value={h.value === null ? 'all' : h.value.toString()}>
                    {h.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Minute selection */}
          {selectedHour !== null && (
            <div>
              <Label>Minute</Label>
              <Select
                value={selectedMinute === null ? '0' : selectedMinute.toString()}
                onValueChange={(val) => {
                  // Ignore changes during initialization
                  if (isInitializingRef.current) {
                    return;
                  }
                  setSelectedMinute(parseInt(val, 10));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner les minutes" />
                </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {MINUTES.filter(m => m.value % 5 === 0).map(m => (
                  <SelectItem key={m.value} value={m.value.toString()}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
              </Select>
            </div>
          )}

          {/* Preview */}
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500">
              Expression cron générée: <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{generateCron(selectedDays, selectedHour, selectedMinute)}</code>
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div>
            <Label htmlFor="customCron">Expression Cron</Label>
            <Input
              id="customCron"
              value={customCron}
              onChange={(e) => setCustomCron(e.target.value)}
              placeholder="0 9 * * *"
            />
            <p className="text-xs text-gray-500 mt-1">
              Format: minute heure jour mois jour-semaine
              <br />
              Exemples: <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">0 9 * * *</code> (tous les jours à 9h),{' '}
              <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">0 17 * * 1,5</code> (lundi et vendredi à 17h)
            </p>
          </div>
        </div>
      )}

      {/* Timezone */}
      {onTimezoneChange && (
        <TimezoneSelect
          value={effectiveTimezone}
          onChange={onTimezoneChange}
          label="Fuseau horaire"
        />
      )}
    </div>
  );
}

