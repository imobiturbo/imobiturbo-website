var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// _worker.js
var V = Object.defineProperty;
var s = /* @__PURE__ */ __name((t, r) => V(t, "name", { value: r, configurable: true }), "s");
var z = "https://os.imobiturbo.com.br/api/v1/webhooks/in/i7F0QAdp3xKbXOSzSft0lCjkzXggzPxV";
var G = "whsec_asnPLHWJWNjXM28ppgf6dWlM97KXWIms4_NpWUn3zwk";
var C = s((t, r = 200) => new Response(JSON.stringify(t), { status: r, headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type, authorization, x-imobiturbo-signature" } }), "jsonResponse");
async function X(t, r) {
  let e = new TextEncoder(), o = await crypto.subtle.importKey("raw", e.encode(t), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]), c = await crypto.subtle.sign("HMAC", o, e.encode(r));
  return Array.from(new Uint8Array(c)).map((n) => n.toString(16).padStart(2, "0")).join("");
}
__name(X, "X");
s(X, "computeHmacSha256");
async function W({ request: t, env: r }) {
  if (t.method === "OPTIONS") return new Response(null, { status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type, authorization, x-imobiturbo-signature", "access-control-max-age": "86400" } });
  if (t.method !== "POST") return C({ error: "method_not_allowed", message: "M\xE9todo n\xE3o permitido" }, 405);
  let e = {}, o = t.headers.get("content-type") || "";
  try {
    if (o.includes("application/json")) e = await t.json();
    else if (o.includes("application/x-www-form-urlencoded")) {
      let a = await t.text();
      e = Object.fromEntries(new URLSearchParams(a));
    } else {
      let a = await t.text();
      e = a ? JSON.parse(a) : {};
    }
  } catch {
    return C({ error: "invalid_payload", message: "Corpo da requisi\xE7\xE3o inv\xE1lido" }, 400);
  }
  let c = typeof e.name == "string" ? e.name.trim() : "", n = typeof e.phone == "string" ? e.phone.trim() : "", i = typeof e.email == "string" ? e.email.trim() : "";
  if (!c) return C({ error: "missing_field", field: "name", message: "Nome \xE9 obrigat\xF3rio" }, 400);
  if (!n) return C({ error: "missing_field", field: "phone", message: "WhatsApp \xE9 obrigat\xF3rio" }, 400);
  let u = r.IMOBITURBO_WEBHOOK_SECRET || G, p = { name: c, phone: n, ...i ? { email: i } : {}, ...e.message ? { message: e.message } : {}, ...e.perfil ? { perfil: e.perfil } : {}, ...e.utm_source ? { utm_source: e.utm_source } : {}, ...e.utm_medium ? { utm_medium: e.utm_medium } : {}, ...e.utm_campaign ? { utm_campaign: e.utm_campaign } : {}, ...e.utm_content ? { utm_content: e.utm_content } : {}, ...e.utm_term ? { utm_term: e.utm_term } : {}, origem: "site_imobiturbo_contato", origem_url: t.url, user_agent: t.headers.get("user-agent") || "", submitted_at: (/* @__PURE__ */ new Date()).toISOString() }, f = JSON.stringify(p), m = "";
  try {
    m = await X(u, f);
  } catch (a) {
    console.error("Error computing HMAC signature:", a);
  }
  try {
    let a = { "content-type": "application/json", authorization: `Bearer ${u}` };
    m && (a["x-imobiturbo-signature"] = m);
    let d = await fetch(z, { method: "POST", headers: a, body: f }), l = await d.text(), w = {};
    try {
      w = JSON.parse(l);
    } catch {
      w = { raw: l };
    }
    return d.ok ? C({ ok: true, message: "Contato enviado com sucesso!", data: w.data || w }) : C({ error: "upstream_error", status: d.status, message: w.message || "Erro ao processar contato" }, d.status);
  } catch {
    return C({ error: "network_error", message: "N\xE3o foi poss\xEDvel conectar ao servidor. Tente novamente mais tarde." }, 502);
  }
}
__name(W, "W");
s(W, "onRequest");
var O = s((t, r = 200) => new Response(JSON.stringify(t), { status: r, headers: { "content-type": "application/json; charset=utf-8" } }), "json");
var P = s((t, r, e = 0) => Number.parseFloat(t[r] ?? e) || 0, "number");
var Q = s((t) => [1, 2, 3, 4, 5].map((r) => P(t, `conv${r}`) / 100), "conversions");
function j(t, r) {
  let e = t * r[0], o = e * r[1], c = o * r[2], n = c * r[3], i = n * r[4];
  return { leads: t, op: e, va: o, vr: c, pr: n, ve: i };
}
__name(j, "j");
s(j, "funnel");
function F(t, r) {
  let e = [t];
  for (let o of r) e.push(o > 0 ? e.at(-1) / o : 0);
  return e;
}
__name(F, "F");
s(F, "costs");
async function q({ request: t, env: r }) {
  if (t.method === "OPTIONS") return new Response(null, { status: 204, headers: { allow: "POST, OPTIONS" } });
  if (t.method !== "POST") return O({ erro: "M\xE9todo n\xE3o permitido" }, 405);
  let e;
  try {
    e = await t.json();
  } catch {
    return O({ erro: "Body inv\xE1lido ou n\xE3o \xE9 JSON" }, 400);
  }
  if (!e || typeof e != "object" || Array.isArray(e)) return O({ erro: "Body inv\xE1lido ou n\xE3o \xE9 JSON" }, 400);
  if (!r.SIMULADOR_PASSWORD || String(e.senha ?? "").trim().toLowerCase() !== r.SIMULADOR_PASSWORD.toLowerCase()) return O({ erro: "Senha incorreta" }, 401);
  let o = Q(e), c = P(e, "orcamento"), n = P(e, "custoLead"), i = P(e, "ticket"), u = P(e, "taxaServico");
  if (e.tipo === "autonomo") {
    let p = i * P(e, "percComissao") / 100, f = j(n > 0 ? c / n : 0, o), m = Math.floor(f.ve), a = m * p, d = c + u;
    return O({ funil: f, costs: F(n, o), comissao: p, vendas: m, receita: a, totalInv: d, lucro: a - d, roas: d > 0 ? a / d : 0, convGeral: f.leads > 0 ? f.ve / f.leads * 100 : 0, vgv: m * i });
  }
  if (e.tipo === "imobiliaria") {
    let p = P(e, "percCorretor"), f = P(e, "percGestor"), m = P(e, "percImob"), a = p + f + m, d = i * p / 100, l = i * f / 100, w = i * m / 100, y = j(n > 0 ? c / n : 0, o), v = Math.floor(y.ve), x = v * i * a / 100, E = v * w, g = c + u;
    return O({ funil: y, costs: F(n, o), totalPerc: a, valCorretor: d, valGestor: l, valImob: w, vendas: v, receitaTotal: x, receitaImob: E, totalInv: g, lucroImob: E - g, roas: g > 0 ? x / g : 0, convGeral: y.leads > 0 ? y.ve / y.leads * 100 : 0, vgv: v * i, totalCorretor: v * d, totalGestor: v * l, totalImob: E });
  }
  if (e.tipo === "gestor") {
    let p = Math.max(1, Number.parseInt(e.nCorretores ?? 1, 10) || 1), f = P(e, "percOverride"), m = P(e, "percVendaPropria"), a = P(e, "vendasProprias"), d = j(n > 0 ? c / p / n : 0, o), l = Object.fromEntries(Object.entries(d).map(([h, b]) => [h, b * p])), w = Math.floor(l.ve), y = w * i, v = y * f / 100, x = a * i * m / 100, E = v + x, g = c + u;
    return O({ funilCorretor: d, funilTime: l, costs: F(n, o), vendasTime: w, vgv: y, ganhoOverride: v, ganhoVPropria: x, ganhoTotal: E, totalInv: g, roas: g > 0 ? E / g : 0 });
  }
  return O({ erro: `Tipo inv\xE1lido: '${e.tipo ?? ""}'. Use 'autonomo', 'imobiliaria' ou 'gestor'` }, 400);
}
__name(q, "q");
s(q, "onRequest");
function $({ request: t, next: r }) {
  let e = new URL(t.url);
  return e.hostname === "imobiturbo.com.br" ? (e.hostname = "www.imobiturbo.com.br", Response.redirect(e.toString(), 301)) : r();
}
__name($, "$");
s($, "onRequest");
var I = [{ routePath: "/api/contact", mountPath: "/api", method: "", middlewares: [], modules: [W] }, { routePath: "/simulador/calculo.php", mountPath: "/simulador", method: "", middlewares: [], modules: [q] }, { routePath: "/", mountPath: "/", method: "", middlewares: [$], modules: [] }];
function Y(t) {
  for (var r = [], e = 0; e < t.length; ) {
    var o = t[e];
    if (o === "*" || o === "+" || o === "?") {
      r.push({ type: "MODIFIER", index: e, value: t[e++] });
      continue;
    }
    if (o === "\\") {
      r.push({ type: "ESCAPED_CHAR", index: e++, value: t[e++] });
      continue;
    }
    if (o === "{") {
      r.push({ type: "OPEN", index: e, value: t[e++] });
      continue;
    }
    if (o === "}") {
      r.push({ type: "CLOSE", index: e, value: t[e++] });
      continue;
    }
    if (o === ":") {
      for (var c = "", n = e + 1; n < t.length; ) {
        var i = t.charCodeAt(n);
        if (i >= 48 && i <= 57 || i >= 65 && i <= 90 || i >= 97 && i <= 122 || i === 95) {
          c += t[n++];
          continue;
        }
        break;
      }
      if (!c) throw new TypeError("Missing parameter name at ".concat(e));
      r.push({ type: "NAME", index: e, value: c }), e = n;
      continue;
    }
    if (o === "(") {
      var u = 1, p = "", n = e + 1;
      if (t[n] === "?") throw new TypeError('Pattern cannot start with "?" at '.concat(n));
      for (; n < t.length; ) {
        if (t[n] === "\\") {
          p += t[n++] + t[n++];
          continue;
        }
        if (t[n] === ")") {
          if (u--, u === 0) {
            n++;
            break;
          }
        } else if (t[n] === "(" && (u++, t[n + 1] !== "?")) throw new TypeError("Capturing groups are not allowed at ".concat(n));
        p += t[n++];
      }
      if (u) throw new TypeError("Unbalanced pattern at ".concat(e));
      if (!p) throw new TypeError("Missing pattern at ".concat(e));
      r.push({ type: "PATTERN", index: e, value: p }), e = n;
      continue;
    }
    r.push({ type: "CHAR", index: e, value: t[e++] });
  }
  return r.push({ type: "END", index: e, value: "" }), r;
}
__name(Y, "Y");
s(Y, "lexer");
function Z(t, r) {
  r === void 0 && (r = {});
  for (var e = Y(t), o = r.prefixes, c = o === void 0 ? "./" : o, n = r.delimiter, i = n === void 0 ? "/#?" : n, u = [], p = 0, f = 0, m = "", a = s(function(_) {
    if (f < e.length && e[f].type === _) return e[f++].value;
  }, "tryConsume"), d = s(function(_) {
    var R = a(_);
    if (R !== void 0) return R;
    var T = e[f], H = T.type, J = T.index;
    throw new TypeError("Unexpected ".concat(H, " at ").concat(J, ", expected ").concat(_));
  }, "mustConsume"), l = s(function() {
    for (var _ = "", R; R = a("CHAR") || a("ESCAPED_CHAR"); ) _ += R;
    return _;
  }, "consumeText"), w = s(function(_) {
    for (var R = 0, T = i; R < T.length; R++) {
      var H = T[R];
      if (_.indexOf(H) > -1) return true;
    }
    return false;
  }, "isSafe"), y = s(function(_) {
    var R = u[u.length - 1], T = _ || (R && typeof R == "string" ? R : "");
    if (R && !T) throw new TypeError('Must have text between two parameters, missing text after "'.concat(R.name, '"'));
    return !T || w(T) ? "[^".concat(A(i), "]+?") : "(?:(?!".concat(A(T), ")[^").concat(A(i), "])+?");
  }, "safePattern"); f < e.length; ) {
    var v = a("CHAR"), x = a("NAME"), E = a("PATTERN");
    if (x || E) {
      var g = v || "";
      c.indexOf(g) === -1 && (m += g, g = ""), m && (u.push(m), m = ""), u.push({ name: x || p++, prefix: g, suffix: "", pattern: E || y(g), modifier: a("MODIFIER") || "" });
      continue;
    }
    var h = v || a("ESCAPED_CHAR");
    if (h) {
      m += h;
      continue;
    }
    m && (u.push(m), m = "");
    var b = a("OPEN");
    if (b) {
      var g = l(), S = a("NAME") || "", N = a("PATTERN") || "", M = l();
      d("CLOSE"), u.push({ name: S || (N ? p++ : ""), pattern: S && !N ? y(g) : N, prefix: g, suffix: M, modifier: a("MODIFIER") || "" });
      continue;
    }
    d("END");
  }
  return u;
}
__name(Z, "Z");
s(Z, "parse");
function L(t, r) {
  var e = [], o = K(t, e, r);
  return k(o, e, r);
}
__name(L, "L");
s(L, "match");
function k(t, r, e) {
  e === void 0 && (e = {});
  var o = e.decode, c = o === void 0 ? function(n) {
    return n;
  } : o;
  return function(n) {
    var i = t.exec(n);
    if (!i) return false;
    for (var u = i[0], p = i.index, f = /* @__PURE__ */ Object.create(null), m = s(function(d) {
      if (i[d] === void 0) return "continue";
      var l = r[d - 1];
      l.modifier === "*" || l.modifier === "+" ? f[l.name] = i[d].split(l.prefix + l.suffix).map(function(w) {
        return c(w, l);
      }) : f[l.name] = c(i[d], l);
    }, "_loop_1"), a = 1; a < i.length; a++) m(a);
    return { path: u, index: p, params: f };
  };
}
__name(k, "k");
s(k, "regexpToFunction");
function A(t) {
  return t.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(A, "A");
s(A, "escapeString");
function B(t) {
  return t && t.sensitive ? "" : "i";
}
__name(B, "B");
s(B, "flags");
function ee(t, r) {
  if (!r) return t;
  for (var e = /\((?:\?<(.*?)>)?(?!\?)/g, o = 0, c = e.exec(t.source); c; ) r.push({ name: c[1] || o++, prefix: "", suffix: "", modifier: "", pattern: "" }), c = e.exec(t.source);
  return t;
}
__name(ee, "ee");
s(ee, "regexpToRegexp");
function te(t, r, e) {
  var o = t.map(function(c) {
    return K(c, r, e).source;
  });
  return new RegExp("(?:".concat(o.join("|"), ")"), B(e));
}
__name(te, "te");
s(te, "arrayToRegexp");
function re(t, r, e) {
  return ne(Z(t, e), r, e);
}
__name(re, "re");
s(re, "stringToRegexp");
function ne(t, r, e) {
  e === void 0 && (e = {});
  for (var o = e.strict, c = o === void 0 ? false : o, n = e.start, i = n === void 0 ? true : n, u = e.end, p = u === void 0 ? true : u, f = e.encode, m = f === void 0 ? function(R) {
    return R;
  } : f, a = e.delimiter, d = a === void 0 ? "/#?" : a, l = e.endsWith, w = l === void 0 ? "" : l, y = "[".concat(A(w), "]|$"), v = "[".concat(A(d), "]"), x = i ? "^" : "", E = 0, g = t; E < g.length; E++) {
    var h = g[E];
    if (typeof h == "string") x += A(m(h));
    else {
      var b = A(m(h.prefix)), S = A(m(h.suffix));
      if (h.pattern) if (r && r.push(h), b || S) if (h.modifier === "+" || h.modifier === "*") {
        var N = h.modifier === "*" ? "?" : "";
        x += "(?:".concat(b, "((?:").concat(h.pattern, ")(?:").concat(S).concat(b, "(?:").concat(h.pattern, "))*)").concat(S, ")").concat(N);
      } else x += "(?:".concat(b, "(").concat(h.pattern, ")").concat(S, ")").concat(h.modifier);
      else {
        if (h.modifier === "+" || h.modifier === "*") throw new TypeError('Can not repeat "'.concat(h.name, '" without a prefix and suffix'));
        x += "(".concat(h.pattern, ")").concat(h.modifier);
      }
      else x += "(?:".concat(b).concat(S, ")").concat(h.modifier);
    }
  }
  if (p) c || (x += "".concat(v, "?")), x += e.endsWith ? "(?=".concat(y, ")") : "$";
  else {
    var M = t[t.length - 1], _ = typeof M == "string" ? v.indexOf(M[M.length - 1]) > -1 : M === void 0;
    c || (x += "(?:".concat(v, "(?=").concat(y, "))?")), _ || (x += "(?=".concat(v, "|").concat(y, ")"));
  }
  return new RegExp(x, B(e));
}
__name(ne, "ne");
s(ne, "tokensToRegexp");
function K(t, r, e) {
  return t instanceof RegExp ? ee(t, r) : Array.isArray(t) ? te(t, r, e) : re(t, r, e);
}
__name(K, "K");
s(K, "pathToRegexp");
var D = /[.+?^${}()|[\]\\]/g;
function* oe(t) {
  let r = new URL(t.url).pathname;
  for (let e of [...I].reverse()) {
    if (e.method && e.method !== t.method) continue;
    let o = L(e.routePath.replace(D, "\\$&"), { end: false }), c = L(e.mountPath.replace(D, "\\$&"), { end: false }), n = o(r), i = c(r);
    if (n && i) for (let u of e.middlewares.flat()) yield { handler: u, params: n.params, path: i.path };
  }
  for (let e of I) {
    if (e.method && e.method !== t.method) continue;
    let o = L(e.routePath.replace(D, "\\$&"), { end: true }), c = L(e.mountPath.replace(D, "\\$&"), { end: false }), n = o(r), i = c(r);
    if (n && i && e.modules.length) {
      for (let u of e.modules.flat()) yield { handler: u, params: n.params, path: n.path };
      break;
    }
  }
}
__name(oe, "oe");
s(oe, "executeRequest");
var _e = { async fetch(t, r, e) {
  let o = t, c = oe(o), n = {}, i = false, u = s(async (p, f) => {
    if (p !== void 0) {
      let a = p;
      typeof p == "string" && (a = new URL(p, o.url).toString()), o = new Request(a, f);
    }
    let m = c.next();
    if (m.done === false) {
      let { handler: a, params: d, path: l } = m.value, w = { request: new Request(o.clone()), functionPath: l, next: u, params: d, get data() {
        return n;
      }, set data(v) {
        if (typeof v != "object" || v === null) throw new Error("context.data must be an object");
        n = v;
      }, env: r, waitUntil: e.waitUntil.bind(e), passThroughOnException: s(() => {
        i = true;
      }, "passThroughOnException") }, y = await a(w);
      if (!(y instanceof Response)) throw new Error("Your Pages function should return a Response");
      return U(y);
    } else {
      let a = await r.ASSETS.fetch(o);
      return U(a);
    }
  }, "next");
  try {
    return await u();
  } catch (p) {
    if (i) {
      let f = await r.ASSETS.fetch(o);
      return U(f);
    }
    throw p;
  }
} };
var U = s((t) => new Response([101, 204, 205, 304].includes(t.status) ? null : t.body, t), "cloneResponse");
export {
  _e as default
};
//# sourceMappingURL=bundledWorker-0.8458912163435119.mjs.map
