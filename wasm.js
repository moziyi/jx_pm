// wasm.js — WASM 加载 + 字符串解码

export async function loadWasm(url) {
  const buf = await fetch(url).then((r) => {
    if (!r.ok) throw Error(`HTTP ${r.status}`);
    return r.arrayBuffer();
  });
  const { instance } = await WebAssembly.instantiate(buf, {
    env: { math_random: () => Math.random() },
  });
  const exports = instance.exports;
  const mem = new Uint8Array(exports.memory.buffer);

  function ds(ptr) {
    if (ptr === 0) return "";
    const len = new DataView(mem.buffer).getUint32(ptr - 4, true) & 0xffff;
    return new TextDecoder("utf-16le").decode(mem.slice(ptr, ptr + len * 2));
  }

  return { exports, ds };
}
