/**
 * Manual Jest mock for `@supabase/supabase-js`. Auto-applied to the node module
 * in every test so the real network client never loads. Provides an in-memory
 * fake of the bits VS-15 uses: a chainable/awaitable query builder
 * (`from().upsert()/.select()/.gt()/.eq()`) over a `Map<table, Map<uuid,row>>`,
 * and an `auth` object with the email/password helpers.
 *
 * Test helpers are exposed on the module: `__reset`, `__seed`, `__getTable`,
 * `__setSession`, `__fail`.
 */
const store = new Map(); // table -> Map(uuid -> row)
let session = null;
let failure = null; // persistent { message } until cleared by __reset/__fail(null)

function tableMap(table) {
  if (!store.has(table)) store.set(table, new Map());
  return store.get(table);
}

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this._op = 'select';
    this._rows = null;
    this._conflict = 'uuid';
    this._filters = [];
  }

  upsert(rows, options) {
    this._op = 'upsert';
    this._rows = Array.isArray(rows) ? rows : [rows];
    this._conflict = (options && options.onConflict) || 'uuid';
    return this;
  }

  select() {
    return this;
  }

  gt(col, val) {
    this._filters.push((r) => r[col] != null && r[col] > val);
    return this;
  }

  eq(col, val) {
    this._filters.push((r) => r[col] === val);
    return this;
  }

  _run() {
    if (failure) return { data: null, error: failure };
    const map = tableMap(this.table);
    if (this._op === 'upsert') {
      for (const row of this._rows) {
        map.set(row[this._conflict], { ...row });
      }
      return { data: this._rows, error: null };
    }
    let rows = Array.from(map.values());
    for (const f of this._filters) rows = rows.filter(f);
    return { data: rows.map((r) => ({ ...r })), error: null };
  }

  then(resolve, reject) {
    return Promise.resolve(this._run()).then(resolve, reject);
  }
}

const auth = {
  async signUp({ email }) {
    if (failure) return { data: { user: null, session: null }, error: failure };
    session = { user: { id: `user-${email}`, email } };
    return { data: { user: session.user, session }, error: null };
  },
  async signInWithPassword({ email }) {
    if (failure) return { data: { user: null, session: null }, error: failure };
    session = { user: { id: `user-${email}`, email } };
    return { data: { user: session.user, session }, error: null };
  },
  async signOut() {
    session = null;
    return { error: null };
  },
  async getSession() {
    return { data: { session }, error: null };
  },
  onAuthStateChange() {
    return { data: { subscription: { unsubscribe() {} } } };
  },
};

function createClient() {
  return {
    from: (table) => new QueryBuilder(table),
    auth,
  };
}

module.exports = {
  createClient,
  /** Clears the in-memory cloud store, session, and failure flag. */
  __reset() {
    store.clear();
    session = null;
    failure = null;
  },
  /** Seeds cloud-side rows for a table (keyed by row.uuid). */
  __seed(table, rows) {
    const map = tableMap(table);
    for (const row of rows) map.set(row.uuid, { ...row });
  },
  /** Returns the current cloud-side rows for a table. */
  __getTable(table) {
    return Array.from(tableMap(table).values());
  },
  /** Sets (or clears, with null) the current fake auth session. */
  __setSession(next) {
    session = next;
  },
  /** Makes every subsequent client call return this error until __reset/__fail(null). */
  __fail(err) {
    failure = err == null ? null : typeof err === 'string' ? { message: err } : err;
  },
};
