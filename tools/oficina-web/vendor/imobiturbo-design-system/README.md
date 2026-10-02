# Imobiturbo Design System

Tokens, contratos e política do ecossistema Imobiturbo. A versão está em package.json; a referência gerada está em [dist/reference.md](dist/reference.md).

## Fontes e distribuição

| Decisão | Origem | Artefato distribuído |
|---|---|---|
| Cor, tipografia, espaço, radius, elevação, motion | tokens/*.json | /css, /tokens, /tailwind-v4, /tailwind |
| Variants, sizes, slots, overrides | components.json | /recipes, /catalog |
| Permissões e mensagens | policy.json | /lint, /eslint |
| Logos, fontes e aplicação por fundo | manifests | /assets-manifest, /catalog |

A geração não lê outputs anteriores. CSS da raiz resolve fonts/; CSS distribuído para HTML resolve ../fonts/. O CSS scoped/Tailwind usa URLs de fontes pelo export do pacote para que o bundler possa entregá-las após a compilação. O pacote exporta JavaScript e declarações TypeScript; o preset v3 é CommonJS explícito.

## Consumo

Distribua o tarball produzido na VPS3 ou fixe o commit Git da release privada. Nenhum consumidor deve usar uma branch flutuante como versão.

Esta é a release 5: as recipes usam classes `it-*`, exports JavaScript executáveis e contratos validados. Atualize pacote, política, imports CSS e adapters juntos. Consumidores ainda não migrados devem continuar fixados na release anterior; aliases CSS/preset preservam caminhos, mas não autorizam misturar recipes de versões diferentes.

Tailwind4: importe Tailwind no entrypoint do produto e depois `@imobiturbo/design-system/tailwind-v4`. Com prefixo `ui`, as classes do contrato recebem `ui:`. Tailwind3: importe `/css` e use o preset `/tailwind` na configuração existente.

React, Vue e Svelte mantêm os componentes nativos. Consuma as recipes e torne variant/size legíveis no componente local; confira paridade com /components. Para lint em Vue/Svelte, use ESLint com o parser do template.

O plugin adicional `/eslint` rejeita frações fora da escala e valores arbitrários. A configuração `/lint` é importada explicitamente; não é descoberta automaticamente. Oxlint não herda settings por extends.

## Comandos

Execute na VPS3, em /opt/builds/:

```bash
npm ci --ignore-scripts
npm run build
npm run design:check
npm test
npm run lint
node scripts/export-open-design.mjs --out /opt/builds/artifacts/imobiturbo-export
```

`design:check` não escreve arquivos. Valida schema, referências/ciclos, pares de contraste, contratos, assets/fontes, exports, URLs e divergência dos artefatos. Erro de resolução do linter deve falhar o gate.

## Compatibilidade e preservação

`tokens.css`, `colors_and_type.css`, exports .ts e o nome antigo do preset são aliases gerados. Assets históricos têm status explícito; somente status active é recomendado ao agente. Arquivos não são excluídos pela deduplicação. Os templates em templates/ e assets/skills-ia constituem um perfil aprovado separado.

OpenDesign recebe export com commit, versão e hashes. Não sobreponha perfis de projetos nem use symlink como mecanismo de pacote: o runtime exclui symlinks do ZIP. Veja [USAGE.md](USAGE.md).

GitHub serve para versionamento. CI/build exclusivamente na VPS3; Actions desativado.

## Validação no consumidor

Carregue `/lint` como JSON e repasse `settings`, `rules` e `overrides` ao ESLint, junto com os plugins `shadcn` e `/eslint`. Declare os imports reais do consumidor, o parser de cada linguagem e o entrypoint CSS do Tailwind. Use `/lint-runner` para tornar avisos de descoberta em falhas. Mantenha a dependência e a política na mesma release.

Para HTML estático e OpenDesign, `/recipes/css` contém as classes dos contratos já compiladas. O comando abaixo valida classes da escala, props declarativas, receitas completas, styles, assets legados e presença de nomes acessíveis:

```bash
imobiturbo-design --html caminho/UI.html
```

Declare `data-it-component`, `data-variant`, `data-size` e `data-it-slot` nos componentes HTML. `variantTarget` informa se a variante pertence à raiz ou a um slot. Copie as classes resolvidas de `/catalog`. A validação estática de acessibilidade não substitui teste de teclado e leitura no navegador. Copy com evidências, contexto e resultados reais continua exigindo revisão de conteúdo.

Os tokens mantêm o formato compatível com o pacote anterior e adotam referências entre valores, schema e catálogo resolvido. Não declaram conformidade DTCG: mudar todo o formato acrescentaria custo aos consumidores sem benefício necessário para esta etapa.
