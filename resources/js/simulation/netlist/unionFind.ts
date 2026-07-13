/**
 * Disjoint-set (union-find) over string keys, with a `setCanonical` extension
 * used by the netlist builder to collapse wired pins into named nets and pin
 * a net's name (e.g. ground → "0").
 *
 *   uf.add(key)
 *   uf.union(a, b)
 *   uf.find(key)               → representative key of the set
 *   uf.setCanonical(key, name) → force the set containing `key` to a name
 *   uf.getCanonical(key)       → the forced name for key's set, or undefined
 *
 * Union by rank + path compression → effectively O(α(n)) per operation, so a
 * whole circuit's nets resolve in one linear pass instead of the previous
 * bounded fixed-point re-scan.
 */
export class UnionFind {
  private parent = new Map<string, string>();
  private rank = new Map<string, number>();
  /** Forced name for a set, keyed by the set's current root. */
  private canonicalByRoot = new Map<string, string>();

  add(key: string): void {
    if (!this.parent.has(key)) {
      this.parent.set(key, key);
      this.rank.set(key, 0);
    }
  }

  find(key: string): string {
    this.add(key);
    let root = key;
    while (this.parent.get(root) !== root) {
      root = this.parent.get(root)!;
    }
    // Path compression.
    let cur = key;
    while (this.parent.get(cur) !== root) {
      const next = this.parent.get(cur)!;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;

    const rankA = this.rank.get(ra)!;
    const rankB = this.rank.get(rb)!;
    // Attach the lower-rank tree under the higher-rank one.
    let root: string;
    let child: string;
    if (rankA < rankB) {
      root = rb;
      child = ra;
    } else if (rankA > rankB) {
      root = ra;
      child = rb;
    } else {
      root = ra;
      child = rb;
      this.rank.set(root, rankA + 1);
    }
    this.parent.set(child, root);

    // Carry the forced name to the surviving root. If both sets were pinned,
    // the root's own name wins (in practice only "0"/ground is ever pinned,
    // so any collision is between identical names).
    const childName = this.canonicalByRoot.get(child);
    if (childName !== undefined && !this.canonicalByRoot.has(root)) {
      this.canonicalByRoot.set(root, childName);
    }
    this.canonicalByRoot.delete(child);
  }

  setCanonical(key: string, name: string): void {
    this.canonicalByRoot.set(this.find(key), name);
  }

  getCanonical(key: string): string | undefined {
    return this.canonicalByRoot.get(this.find(key));
  }
}
