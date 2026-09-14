(() => {
  const KEY = "haru-memo-v1";

  const $ = (id) => document.getElementById(id);
  const els = {
    list: $("noteList"),
    search: $("search"),
    sort: $("sort"),
    count: $("noteCount"),
    title: $("title"),
    body: $("body"),
    meta: $("meta"),
    empty: $("emptyEditor"),
    pin: $("btnPin"),
    toast: $("toast"),
    theme: $("theme"),
    fontSize: $("fontSize"),
    fontSizeVal: $("fontSizeVal"),
    settings: $("settingsModal"),
    importFile: $("importFile"),
  };

  const state = {
    notes: [],
    currentId: null,
    settings: { theme: "dark", fontSize: 16, sort: "updated" },
    saveTimer: null,
  };

  function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      state.notes = Array.isArray(data.notes) ? data.notes : [];
      state.settings = { ...state.settings, ...(data.settings || {}) };
    } catch {
      toast("保存データが壊れてた。空から始める");
    }
  }

  function persist() {
    localStorage.setItem(
      KEY,
      JSON.stringify({ notes: state.notes, settings: state.settings, savedAt: Date.now() })
    );
  }

  function applySettings() {
    document.documentElement.dataset.theme = state.settings.theme;
    document.documentElement.style.setProperty("--editor-size", state.settings.fontSize + "px");
    els.theme.value = state.settings.theme;
    els.fontSize.value = state.settings.fontSize;
    els.fontSizeVal.textContent = state.settings.fontSize + "px";
    els.sort.value = state.settings.sort;
  }

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.remove("hidden");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => els.toast.classList.add("hidden"), 2200);
  }

  function preview(text) {
    return (text || "").replace(/\s+/g, " ").trim().slice(0, 60);
  }

  function fmt(ts) {
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function filtered() {
    const q = els.search.value.trim().toLowerCase();
    let list = state.notes.slice();
    if (q) {
      list = list.filter((n) =>
        (n.title || "").toLowerCase().includes(q) || (n.body || "").toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (state.settings.sort === "title") {
        return (a.title || "").localeCompare(b.title || "", "ja");
      }
      if (state.settings.sort === "created") return (b.createdAt || 0) - (a.createdAt || 0);
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
    return list;
  }

  function renderList() {
    const list = filtered();
    els.count.textContent = `${list.length}件`;
    els.list.innerHTML = "";
    if (!list.length) {
      const li = document.createElement("li");
      li.className = "note-preview";
      li.style.padding = "16px";
      li.textContent = els.search.value ? "見つからん" : "まだメモがない";
      els.list.appendChild(li);
      return;
    }
    for (const n of list) {
      const li = document.createElement("li");
      li.className = "note-item" + (n.id === state.currentId ? " active" : "");
      li.tabIndex = 0;
      li.innerHTML = `
        <div class="note-title">${n.pinned ? '<span class="pin">📌</span>' : ""}<span></span></div>
        <p class="note-preview"></p>
        <p class="note-date"></p>`;
      li.querySelector(".note-title span:last-child").textContent = n.title || "無題";
      li.querySelector(".note-preview").textContent = preview(n.body) || "（空っぽ）";
      li.querySelector(".note-date").textContent = fmt(n.updatedAt);
      li.addEventListener("click", () => openNote(n.id, true));
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter") openNote(n.id, true);
      });
      els.list.appendChild(li);
    }
  }

  function current() {
    return state.notes.find((n) => n.id === state.currentId) || null;
  }

  function openNote(id, mobilePush) {
    state.currentId = id;
    const n = current();
    const has = Boolean(n);
    els.empty.classList.toggle("hidden", has);
    els.title.disabled = !has;
    els.body.disabled = !has;
    if (has) {
      els.title.value = n.title || "";
      els.body.value = n.body || "";
      updateMeta(n);
      els.pin.textContent = n.pinned ? "📍" : "📌";
      if (mobilePush) document.body.classList.add("show-editor");
    } else {
      els.title.value = "";
      els.body.value = "";
      els.meta.textContent = "";
      document.body.classList.remove("show-editor");
    }
    renderList();
  }

  function updateMeta(n) {
    const chars = (n.body || "").length;
    const lines = (n.body || "").split("\n").length;
    els.meta.textContent = `更新 ${fmt(n.updatedAt)}  ・  ${chars}文字  ・  ${lines}行`;
  }

  function createNote() {
    const now = Date.now();
    const n = {
      id: uid(),
      title: "",
      body: "",
      pinned: false,
      createdAt: now,
      updatedAt: now,
    };
    state.notes.unshift(n);
    persist();
    openNote(n.id, true);
    els.title.focus();
    toast("新しいメモ作った");
  }

  function scheduleSave() {
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(saveCurrent, 250);
  }

  function saveCurrent() {
    const n = current();
    if (!n) return;
    n.title = els.title.value.trim();
    n.body = els.body.value;
    n.updatedAt = Date.now();
    persist();
    updateMeta(n);
    renderList();
  }

  function togglePin() {
    const n = current();
    if (!n) return;
    n.pinned = !n.pinned;
    n.updatedAt = Date.now();
    persist();
    els.pin.textContent = n.pinned ? "📍" : "📌";
    renderList();
    toast(n.pinned ? "上に固定した" : "ピン外した");
  }

  function deleteCurrent() {
    const n = current();
    if (!n) return;
    const label = n.title || "無題";
    if (!confirm(`「${label}」消す。戻せんぞ？`)) return;
    state.notes = state.notes.filter((x) => x.id !== n.id);
    persist();
    openNote(state.notes[0]?.id || null, false);
    toast("消した");
  }

  function exportAll() {
    const blob = new Blob(
      [JSON.stringify({ app: "haru-memo", exportedAt: new Date().toISOString(), notes: state.notes }, null, 2)],
      { type: "application/json" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `haru-memo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("書き出した。大事に持っとけ");
  }

  function importAll(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const incoming = Array.isArray(data) ? data : data.notes;
        if (!Array.isArray(incoming)) throw new Error("format");
        const existingIds = new Set(state.notes.map((n) => n.id));
        let added = 0;
        for (const raw of incoming) {
          if (!raw || typeof raw !== "object") continue;
          const n = {
            id: raw.id && !existingIds.has(raw.id) ? raw.id : uid(),
            title: String(raw.title || ""),
            body: String(raw.body || raw.content || ""),
            pinned: Boolean(raw.pinned),
            createdAt: Number(raw.createdAt) || Date.now(),
            updatedAt: Number(raw.updatedAt) || Date.now(),
          };
          state.notes.push(n);
          existingIds.add(n.id);
          added++;
        }
        persist();
        renderList();
        toast(`${added}件読み込んだ`);
      } catch {
        toast("そのファイル、読めん");
      }
    };
    reader.readAsText(file);
  }

  function wipe() {
    if (!confirm("全部消す。バックアップした？")) return;
    if (!confirm("本当に全削除する。後悔するなよ")) return;
    state.notes = [];
    state.currentId = null;
    persist();
    openNote(null);
    renderList();
    toast("空っぽになった");
  }

  $("btnNew").addEventListener("click", createNote);
  $("btnNewEmpty").addEventListener("click", createNote);
  $("btnPin").addEventListener("click", togglePin);
  $("btnDelete").addEventListener("click", deleteCurrent);
  $("btnExport").addEventListener("click", exportAll);
  $("btnImport").addEventListener("click", () => els.importFile.click());
  els.importFile.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) importAll(file);
    e.target.value = "";
  });
  $("btnBack").addEventListener("click", () => {
    saveCurrent();
    document.body.classList.remove("show-editor");
  });
  $("btnSettings").addEventListener("click", () => els.settings.classList.remove("hidden"));
  $("btnCloseSettings").addEventListener("click", () => els.settings.classList.add("hidden"));
  $("btnWipe").addEventListener("click", wipe);
  els.settings.addEventListener("click", (e) => {
    if (e.target === els.settings) els.settings.classList.add("hidden");
  });

  els.title.addEventListener("input", scheduleSave);
  els.body.addEventListener("input", scheduleSave);
  els.search.addEventListener("input", renderList);
  els.sort.addEventListener("change", () => {
    state.settings.sort = els.sort.value;
    persist();
    renderList();
  });
  els.theme.addEventListener("change", () => {
    state.settings.theme = els.theme.value;
    applySettings();
    persist();
  });
  els.fontSize.addEventListener("input", () => {
    state.settings.fontSize = Number(els.fontSize.value);
    applySettings();
    persist();
  });

  document.addEventListener("keydown", (e) => {
    const meta = e.ctrlKey || e.metaKey;
    if (meta && e.key.toLowerCase() === "s") {
      e.preventDefault();
      saveCurrent();
      toast("保存した（もともと自動だけどな）");
    }
    if (meta && e.key.toLowerCase() === "n") {
      e.preventDefault();
      createNote();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) saveCurrent();
  });

  load();
  applySettings();
  if (state.notes.length) openNote(state.notes[0].id);
  else openNote(null);
  renderList();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
})();
