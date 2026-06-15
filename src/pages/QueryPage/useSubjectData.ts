import {
  createBangumiClient,
  type Episode,
  type RelatedCharacter,
  type RelatedPerson,
} from 'bangumi-api-client';
import { useEffect, useState } from 'react';

const bgm = createBangumiClient({ userAgent: 'HoshimiNest/0.1.0' });

interface EpisodesResult {
  episodes: Episode[];
  episodesLoading: boolean;
}

export function useEpisodes(selectedId: number | null): EpisodesResult {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);

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
  }, [selectedId]);

  return { episodes, episodesLoading };
}

interface CharactersResult {
  characters: RelatedCharacter[];
  charactersLoading: boolean;
}

export function useCharacters(selectedId: number | null): CharactersResult {
  const [characters, setCharacters] = useState<RelatedCharacter[]>([]);
  const [charactersLoading, setCharactersLoading] = useState(false);

  useEffect(() => {
    if (selectedId === null) {
      setCharacters([]);
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
  }, [selectedId]);

  return { characters, charactersLoading };
}

interface PersonsResult {
  persons: RelatedPerson[];
  personsLoading: boolean;
}

export function usePersons(selectedId: number | null): PersonsResult {
  const [persons, setPersons] = useState<RelatedPerson[]>([]);
  const [personsLoading, setPersonsLoading] = useState(false);

  useEffect(() => {
    if (selectedId === null) {
      setPersons([]);
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
  }, [selectedId]);

  return { persons, personsLoading };
}
