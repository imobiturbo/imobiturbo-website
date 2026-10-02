import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "./model.mjs";
import { authoredCssErrors, colorValueError } from "./authored-css.mjs";
import { vocabularyError } from "./vocabulary.mjs";
const model = load(dirname(dirname(fileURLToPath(import.meta.url))));
export const plugin = {
  rules: {
    "finite-vocabulary": {
      meta: {
        type: "problem",
        schema: [],
        messages: { invalid: "{{message}}" },
      },
      create(context) {
        const seen = new WeakSet();
        function check(node, value) {
          if (seen.has(node)) return;
          seen.add(node);
          for (const token of value.split(/\s+/).filter(Boolean)) {
            const error = vocabularyError(token, model);
            if (error)
              context.report({
                node,
                messageId: "invalid",
                data: { message: error },
              });
          }
          if (
            value.split(/\s+/).includes("uppercase") &&
            !/font-it-mono/.test(value)
          )
            context.report({
              node,
              messageId: "invalid",
              data: {
                message:
                  "IT-TYPE: uppercase exige font-it-mono no mesmo contrato; use sentence case.",
              },
            });
        }
        function read(node) {
          if (!node) return;
          if (node.type === "Literal" && typeof node.value === "string")
            check(node, node.value);
          if (node.type === "SvelteLiteral") check(node, node.value);
          if (node.type === "TemplateLiteral")
            for (const q of node.quasis) check(q, q.value.cooked ?? "");
          if (
            node.type === "JSXExpressionContainer" ||
            node.type === "SvelteMustacheTag"
          )
            read(node.expression);
          if (node.type === "ArrayExpression") node.elements.forEach(read);
          if (node.type === "ObjectExpression")
            node.properties.forEach((p) => {
              if (!p.computed) read(p.key);
              read(p.value);
            });
          if (node.type === "ConditionalExpression") {
            read(node.consequent);
            read(node.alternate);
          }
          if (node.type === "LogicalExpression") read(node.right);
          if (node.type === "CallExpression") node.arguments.forEach(read);
        }
        return {
          Program(node) {
            for (const match of context.sourceCode.text.matchAll(
              /<style[^>]*>([\s\S]*?)<\/style>/g,
            ))
              for (const message of authoredCssErrors(
                match[1],
                context.filename,
              ))
                context.report({
                  node,
                  messageId: "invalid",
                  data: { message },
                });
          },
          JSXAttribute(node) {
            if (["class", "className"].includes(node.name?.name))
              read(node.value);
            if (
              ["color", "fill", "stroke"].includes(node.name?.name) &&
              typeof node.value?.value === "string"
            ) {
              const error = colorValueError(node.value.value);
              if (error)
                context.report({
                  node,
                  messageId: "invalid",
                  data: { message: error },
                });
            }
          },
          SvelteAttribute(node) {
            if (node.key?.name?.name === "class" || node.key?.name === "class")
              for (const value of node.value ?? []) read(value);
            if (
              ["color", "fill", "stroke"].includes(
                node.key?.name?.name ?? node.key?.name,
              )
            )
              for (const value of node.value ?? [])
                if (typeof value.value === "string") {
                  const error = colorValueError(value.value);
                  if (error)
                    context.report({
                      node,
                      messageId: "invalid",
                      data: { message: error },
                    });
                }
          },
          CallExpression(node) {
            if (
              [
                ...model.policy.mergeFunctions,
                ...model.policy.variantFunctions,
                ...[].concat(context.settings.shadcn?.mergeFunctions ?? []),
              ].includes(node.callee?.name)
            )
              node.arguments.forEach(read);
          },
        };
      },
    },
  },
};
plugin.rules["component-contract"] = {
  meta: { type: "problem", schema: [], messages: { invalid: "{{message}}" } },
  create(context) {
    const imports = new Map();
    const patterns =
      context.settings.shadcn?.componentImports ??
      model.policy.componentImports;
    function identify(name) {
      const binding = imports.get(name.split(".")[0]);
      return (
        binding &&
        model.components.components[binding.replace(/^Imobiturbo/, "")]
      );
    }
    function check(name, attributes) {
      const contract = identify(name);
      if (!contract) return;
      for (const attribute of attributes ?? []) {
        const key =
          attribute.name?.name ??
          attribute.key?.name?.name ??
          attribute.key?.name;
        const values =
          key === "variant"
            ? contract.variants
            : key === "size"
              ? contract.sizes
              : null;
        if (!values) continue;
        const node = Array.isArray(attribute.value)
          ? attribute.value[0]
          : attribute.value;
        const literal = node?.value;
        if (typeof literal === "string" && !Object.hasOwn(values, literal))
          context.report({
            node: attribute,
            messageId: "invalid",
            data: {
              message: `IT-CONTRACT: ${name}.${key}="${literal}" não existe. Use ${Object.keys(values).join(", ")}. Origem: components.json.`,
            },
          });
      }
    }
    function asset(node, value) {
      if (typeof value !== "string") return;
      const path = value
        .replace(/^@imobiturbo\/design-system\//, "")
        .replace(/^\.\//, "")
        .replace(/^\//, "");
      const entry = model.assets.assets.find((a) => a.file === path);
      if (entry && !["active"].includes(entry.status))
        context.report({
          node,
          messageId: "invalid",
          data: {
            message: `IT-ASSET: ${entry.id} tem status ${entry.status}. Escolha o ID ativo em /assets-manifest para o produto e fundo atuais.`,
          },
        });
    }
    return {
      ImportDeclaration(node) {
        const value = node.source.value;
        if (
          (context.settings.imobiturbo?.legacyComponentImports ?? []).some(
            (p) => new RegExp(p).test(value),
          )
        )
          context.report({
            node,
            messageId: "invalid",
            data: {
              message: `IT-LEGACY: ${value} pertence ao legado do produto. Use @cio/ui/imobiturbo para UI nova ou migre o contrato explicitamente.`,
            },
          });
        if (patterns.some((p) => new RegExp(p).test(value)))
          for (const specifier of node.specifiers)
            imports.set(
              specifier.local.name,
              specifier.imported?.name ?? specifier.local.name,
            );
        asset(node.source, value);
      },
      JSXOpeningElement(node) {
        const name =
          node.name.type === "JSXMemberExpression"
            ? `${node.name.object.name}.${node.name.property.name}`
            : node.name.name;
        check(name ?? "", node.attributes);
        for (const a of node.attributes ?? [])
          if (a.name?.name === "src") asset(a, a.value?.value);
      },
      SvelteElement(node) {
        check(node.name?.name ?? "", node.startTag?.attributes);
        for (const a of node.startTag?.attributes ?? [])
          if ((a.key?.name?.name ?? a.key?.name) === "src")
            asset(a, a.value?.[0]?.value);
      },
    };
  },
};
export default plugin;
plugin.rules["native-controls"] = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      native:
        "IT-NATIVE: use {{component}} do consumidor com variant/size. Elementos nativos ficam no adapter que aplica components.json; não crie uma receita na página.",
    },
  },
  create(context) {
    const report = (node, name, attributes) => {
      if (name === "button")
        context.report({
          node,
          messageId: "native",
          data: { component: "Button" },
        });
      if (name === "input") {
        const attribute = (attributes ?? []).find(
          (a) => (a.name?.name ?? a.key?.name?.name ?? a.key?.name) === "type",
        );
        const value = Array.isArray(attribute?.value)
          ? attribute.value[0]?.value
          : attribute?.value?.value;
        if (
          !value ||
          [
            "text",
            "email",
            "password",
            "search",
            "url",
            "tel",
            "number",
          ].includes(value)
        )
          context.report({
            node,
            messageId: "native",
            data: { component: "Input" },
          });
      }
    };
    return {
      JSXOpeningElement: (n) => report(n, n.name?.name, n.attributes),
      SvelteElement: (n) => report(n, n.name?.name, n.startTag?.attributes),
    };
  },
};
