import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState, type KeyboardEvent } from 'react';

import { loadEntriesByStatus } from '../../store/watchStore';

import type { LogicOp, NyaaResult, SearchTerm, UseSearchPageResult } from './types';

let _termId = 0;

function parseNyaaHtml(html: string): NyaaResult[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const rows = doc.querySelectorAll('table.table tbody tr');
  const results: NyaaResult[] = [];
  rows.forEach((row, i) => {
    const tds = row.querySelectorAll('td');
    if (tds.length < 8) {
      return;
    }
    const nameEl = tds[1].querySelector('a[href^="/view/"]:not([href*="#"])');
    const name = nameEl?.textContent?.trim() ?? '';
    const magnetEl = tds[2].querySelector('a[href^="magnet:"]');
    const magnet = magnetEl?.getAttribute('href') ?? '';
    const size = tds[3].textContent?.trim() ?? '';
    const date = tds[4].textContent?.trim() ?? '';
    const seeders = Number.parseInt(tds[5].textContent?.trim() ?? '0', 10);
    const leechers = Number.parseInt(tds[6].textContent?.trim() ?? '0', 10);
    const completed = Number.parseInt(tds[7].textContent?.trim() ?? '0', 10);
    if (name) {
      results.push({ key: String(i), name, magnet, size, date, seeders, leechers, completed });
    }
  });
  return results;
}

function buildSearchQuery(terms: SearchTerm[]): string {
  return terms
    .map((t) => {
      if (t.op === 'OR') {
        return `| ${t.value}`;
      }
      if (t.op === 'NOT') {
        return `- ${t.value}`;
      }
      return t.value;
    })
    .join(' ');
}

function useSavedQueries(): [string[], (q: string) => void, (q: string) => void] {
  const [savedQueries, setSavedQueries] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('mikanbox-saved-queries') ?? '[]') as string[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('mikanbox-saved-queries', JSON.stringify(savedQueries));
  }, [savedQueries]);

  function save(query: string): void {
    setSavedQueries((prev) => (prev.includes(query) ? prev : [query, ...prev]));
  }

  function remove(query: string): void {
    setSavedQueries((prev) => prev.filter((x) => x !== query));
  }

  return [savedQueries, save, remove];
}

function useTerms(): [SearchTerm[], (op: LogicOp, value: string) => void, (id: number) => void] {
  const [terms, setTerms] = useState<SearchTerm[]>([]);

  function addTerm(op: LogicOp, value: string): void {
    setTerms((prev) => {
      if (prev.some((t) => t.value === value)) {
        return prev;
      }
      return [...prev, { id: _termId++, op, value }];
    });
  }

  function removeTerm(id: number): void {
    setTerms((prev) => prev.filter((t) => t.id !== id));
  }

  return [terms, addTerm, removeTerm];
}

interface InputState {
  activeLogic: LogicOp | null;
  selectedPreset: string | null;
  animeDropdown: string;
  customInput: string;
}

interface InputSetters {
  setActiveLogic: (v: LogicOp | null) => void;
  setSelectedPreset: (v: string | null) => void;
  setAnimeDropdown: (v: string) => void;
  setCustomInput: (v: string) => void;
  addTerm: (op: LogicOp, value: string) => void;
}

interface InputActionsResult {
  toggleLogic: (op: LogicOp) => void;
  handlePresetClick: (p: string) => void;
  handleDropdownChange: (val: string) => void;
  handleInputChange: (val: string) => void;
  handleInputKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}

interface ToggleHandlers {
  addTermAndReset: (op: LogicOp, value: string) => void;
  setActiveLogic: (v: LogicOp | null) => void;
  setAnimeDropdown: (v: string) => void;
  setCustomInput: (v: string) => void;
}

function applyToggleLogic(op: LogicOp, state: InputState, handlers: ToggleHandlers): void {
  const { activeLogic, selectedPreset, animeDropdown, customInput } = state;
  const { addTermAndReset, setActiveLogic, setAnimeDropdown, setCustomInput } = handlers;
  const newLogic = activeLogic === op ? null : op;
  if (newLogic !== null) {
    if (selectedPreset !== null) {
      addTermAndReset(newLogic, selectedPreset);
      return;
    }
    if (animeDropdown !== '') {
      addTermAndReset(newLogic, animeDropdown);
      setAnimeDropdown('');
      return;
    }
    if (customInput.trim() !== '') {
      addTermAndReset(newLogic, customInput.trim());
      setCustomInput('');
      return;
    }
  }
  setActiveLogic(newLogic);
}

interface DropdownHandlers {
  addTermAndReset: (op: LogicOp, value: string) => void;
  setAnimeDropdown: (v: string) => void;
  setCustomInput: (v: string) => void;
  setSelectedPreset: (v: string | null) => void;
}

function applyDropdownChange(
  val: string,
  activeLogic: LogicOp | null,
  handlers: DropdownHandlers,
): void {
  const { addTermAndReset, setAnimeDropdown, setCustomInput, setSelectedPreset } = handlers;
  if (val !== '' && activeLogic !== null) {
    addTermAndReset(activeLogic, val);
    setAnimeDropdown('');
    setCustomInput('');
    return;
  }
  setAnimeDropdown(val);
  if (val !== '') {
    setCustomInput('');
    setSelectedPreset(null);
  }
}

function useInputActions(state: InputState, setters: InputSetters): InputActionsResult {
  const { activeLogic, selectedPreset, customInput } = state;
  const { setActiveLogic, setSelectedPreset, setAnimeDropdown, setCustomInput, addTerm } = setters;

  function addTermAndReset(op: LogicOp, value: string): void {
    addTerm(op, value);
    setActiveLogic(null);
    setSelectedPreset(null);
  }

  function toggleLogic(op: LogicOp): void {
    applyToggleLogic(op, state, {
      addTermAndReset,
      setActiveLogic,
      setAnimeDropdown,
      setCustomInput,
    });
  }

  function handlePresetClick(p: string): void {
    if (activeLogic === null) {
      setSelectedPreset(selectedPreset === p ? null : p);
    } else {
      addTermAndReset(activeLogic, p);
    }
  }

  function handleDropdownChange(val: string): void {
    applyDropdownChange(val, activeLogic, {
      addTermAndReset,
      setAnimeDropdown,
      setCustomInput,
      setSelectedPreset,
    });
  }

  function handleInputChange(val: string): void {
    setCustomInput(val);
    if (val !== '') {
      setAnimeDropdown('');
      setSelectedPreset(null);
    }
  }

  function handleInputKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter' && customInput.trim() !== '' && activeLogic !== null) {
      addTermAndReset(activeLogic, customInput.trim());
      setCustomInput('');
    }
  }

  return {
    toggleLogic,
    handlePresetClick,
    handleDropdownChange,
    handleInputChange,
    handleInputKeyDown,
  };
}

interface SearchActionsResult {
  searchQuery: string;
  saveCurrentQuery: () => void;
  handleSearch: (overrideQuery?: string) => Promise<void>;
}

function useSearchActions(
  terms: SearchTerm[],
  saveQuery: (q: string) => void,
  setSearching: (v: boolean) => void,
  setSearchError: (v: string) => void,
  setSearchResults: (v: NyaaResult[]) => void,
): SearchActionsResult {
  const searchQuery = buildSearchQuery(terms);

  function saveCurrentQuery(): void {
    if (searchQuery.trim() !== '') {
      saveQuery(searchQuery);
    }
  }

  async function handleSearch(overrideQuery?: string): Promise<void> {
    const q = overrideQuery ?? searchQuery;
    if (q.trim() === '') {
      return;
    }
    setSearching(true);
    setSearchError('');
    setSearchResults([]);
    try {
      const url = `https://nyaa.si/?q=${encodeURIComponent(q)}`;
      const html = await invoke<string>('fetch_html', { url });
      const results = parseNyaaHtml(html);
      if (results.length === 0) {
        setSearchError('没有找到相关资源');
      } else {
        setSearchResults(results);
      }
    } catch (error) {
      setSearchError(`查询失败：${String(error)}`);
    } finally {
      setSearching(false);
    }
  }

  return { searchQuery, saveCurrentQuery, handleSearch };
}

export function useSearchPage(isActive?: boolean): UseSearchPageResult {
  const [activeLogic, setActiveLogic] = useState<LogicOp | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [animeDropdown, setAnimeDropdown] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [watchingNames, setWatchingNames] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchResults, setSearchResults] = useState<NyaaResult[]>([]);
  const [savedQueries, saveQuery, removeSavedQuery] = useSavedQueries();
  const [terms, addTerm, removeTerm] = useTerms();

  useEffect(() => {
    if (isActive !== true) {
      return;
    }
    const entries = loadEntriesByStatus('正在追番');
    setWatchingNames(entries.map((e) => e.subject.name_cn || e.subject.name));
  }, [isActive]);

  const keywordActive = animeDropdown !== '' || customInput !== '';
  const presetDisabled = keywordActive;
  const keywordDisabled = selectedPreset !== null;

  const inputActions = useInputActions(
    { activeLogic, selectedPreset, animeDropdown, customInput },
    { setActiveLogic, setSelectedPreset, setAnimeDropdown, setCustomInput, addTerm },
  );

  const searchActions = useSearchActions(
    terms,
    saveQuery,
    setSearching,
    setSearchError,
    setSearchResults,
  );

  return {
    activeLogic,
    selectedPreset,
    animeDropdown,
    customInput,
    watchingNames,
    terms,
    searching,
    searchError,
    searchResults,
    savedQueries,
    searchQuery: searchActions.searchQuery,
    keywordDisabled,
    presetDisabled,
    toggleLogic: inputActions.toggleLogic,
    handlePresetClick: inputActions.handlePresetClick,
    handleDropdownChange: inputActions.handleDropdownChange,
    handleInputChange: inputActions.handleInputChange,
    handleInputKeyDown: inputActions.handleInputKeyDown,
    removeTerm,
    handleSearch: searchActions.handleSearch,
    saveCurrentQuery: searchActions.saveCurrentQuery,
    removeSavedQuery,
  };
}
