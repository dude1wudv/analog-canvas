/** Transient graph of the completed edit. Stored Net IDs never add an edge. */
export class ConnectionGraph {
  private parent = new Map<string, string>();
  add(key: string) {
    if (!this.parent.has(key)) this.parent.set(key, key);
  }
  root(key: string): string {
    this.add(key);
    let root = key;
    while (this.parent.get(root) !== root) root = this.parent.get(root)!;
    while (key !== root) {
      const next = this.parent.get(key)!;
      this.parent.set(key, root);
      key = next;
    }
    return root;
  }
  join(keys: readonly string[]) {
    const first = keys[0];
    if (!first) return;
    for (const key of keys.slice(1)) {
      const a = this.root(first),
        b = this.root(key);
      if (a !== b) this.parent.set(b, a);
    }
  }
  groups(keys: readonly string[]): string[][] {
    const groups = new Map<string, string[]>();
    for (const key of keys) {
      const root = this.root(key);
      const group = groups.get(root) ?? [];
      group.push(key);
      groups.set(root, group);
    }
    return [...groups.values()];
  }
}
