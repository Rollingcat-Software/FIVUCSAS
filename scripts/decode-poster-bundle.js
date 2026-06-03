// Decode the self-unpacking v6 poster bundle into a fully static, no-JS HTML.
// Mirrors the in-page unpacker, but swaps asset uuids for inline data: URIs
// (persistent) instead of ephemeral blob: URLs, so the file renders with
// JavaScript disabled and no network.
const fs = require('fs');
const zlib = require('zlib');

const SRC = process.argv[2] || '/opt/projects/RemoteUploads/FIVUCSAS Poster v6.html';
const OUT = process.argv[3] || '/tmp/fivucsas-poster-v6-static.html';
const html = fs.readFileSync(SRC, 'utf8');

function extract(type) {
  const re = new RegExp('<script type="__bundler/' + type + '">([\\s\\S]*?)</script>', 'i');
  const m = html.match(re);
  return m ? m[1].trim() : null;
}

const manifest = JSON.parse(extract('manifest'));
let template = JSON.parse(extract('template'));      // template = JSON-encoded HTML string
const extRaw = extract('ext_resources');
const extResources = extRaw ? JSON.parse(extRaw) : [];

const dataUrls = {};
let totalBytes = 0;
const mimeCounts = {};
for (const uuid of Object.keys(manifest)) {
  const entry = manifest[uuid];
  let bytes = Buffer.from(entry.data, 'base64');
  if (entry.compressed) bytes = zlib.gunzipSync(bytes);
  totalBytes += bytes.length;
  mimeCounts[entry.mime] = (mimeCounts[entry.mime] || 0) + 1;
  dataUrls[uuid] = 'data:' + (entry.mime || 'application/octet-stream') + ';base64,' + bytes.toString('base64');
}

for (const uuid of Object.keys(manifest)) template = template.split(uuid).join(dataUrls[uuid]);
template = template.replace(/\s+integrity="[^"]*"/gi, '').replace(/\s+crossorigin="[^"]*"/gi, '');

const resourceMap = {};
for (const e of extResources) if (dataUrls[e.uuid]) resourceMap[e.id] = dataUrls[e.uuid];
if (Object.keys(resourceMap).length) {
  const rs = '<script>window.__resources = ' +
    JSON.stringify(resourceMap).split('</' + 'script>').join('<\\/' + 'script>') + ';</' + 'script>';
  const headOpen = template.match(/<head[^>]*>/i);
  if (headOpen) { const i = headOpen.index + headOpen[0].length; template = template.slice(0, i) + rs + template.slice(i); }
}

fs.writeFileSync(OUT, template);
console.log('assets:', Object.keys(manifest).length, '| ext_resources:', extResources.length);
console.log('mime breakdown:', JSON.stringify(mimeCounts));
console.log('decompressed asset bytes:', (totalBytes/1e6).toFixed(2) + ' MB');
console.log('output size:', (fs.statSync(OUT).size/1e6).toFixed(2) + ' MB ->', OUT);
// sanity: any leftover bundler scaffolding or unresolved uuids?
const leftoverUuid = (template.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) || []).length;
console.log('leftover uuid-like tokens:', leftoverUuid, '| has __bundler refs:', /__bundler/.test(template), '| script tags:', (template.match(/<script/gi)||[]).length);
