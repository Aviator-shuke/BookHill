(function () {
  const libraryCache = new Map();

  function parseTsv(text, manifest) {
    const items = String(text || "")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const firstTab = line.indexOf("\t");
        const secondTab = line.indexOf("\t", firstTab + 1);
        if (firstTab < 1 || secondTab < 0) return null;
        return {
          id: line.slice(0, firstTab).trim(),
          text: line.slice(firstTab + 1, secondTab).trim(),
          translation: line.slice(secondTab + 1).trim(),
          libraryId: manifest.id
        };
      })
      .filter((item) => item && item.id && item.text && item.translation);

    if (items.length !== Number(manifest.count)) {
      throw new Error(`句库条数不一致：清单 ${manifest.count} 条，实际 ${items.length} 条。`);
    }
    return items;
  }

  async function load(manifestUrl) {
    if (libraryCache.has(manifestUrl)) return libraryCache.get(manifestUrl);
    const promise = (async () => {
      const manifestResponse = await fetch(manifestUrl, { cache: "no-store" });
      if (!manifestResponse.ok) throw new Error(`无法读取句库清单（${manifestResponse.status}）`);
      const manifest = await manifestResponse.json();
      if (manifest.schemaVersion !== 1 || manifest.format !== "tsv" || !manifest.file) {
        throw new Error("当前网页不支持这个句库格式。");
      }
      const dataUrl = new URL(manifest.file, manifestResponse.url);
      const dataResponse = await fetch(dataUrl, { cache: "no-store" });
      if (!dataResponse.ok) throw new Error(`无法读取句库内容（${dataResponse.status}）`);
      const items = parseTsv(await dataResponse.text(), manifest);
      return { manifest, items };
    })();
    libraryCache.set(manifestUrl, promise);
    try {
      return await promise;
    } catch (error) {
      libraryCache.delete(manifestUrl);
      throw error;
    }
  }

  window.langLSRWLibrary = { load };
})();
