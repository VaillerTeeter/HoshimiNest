import type { Episode, Subject } from 'bangumi-api-client';

import {
  AUDIENCES,
  EP_TYPE_PREFIX,
  GENRES,
  PLATFORMS,
  REGIONS,
  SOURCES,
  todayStr,
} from './constants';

const TAG_GROUPS = [AUDIENCES, REGIONS, SOURCES, GENRES, PLATFORMS] as const;

export function buildDetailTags(subject: Subject): string[] {
  const tagNames = new Set(subject.tags.map((t) => t.name));
  const knownTags = new Set(TAG_GROUPS.flat());
  const ordered: string[] = [];
  for (const group of TAG_GROUPS) {
    for (const tag of group) {
      if (tagNames.has(tag)) {
        ordered.push(tag);
      }
    }
  }
  for (const t of subject.tags) {
    if (!knownTags.has(t.name)) {
      ordered.push(t.name);
    }
  }
  return ordered;
}

export function getEpLabel(ep: Episode): string {
  const prefix = EP_TYPE_PREFIX[ep.type] ?? '';
  const num = ep.sort % 1 === 0 ? String(ep.sort) : String(ep.sort.toFixed(1));
  return `${prefix}${num}`;
}

export function isEpAired(ep: Episode, subjectDate: string | undefined): boolean {
  const validAirdate = ep.airdate !== '' && ep.airdate !== '0000-00-00';
  if (ep.comment > 0) {
    return true;
  }
  if (validAirdate) {
    return ep.airdate <= todayStr;
  }
  return subjectDate !== undefined && subjectDate !== '' && subjectDate <= todayStr;
}

export function pickImage(large: string, medium: string): string {
  return large === '' ? medium : large;
}

export function pickName(nameCn: string, name: string): string {
  return nameCn === '' ? name : nameCn;
}
