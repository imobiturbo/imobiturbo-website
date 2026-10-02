# Imobiturbo Design System

Leia README.md e dist/catalog.json. Precedência: tokens para valores; components.json para variantes/sizes/slots; policy.json para permissões; assets-manifest.json para marca; fonts/manifest.json para fontes. dist/ e referências são gerados e nunca vencem essas fontes.

Edite apenas fontes. Não invente cor, fonte, variante ou asset. Perfis aprovados de projetos são exceções locais explícitas, nunca regras globais. Preserve arquivos existentes e referências aprovadas.

Após alterar UI, execute o design:check do consumidor; após alterar o pacote, execute scripts/ci-vps3.sh na VPS3 (vmi3482766), em /opt/builds/. Build, testes e validação são exclusivos dessa VPS. GitHub Actions deve permanecer desativado.

No consumidor Tailwind4, instale @shadcn/lint e use /lint + /eslint; configure imports reais e o tema. Tailwind3 usa /tailwind e checks estáticos sem prometer a descoberta completa de classes v4.

Não limpe o Chrome compartilhado. Não altere assets, perfis ou screenshots aprovados para fazer um check passar. Erros de resolução de tema/imports não são sucesso.
