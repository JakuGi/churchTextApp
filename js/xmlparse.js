// Minimálny XML parser bez závislostí.
// Beží v prehliadači aj v Node.js (kvôli testom), takže nepoužíva DOMParser.

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
};

export function decodeEntities(value) {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X'
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    const known = ENTITIES[body.toLowerCase()];
    return known === undefined ? match : known;
  });
}

function findTagEnd(src, from) {
  let quote = null;
  for (let i = from; i < src.length; i += 1) {
    const ch = src[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '>') {
      return i;
    }
  }
  return -1;
}

const ATTR_RE = /([A-Za-z_:][\w.:-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;

function parseTag(raw) {
  const selfClosing = raw.endsWith('/');
  const body = selfClosing ? raw.slice(0, -1) : raw;
  const nameMatch = /^\s*([^\s/>]+)/.exec(body);
  const name = nameMatch ? nameMatch[1] : '';
  const attrs = {};
  ATTR_RE.lastIndex = nameMatch ? nameMatch[0].length : 0;
  let attr;
  while ((attr = ATTR_RE.exec(body)) !== null) {
    attrs[attr[1].toLowerCase()] = decodeEntities(attr[3] !== undefined ? attr[3] : attr[4]);
  }
  return { name, attrs, selfClosing };
}

function makeElement(name, attrs) {
  return { type: 'element', name, localName: name.replace(/^.*:/, '').toLowerCase(), attrs, children: [] };
}

/**
 * Rozparsuje XML reťazec na jednoduchý strom.
 * @returns {{type:'element', name:'#document', children: Array}}
 */
export function parseXML(source) {
  let src = String(source || '');
  if (src.charCodeAt(0) === 0xfeff) src = src.slice(1);

  const doc = makeElement('#document', {});
  const stack = [doc];
  const top = () => stack[stack.length - 1];
  const addText = (value, cdata) => {
    if (!value) return;
    top().children.push({ type: 'text', value: cdata ? value : decodeEntities(value), cdata: !!cdata });
  };

  let i = 0;
  while (i < src.length) {
    const lt = src.indexOf('<', i);
    if (lt === -1) {
      addText(src.slice(i), false);
      break;
    }
    if (lt > i) addText(src.slice(i, lt), false);

    if (src.startsWith('<!--', lt)) {
      const end = src.indexOf('-->', lt + 4);
      i = end === -1 ? src.length : end + 3;
      continue;
    }
    if (src.startsWith('<![CDATA[', lt)) {
      const end = src.indexOf(']]>', lt + 9);
      addText(src.slice(lt + 9, end === -1 ? src.length : end), true);
      i = end === -1 ? src.length : end + 3;
      continue;
    }
    if (src.startsWith('<?', lt)) {
      const end = src.indexOf('?>', lt + 2);
      i = end === -1 ? src.length : end + 2;
      continue;
    }
    if (src.startsWith('<!', lt)) {
      const end = findTagEnd(src, lt + 2);
      i = end === -1 ? src.length : end + 1;
      continue;
    }

    const gt = findTagEnd(src, lt + 1);
    if (gt === -1) {
      addText(src.slice(lt), false);
      break;
    }
    const raw = src.slice(lt + 1, gt);
    i = gt + 1;

    if (raw[0] === '/') {
      const closing = raw.slice(1).trim().toLowerCase();
      for (let s = stack.length - 1; s > 0; s -= 1) {
        if (stack[s].name.toLowerCase() === closing) {
          stack.length = s;
          break;
        }
      }
      continue;
    }

    const tag = parseTag(raw);
    if (!tag.name) continue;
    const element = makeElement(tag.name, tag.attrs);
    top().children.push(element);
    if (!tag.selfClosing) stack.push(element);
  }

  return doc;
}

export function elements(node, name) {
  if (!node) return [];
  const wanted = name ? name.toLowerCase() : null;
  return node.children.filter((child) => child.type === 'element' && (!wanted || child.localName === wanted));
}

export function firstElement(node, ...names) {
  for (const name of names) {
    const found = elements(node, name)[0];
    if (found) return found;
  }
  return null;
}

/** Nájde prvý potomok v ľubovoľnej hĺbke. */
export function deepFirst(node, ...names) {
  const wanted = names.map((n) => n.toLowerCase());
  const queue = [...elements(node)];
  while (queue.length) {
    const current = queue.shift();
    if (wanted.includes(current.localName)) return current;
    queue.push(...elements(current));
  }
  return null;
}

/** Textový obsah uzla vrátane potomkov; <br/> sa prepíše na nový riadok. */
export function textOf(node) {
  if (!node) return '';
  let out = '';
  for (const child of node.children) {
    if (child.type === 'text') out += child.value;
    else if (child.localName === 'br') out += '\n';
    else out += textOf(child);
  }
  return out;
}

export function attr(node, ...names) {
  if (!node) return '';
  for (const name of names) {
    const value = node.attrs[name.toLowerCase()];
    if (value !== undefined && value !== '') return value;
  }
  return '';
}
