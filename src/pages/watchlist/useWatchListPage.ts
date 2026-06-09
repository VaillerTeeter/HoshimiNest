import type { Episode, RelatedCharacter, RelatedPerson, Subject } from 'bangumi-api-client';
import { useEffect, useMemo, useState } from 'react';

import {
  type WatchStatus,
  loadEntriesByStatus,
  setWatchEntry,
  removeWatchEntry,
  loadStatusMap,
} from '../../store/watchStore';

import { bgm, AUDIENCES, REGIONS, SOURCES, GENRES, PLATFORMS } from './constants';

interface UseWatchListPageResult {
  subjects: Subject[];
  refreshing: boolean;
  selectedId: number | null;
  setSelectedId: (id: number | null) => void;
  watchStatus: Record<number, WatchStatus>;
  viewMode: 'weekday' | 'grid';
  setViewMode: (mode: 'weekday' | 'grid') => void;
  episodes: Episode[];
  episodesLoading: boolean;
  characters: RelatedCharacter[];
  charactersLoading: boolean;
  showCharacters: boolean;
  setShowCharacters: (v: boolean) => void;
  persons: RelatedPerson[];
  personsLoading: boolean;
  showPersons: boolean;
  setShowPersons: (v: boolean) => void;
  selectedItem: Subject | null;
  detailTags: string[];
  weekdayGroups: { groups: Map<number, Subject[]>; unknown: Subject[] };
  handleWatchStatusChange: (label: WatchStatus | '无状态') => void;
}

// ── detail-tag collection helper ────────────────────────────────────────────

function collectTags(source: readonly string[], tagNames: Set<string>, ordered: string[]): void {
  for (const item of source) {
    if (tagNames.has(item)) {
      ordered.push(item);
    }
  }
}

function buildDetailTags(selectedItem: Subject): string[] {
  const tagNames = new Set(selectedItem.tags.map((t) => t.name));
  const knownTags = new Set([...AUDIENCES, ...REGIONS, ...SOURCES, ...GENRES, ...PLATFORMS]);
  const ordered: string[] = [];
  collectTags(AUDIENCES, tagNames, ordered);
  collectTags(REGIONS, tagNames, ordered);
  collectTags(SOURCES, tagNames, ordered);
  collectTags(GENRES, tagNames, ordered);
  collectTags(PLATFORMS, tagNames, ordered);
  for (const t of selectedItem.tags) {
    if (!knownTags.has(t.name)) {
      ordered.push(t.name);
    }
  }
  return ordered;
}

function buildWeekdayGroups(subjects: Subject[]): {
  groups: Map<number, Subject[]>;
  unknown: Subject[];
} {
  const groups = new Map<number, Subject[]>();
  const unknown: Subject[] = [];
  for (const s of subjects) {
    if (s.date === undefined || s.date === '' || s.date === '0000-00-00') {
      unknown.push(s);
      continue;
    }
    const d = new Date(s.date).getDay();
    const existing = groups.get(d);
    if (existing === undefined) {
      groups.set(d, [s]);
    } else {
      existing.push(s);
    }
  }
  return { groups, unknown };
}

// ── extracted data-fetching effects ─────────────────────────────────────────

interface SubjectsRefreshSetters {
  setSubjects: (v: Subject[] | ((prev: Subject[]) => Subject[])) => void;
  setWatchStatus: (v: Record<number, WatchStatus>) => void;
  setSelectedId: (v: number | null) => void;
  setRefreshing: (v: boolean) => void;
}

function useSubjectsRefresh(
  status: WatchStatus,
  isActive: boolean | undefined,
  setters: SubjectsRefreshSetters,
): void {
  const { setSubjects, setWatchStatus, setSelectedId, setRefreshing } = setters;

  useEffect(() => {
    if (isActive !== true) {
      return;
    }

    const entries = loadEntriesByStatus(status);
    setSubjects(entries.map((e) => e.subject));
    setWatchStatus(loadStatusMap());
    setSelectedId(null);

    if (entries.length === 0) {
      return;
    }

    setRefreshing(true);
    const cancelledRef = { cancelled: false };

    void (async () => {
      const refreshed: Subject[] = [];
      for (const entry of entries) {
        if (cancelledRef.cancelled) {
          break;
        }
        try {
          const res = await bgm.subjects.getSubjectById(entry.subject.id);
          if (res.data === undefined) {
            refreshed.push(entry.subject);
          } else {
            refreshed.push(res.data);
            setWatchEntry(res.data, entry.status);
          }
        } catch {
          refreshed.push(entry.subject);
        }
      }
      if (!cancelledRef.cancelled) {
        setSubjects(refreshed);
        setRefreshing(false);
      }
    })();

    return () => {
      cancelledRef.cancelled = true;
    };
  }, [status, isActive, setSubjects, setWatchStatus, setSelectedId, setRefreshing]);
}

function useSelectedEpisodes(
  selectedId: number | null,
  setEpisodes: (v: Episode[]) => void,
  setEpisodesLoading: (v: boolean) => void,
): void {
  useEffect(() => {
    if (selectedId === null) {
      setEpisodes([]);
      setEpisodesLoading(false);
      return;
    }
    const cancelled = { current: false };
    setEpisodes([]);
    setEpisodesLoading(true);
    void (async () => {
      try {
        const { data } = await bgm.episodes.getEpisodes(selectedId, { limit: 200 });
        if (!cancelled.current) {
          setEpisodes(data?.data ?? []);
          setEpisodesLoading(false);
        }
      } catch {
        if (!cancelled.current) {
          setEpisodes([]);
          setEpisodesLoading(false);
        }
      }
    })();
    return () => {
      cancelled.current = true;
    };
  }, [selectedId, setEpisodes, setEpisodesLoading]);
}

function useSelectedCharacters(
  selectedId: number | null,
  setCharacters: (v: RelatedCharacter[]) => void,
  setCharactersLoading: (v: boolean) => void,
): void {
  useEffect(() => {
    if (selectedId === null) {
      setCharacters([]);
      setCharactersLoading(false);
      return;
    }
    const cancelled = { current: false };
    setCharacters([]);
    setCharactersLoading(true);
    void (async () => {
      try {
        const { data } = await bgm.subjects.getRelatedCharactersBySubjectId(selectedId);
        if (!cancelled.current) {
          setCharacters(data ?? []);
          setCharactersLoading(false);
        }
      } catch {
        if (!cancelled.current) {
          setCharacters([]);
          setCharactersLoading(false);
        }
      }
    })();
    return () => {
      cancelled.current = true;
    };
  }, [selectedId, setCharacters, setCharactersLoading]);
}

function useSelectedPersons(
  selectedId: number | null,
  setPersons: (v: RelatedPerson[]) => void,
  setPersonsLoading: (v: boolean) => void,
): void {
  useEffect(() => {
    if (selectedId === null) {
      setPersons([]);
      setPersonsLoading(false);
      return;
    }
    const cancelled = { current: false };
    setPersons([]);
    setPersonsLoading(true);
    void (async () => {
      try {
        const { data } = await bgm.subjects.getRelatedPersonsBySubjectId(selectedId);
        if (!cancelled.current) {
          setPersons(data ?? []);
          setPersonsLoading(false);
        }
      } catch {
        if (!cancelled.current) {
          setPersons([]);
          setPersonsLoading(false);
        }
      }
    })();
    return () => {
      cancelled.current = true;
    };
  }, [selectedId, setPersons, setPersonsLoading]);
}

// ── extracted handleWatchStatusChange ──────────────────────────────────────

interface WatchStatusChangeParams {
  selectedItem: Subject | null;
  setWatchStatus: (
    v:
      | Record<number, WatchStatus>
      | ((prev: Record<number, WatchStatus>) => Record<number, WatchStatus>),
  ) => void;
  setSubjects: (v: Subject[] | ((prev: Subject[]) => Subject[])) => void;
  setSelectedId: (v: number | null) => void;
  status: WatchStatus;
}

function handleWatchStatusChangeOp(
  label: WatchStatus | '无状态',
  params: WatchStatusChangeParams,
): void {
  const { selectedItem, setWatchStatus, setSubjects, setSelectedId, status } = params;
  if (selectedItem === null) {
    return;
  }
  if (label === '无状态') {
    removeWatchEntry(selectedItem.id);
    setWatchStatus((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([k]) => Number(k) !== selectedItem.id)),
    );
    setSubjects((prev) => prev.filter((s) => s.id !== selectedItem.id));
    setSelectedId(null);
  } else if (label !== status) {
    setWatchEntry(selectedItem, label);
    setWatchStatus((prev) => ({ ...prev, [selectedItem.id]: label }));
    setSubjects((prev) => prev.filter((s) => s.id !== selectedItem.id));
    setSelectedId(null);
  }
}

// ── main hook ───────────────────────────────────────────────────────────────

export function useWatchListPage(
  status: WatchStatus,
  isActive: boolean | undefined,
  layout: 'list' | 'grid' | 'weekday',
): UseWatchListPageResult {
  const [subjects, setSubjects] = useState<Subject[]>(() =>
    loadEntriesByStatus(status).map((e) => e.subject),
  );
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [watchStatus, setWatchStatus] = useState<Record<number, WatchStatus>>(() =>
    loadStatusMap(),
  );
  const [viewMode, setViewMode] = useState<'weekday' | 'grid'>(
    layout === 'weekday' ? 'weekday' : 'grid',
  );

  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [characters, setCharacters] = useState<RelatedCharacter[]>([]);
  const [charactersLoading, setCharactersLoading] = useState(false);
  const [showCharacters, setShowCharacters] = useState(false);
  const [persons, setPersons] = useState<RelatedPerson[]>([]);
  const [personsLoading, setPersonsLoading] = useState(false);
  const [showPersons, setShowPersons] = useState(false);

  useSubjectsRefresh(status, isActive, {
    setSubjects,
    setWatchStatus,
    setSelectedId,
    setRefreshing,
  });
  useSelectedEpisodes(selectedId, setEpisodes, setEpisodesLoading);
  useSelectedCharacters(selectedId, setCharacters, setCharactersLoading);
  useSelectedPersons(selectedId, setPersons, setPersonsLoading);

  return useWatchListPageResult({
    subjects,
    refreshing,
    selectedId,
    setSelectedId,
    watchStatus,
    setWatchStatus,
    setSubjects,
    viewMode,
    setViewMode,
    episodes,
    episodesLoading,
    characters,
    charactersLoading,
    showCharacters,
    setShowCharacters,
    persons,
    personsLoading,
    showPersons,
    setShowPersons,
    status,
  });
}

function useWatchListPageResult(s: {
  subjects: Subject[];
  refreshing: boolean;
  selectedId: number | null;
  setSelectedId: (v: number | null) => void;
  watchStatus: Record<number, WatchStatus>;
  setWatchStatus: (
    v:
      | Record<number, WatchStatus>
      | ((prev: Record<number, WatchStatus>) => Record<number, WatchStatus>),
  ) => void;
  setSubjects: (v: Subject[] | ((prev: Subject[]) => Subject[])) => void;
  viewMode: 'weekday' | 'grid';
  setViewMode: (v: 'weekday' | 'grid') => void;
  episodes: Episode[];
  episodesLoading: boolean;
  characters: RelatedCharacter[];
  charactersLoading: boolean;
  showCharacters: boolean;
  setShowCharacters: (v: boolean) => void;
  persons: RelatedPerson[];
  personsLoading: boolean;
  showPersons: boolean;
  setShowPersons: (v: boolean) => void;
  status: WatchStatus;
}): UseWatchListPageResult {
  const selectedItem = useMemo(
    () => s.subjects.find((sub) => sub.id === s.selectedId) ?? null,
    [s.subjects, s.selectedId],
  );
  const detailTags = useMemo(
    () => (selectedItem === null ? [] : buildDetailTags(selectedItem)),
    [selectedItem],
  );
  const weekdayGroups = useMemo(() => buildWeekdayGroups(s.subjects), [s.subjects]);
  function handleWatchStatusChange(label: WatchStatus | '无状态'): void {
    handleWatchStatusChangeOp(label, {
      selectedItem,
      setWatchStatus: s.setWatchStatus,
      setSubjects: s.setSubjects,
      setSelectedId: s.setSelectedId,
      status: s.status,
    });
  }
  return {
    ...s,
    selectedItem,
    detailTags,
    weekdayGroups,
    handleWatchStatusChange,
  };
}
