export interface FloatToast {
  id: number;
  x: number;
  y: number;
  text: string;
}

export type LogicOp = 'AND' | 'OR' | 'NOT';

export interface SearchTerm {
  id: number;
  op: LogicOp;
  value: string;
}

export interface NyaaResult {
  [key: string]: unknown;
  key: string;
  name: string;
  magnet: string;
  size: string;
  date: string;
  seeders: number;
  leechers: number;
  completed: number;
}

export interface UseSearchPageResult {
  activeLogic: LogicOp | null;
  selectedPreset: string | null;
  animeDropdown: string;
  customInput: string;
  watchingNames: string[];
  terms: SearchTerm[];
  searching: boolean;
  searchError: string;
  searchResults: NyaaResult[];
  savedQueries: string[];
  searchQuery: string;
  keywordDisabled: boolean;
  presetDisabled: boolean;
  toggleLogic: (op: LogicOp) => void;
  handlePresetClick: (p: string) => void;
  handleDropdownChange: (val: string) => void;
  handleInputChange: (val: string) => void;
  handleInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  removeTerm: (id: number) => void;
  handleSearch: (overrideQuery?: string) => Promise<void>;
  saveCurrentQuery: () => void;
  removeSavedQuery: (q: string) => void;
}
