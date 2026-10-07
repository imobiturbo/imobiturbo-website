# OS ilimitado com Club e bônus — 7 de outubro de 2026

O OS é o produto principal da LP. A entrega é a mesma da Comunidade: CRM ilimitado, OS e Club pelo período contratado. O Club, as trilhas, Mentor IA, scripts, materiais, gravações de mentorias e comunidade aparecem como bônus incluídos.

| Período | Valor da cobrança | Equivalente mensal | Cakto | Catálogo de acesso OS |
| --- | --- | --- | --- | --- |
| Mensal | R$ 147 | R$ 147 | cdpxiid | comunidade-mensal |
| Trimestral | R$ 357 | R$ 119 | yr8snnq | comunidade-trimestral |
| Anual | R$ 997 | R$ 83,08 | db3o676 | comunidade-anual |

As ofertas são assinaturas recorrentes na Cakto (30, 90 e 365 dias). A renovação está explícita na LP; os equivalentes trimestral/anual não são parcelas mensais. Os três períodos têm os mesmos benefícios. Não há adicionais por usuário ou conexão na oferta atual.

O checkout nativo usa o produto `3cfccfb5-ec02-4832-a6b9-a0ff19cba3cc`. A ativação é assistida: o e-mail da Cakto contém o link para a equipe conferir a compra e liberar OS e Club pelo período escolhido. A LP não promete liberação automática. Publicação e conferência do checkout não provam uma compra ou acesso entregue. Mentor IA não é suporte pessoal do Natan; somente as gravações de mentorias estão incluídas.

A LP anterior está preservada no commit `eb1285ea071dfb62aeedf69269976347da288522` e na tag remota `backup/os-lp-start-growth-scale-20261007`. Há um arquivo das fontes em `imobiturbo-infra/.artifacts/os-club-oferta-20261007/backup/` e um backup do Worker compilado na VPS3 em `/opt/builds/backups/os-lp-start-growth-scale-20261007/worker-assets-eb1285e.tar.gz` (SHA-256 `4662b07719b12daf34c4967b644ccf8bbe6999a71f5bee04ac7e16f8a5fad7be`). A versão aprovada anterior do Worker é `6c41806e-1ff9-4128-965a-61e56a3fde75`.

Restaure o layout em uma worktree limpa da tag na VPS3, execute os testes, gere `npm run build:os-landing` e publique com a configuração `wrangler.os-landing.jsonc` e a trava de publicação. Valide oferta e entrega antes de recolocar qualquer link antigo em produção: os limites Start/Growth/Scale não estavam implementados no OS.
