import type { Field } from '../../types/jt808';

export function flattenLeaves(fields: Field[]): Field[] {
  const out: Field[] = [];
  const walk = (list: Field[]) =>
  list.forEach((f) => {
    if (f.children?.length) walk(f.children);else
    out.push(f);
  });
  walk(fields);
  return out;
}

export function buildByteOwners(fields: Field[], length: number): (Field | undefined)[] {
  const owners: (Field | undefined)[] = new Array(length).fill(undefined);
  flattenLeaves(fields).forEach((f) => {
    for (let i = f.offset; i < f.offset + f.length && i < length; i++) owners[i] = f;
  });
  return owners;
}

export function findField(fields: Field[], id: string): Field | undefined {
  for (const f of fields) {
    if (f.id === id) return f;
    if (f.children) {
      const hit = findField(f.children, id);
      if (hit) return hit;
    }
  }
  return undefined;
}

export function findAncestors(fields: Field[], id: string, trail: string[] = []): string[] | null {
  for (const f of fields) {
    if (f.id === id) return trail;
    if (f.children) {
      const hit = findAncestors(f.children, id, [...trail, f.id]);
      if (hit) return hit;
    }
  }
  return null;
}

export function collectGroupIds(fields: Field[]): string[] {
  const ids: string[] = [];
  const walk = (list: Field[]) =>
  list.forEach((f) => {
    if (f.children?.length) {
      ids.push(f.id);
      walk(f.children);
    }
  });
  walk(fields);
  return ids;
}