import type { JSX, KeyboardEvent } from 'react';

import { SearchResultsTable } from './SearchPage/SearchTable';
import type { LogicOp, SearchTerm } from './SearchPage/types';
import { useSearchPage } from './SearchPage/useSearchPage';

const LOGIC_OPTIONS: LogicOp[] = ['AND', 'OR', 'NOT'];
const PRESET_PHRASES = ['简体', '繁体', '简繁', '1080p', '720p', '480p'];

function tagOpSymbol(op: LogicOp): string {
  if (op === 'OR') {
    return '|';
  }
  if (op === 'NOT') {
    return '-';
  }
  return '+';
}

interface TermTagProps {
  term: SearchTerm;
  onRemove: (id: number) => void;
}

function TermTag({ term, onRemove }: TermTagProps): JSX.Element {
  return (
    <span className="search-tag">
      <span className="search-tag-op">{tagOpSymbol(term.op)}</span>
      <span className="search-tag-value">{term.value}</span>
      <button
        className="search-tag-close"
        onClick={() => {
          onRemove(term.id);
        }}
        title="删除"
      >
        ×
      </button>
    </span>
  );
}

interface SavedChipProps {
  query: string;
  searching: boolean;
  onSearch: () => void;
  onRemove: (q: string) => void;
}

function SavedChip({ query, searching, onSearch, onRemove }: SavedChipProps): JSX.Element {
  return (
    <span className="search-saved-chip">
      <button
        className="search-saved-chip-text"
        onClick={onSearch}
        disabled={searching}
        title={query}
      >
        {query}
      </button>
      <button
        className="search-tag-close"
        onClick={() => {
          onRemove(query);
        }}
        title="删除"
      >
        ×
      </button>
    </span>
  );
}

interface LogicRowProps {
  activeLogic: LogicOp | null;
  toggleLogic: (op: LogicOp) => void;
}

function LogicRow({ activeLogic, toggleLogic }: LogicRowProps): JSX.Element {
  return (
    <div className="search-row">
      <span className="search-label">逻辑</span>
      <div className="search-button-group">
        {LOGIC_OPTIONS.map((op) => (
          <button
            key={op}
            className={`search-logic-btn${activeLogic === op ? ' search-logic-btn--active' : ''}`}
            onClick={() => {
              toggleLogic(op);
            }}
          >
            {op}
          </button>
        ))}
      </div>
    </div>
  );
}

interface PresetRowProps {
  selectedPreset: string | null;
  presetDisabled: boolean;
  handlePresetClick: (p: string) => void;
}

function PresetRow({
  selectedPreset,
  presetDisabled,
  handlePresetClick,
}: PresetRowProps): JSX.Element {
  return (
    <div className="search-row">
      <span className="search-label">预置词</span>
      <div className="search-button-group">
        {PRESET_PHRASES.map((p) => (
          <button
            key={p}
            className={`search-preset-btn${selectedPreset === p ? ' search-preset-btn--active' : ''}${presetDisabled ? ' search-preset-btn--muted' : ''}`}
            onClick={() => {
              handlePresetClick(p);
            }}
            disabled={presetDisabled}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

interface KeywordRowProps {
  activeLogic: LogicOp | null;
  animeDropdown: string;
  customInput: string;
  watchingNames: string[];
  keywordDisabled: boolean;
  handleDropdownChange: (v: string) => void;
  handleInputChange: (v: string) => void;
  handleInputKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}

function KeywordRow({
  activeLogic,
  animeDropdown,
  customInput,
  watchingNames,
  keywordDisabled,
  handleDropdownChange,
  handleInputChange,
  handleInputKeyDown,
}: KeywordRowProps): JSX.Element {
  const selectDisabled = customInput !== '' || keywordDisabled;
  const inputDisabled = animeDropdown !== '' || keywordDisabled;
  return (
    <div className="search-row search-row--keyword">
      <span className="search-label">关键词</span>
      <select
        className={`search-select${selectDisabled ? ' search-select--disabled' : ''}`}
        value={animeDropdown}
        onChange={(e) => {
          handleDropdownChange(e.target.value);
        }}
        disabled={selectDisabled}
      >
        <option value="">— 选择番剧 —</option>
        {watchingNames.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <span className="search-keyword-or">或</span>
      <input
        className={`search-custom-input${inputDisabled ? ' search-custom-input--disabled' : ''}`}
        type="text"
        placeholder={activeLogic === null ? '自由输入关键词…' : '输入关键词后按 Enter 添加…'}
        value={customInput}
        onChange={(e) => {
          handleInputChange(e.target.value);
        }}
        onKeyDown={handleInputKeyDown}
        disabled={inputDisabled}
      />
    </div>
  );
}

interface TagsRowProps {
  terms: SearchTerm[];
  removeTerm: (id: number) => void;
}

function TagsRow({ terms, removeTerm }: TagsRowProps): JSX.Element {
  return (
    <div className="search-row search-row--tags">
      <span className="search-label">已选</span>
      <div className="search-tag-list">
        {terms.length === 0 ? (
          <span className="search-empty-hint">暂无</span>
        ) : (
          terms.map((t) => <TermTag key={t.id} term={t} onRemove={removeTerm} />)
        )}
      </div>
    </div>
  );
}

interface SavedQueriesRowProps {
  savedQueries: string[];
  searching: boolean;
  handleSearch: (q?: string) => Promise<void>;
  removeSavedQuery: (q: string) => void;
}

function SavedQueriesRow({
  savedQueries,
  searching,
  handleSearch,
  removeSavedQuery,
}: SavedQueriesRowProps): JSX.Element | null {
  if (savedQueries.length === 0) {
    return null;
  }
  return (
    <div className="search-row search-row--saved">
      <span className="search-label">常用</span>
      <div className="search-saved-list">
        {savedQueries.map((q) => (
          <SavedChip
            key={q}
            query={q}
            searching={searching}
            onSearch={() => {
              void handleSearch(q);
            }}
            onRemove={removeSavedQuery}
          />
        ))}
      </div>
    </div>
  );
}

interface QueryRowProps {
  searchQuery: string;
  terms: SearchTerm[];
  searching: boolean;
  savedQueries: string[];
  searchError: string;
  handleSearch: (q?: string) => Promise<void>;
  saveCurrentQuery: () => void;
  removeSavedQuery: (q: string) => void;
}

function QueryRow({
  searchQuery,
  terms,
  searching,
  savedQueries,
  searchError,
  handleSearch,
  saveCurrentQuery,
  removeSavedQuery,
}: QueryRowProps): JSX.Element {
  return (
    <>
      <div className="search-row">
        <span className="search-label">查询</span>
        <div className="search-preview-box">
          <div className="search-query-preview">
            {searchQuery === '' ? <span className="search-empty-hint">—</span> : searchQuery}
          </div>
        </div>
        <button
          className="search-action-btn search-action-btn--primary"
          onClick={() => {
            void handleSearch();
          }}
          disabled={terms.length === 0 || searching}
        >
          {searching ? '查询中…' : '查询'}
        </button>
        <button
          className="search-save-btn"
          title="保存此查询"
          onClick={saveCurrentQuery}
          disabled={searchQuery === '' || savedQueries.includes(searchQuery)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M5 3h14a2 2 0 0 1 2 2v16l-7-3-7 3V5a2 2 0 0 1 2-2z" />
          </svg>
        </button>
      </div>
      <SavedQueriesRow
        savedQueries={savedQueries}
        searching={searching}
        handleSearch={handleSearch}
        removeSavedQuery={removeSavedQuery}
      />
      {searchError !== '' && <div className="search-error-msg">{searchError}</div>}
    </>
  );
}

interface SearchControlsProps {
  activeLogic: LogicOp | null;
  selectedPreset: string | null;
  animeDropdown: string;
  customInput: string;
  watchingNames: string[];
  terms: SearchTerm[];
  searching: boolean;
  searchQuery: string;
  savedQueries: string[];
  keywordDisabled: boolean;
  presetDisabled: boolean;
  searchError: string;
  toggleLogic: (op: LogicOp) => void;
  handlePresetClick: (p: string) => void;
  handleDropdownChange: (v: string) => void;
  handleInputChange: (v: string) => void;
  handleInputKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  removeTerm: (id: number) => void;
  handleSearch: (q?: string) => Promise<void>;
  saveCurrentQuery: () => void;
  removeSavedQuery: (q: string) => void;
}

function SearchControls({
  activeLogic,
  selectedPreset,
  animeDropdown,
  customInput,
  watchingNames,
  terms,
  searching,
  searchQuery,
  savedQueries,
  keywordDisabled,
  presetDisabled,
  searchError,
  toggleLogic,
  handlePresetClick,
  handleDropdownChange,
  handleInputChange,
  handleInputKeyDown,
  removeTerm,
  handleSearch,
  saveCurrentQuery,
  removeSavedQuery,
}: SearchControlsProps): JSX.Element {
  return (
    <div className="search-controls">
      <LogicRow activeLogic={activeLogic} toggleLogic={toggleLogic} />
      <PresetRow
        selectedPreset={selectedPreset}
        presetDisabled={presetDisabled}
        handlePresetClick={handlePresetClick}
      />
      <KeywordRow
        activeLogic={activeLogic}
        animeDropdown={animeDropdown}
        customInput={customInput}
        watchingNames={watchingNames}
        keywordDisabled={keywordDisabled}
        handleDropdownChange={handleDropdownChange}
        handleInputChange={handleInputChange}
        handleInputKeyDown={handleInputKeyDown}
      />
      <TagsRow terms={terms} removeTerm={removeTerm} />
      <QueryRow
        searchQuery={searchQuery}
        terms={terms}
        searching={searching}
        savedQueries={savedQueries}
        searchError={searchError}
        handleSearch={handleSearch}
        saveCurrentQuery={saveCurrentQuery}
        removeSavedQuery={removeSavedQuery}
      />
    </div>
  );
}

export default function SearchPage(): JSX.Element {
  const {
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
    searchQuery,
    keywordDisabled,
    presetDisabled,
    toggleLogic,
    handlePresetClick,
    handleDropdownChange,
    handleInputChange,
    handleInputKeyDown,
    removeTerm,
    handleSearch,
    saveCurrentQuery,
    removeSavedQuery,
  } = useSearchPage();

  return (
    <div className="search-page">
      <div className="search-panel">
        <SearchControls
          activeLogic={activeLogic}
          selectedPreset={selectedPreset}
          animeDropdown={animeDropdown}
          customInput={customInput}
          watchingNames={watchingNames}
          terms={terms}
          searching={searching}
          searchQuery={searchQuery}
          savedQueries={savedQueries}
          keywordDisabled={keywordDisabled}
          presetDisabled={presetDisabled}
          searchError={searchError}
          toggleLogic={toggleLogic}
          handlePresetClick={handlePresetClick}
          handleDropdownChange={handleDropdownChange}
          handleInputChange={handleInputChange}
          handleInputKeyDown={handleInputKeyDown}
          removeTerm={removeTerm}
          handleSearch={handleSearch}
          saveCurrentQuery={saveCurrentQuery}
          removeSavedQuery={removeSavedQuery}
        />
      </div>
      <SearchResultsTable searching={searching} searchResults={searchResults} />
    </div>
  );
}
