import type { Episode, RelatedCharacter, RelatedPerson } from 'bangumi-api-client';
import { useEffect, useState } from 'react';

import { bgm } from '../../api/bgm';

export function useEpisodes(subjectId: number | null): { episodes: Episode[]; loading: boolean } {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (subjectId === null) {
      setEpisodes([]);
      setLoading(false);
      return;
    }
    const cancelled = { current: false };
    setEpisodes([]);
    setLoading(true);
    void (async () => {
      try {
        const { data } = await bgm.episodes.getEpisodes(subjectId, { limit: 200 });
        if (!cancelled.current) {
          setEpisodes(data?.data ?? []);
          setLoading(false);
        }
      } catch {
        if (!cancelled.current) {
          setEpisodes([]);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled.current = true;
    };
  }, [subjectId]);

  return { episodes, loading };
}

export function useCharacters(subjectId: number | null): {
  characters: RelatedCharacter[];
  loading: boolean;
} {
  const [characters, setCharacters] = useState<RelatedCharacter[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (subjectId === null) {
      setCharacters([]);
      setLoading(false);
      return;
    }
    const cancelled = { current: false };
    setCharacters([]);
    setLoading(true);
    void (async () => {
      try {
        const { data } = await bgm.subjects.getRelatedCharactersBySubjectId(subjectId);
        if (!cancelled.current) {
          setCharacters(data ?? []);
          setLoading(false);
        }
      } catch {
        if (!cancelled.current) {
          setCharacters([]);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled.current = true;
    };
  }, [subjectId]);

  return { characters, loading };
}

export function usePersons(subjectId: number | null): {
  persons: RelatedPerson[];
  loading: boolean;
} {
  const [persons, setPersons] = useState<RelatedPerson[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (subjectId === null) {
      setPersons([]);
      setLoading(false);
      return;
    }
    const cancelled = { current: false };
    setPersons([]);
    setLoading(true);
    void (async () => {
      try {
        const { data } = await bgm.subjects.getRelatedPersonsBySubjectId(subjectId);
        if (!cancelled.current) {
          setPersons(data ?? []);
          setLoading(false);
        }
      } catch {
        if (!cancelled.current) {
          setPersons([]);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled.current = true;
    };
  }, [subjectId]);

  return { persons, loading };
}
