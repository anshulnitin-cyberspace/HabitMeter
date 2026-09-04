export interface Habit {
  id: string;
  name: string;
  description?: string;
  color: string; // hex code
  icon: string; // Lucide icon name
  frequency: number; // Target days per week (1-7)
  createdAt: string; // 'YYYY-MM-DD' representing local creation date
  completions: string[]; // Array of unique 'YYYY-MM-DD' strings, sorted chronologically
}
