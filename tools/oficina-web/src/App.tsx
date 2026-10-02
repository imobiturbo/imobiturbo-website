import logoLight from "@imobiturbo/design-system/assets/preserved/imobiturbo-on-white.webp";
import logoDark from "@imobiturbo/design-system/assets/all-logos-imobiturbo/imobiturbo - fundo transparente - aplicar em tema dark.webp";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Registration } from "./Registration";
const faq = [
  [
    "Quando acontecem os encontros e as pausas?",
    "Em 27 e 28 de outubro de 2026, das 18h30 às 22h30, horário de Brasília (BRT). São 240 minutos por noite, incluindo duas pausas de 10 minutos: 19h30–19h40 e 20h40–20h50.",
  ],
  [
    "Preciso usar o CRM Imobiturbo?",
    "Não. Você pode fazer os exercícios no modelo de planilha, sem contratar um CRM para participar.",
  ],
  [
    "Preciso mostrar meus clientes?",
    "Não. Use contatos anonimizados ou os exemplos fictícios. Não envie nomes, telefones ou conversas de clientes na sala.",
  ],
  [
    "Sou gestor: a inscrição inclui minha equipe?",
    "O ingresso é individual. A oficina não inclui licenças para sua equipe; condições de equipe são uma contratação separada.",
  ],
  [
    "Já sou cliente Imobiturbo?",
    "Você pode aplicar o exercício com seu acesso atual. Não precisa recomprar sua assinatura; o ingresso da oficina é uma contratação distinta.",
  ],
  [
    "Não consigo estar ao vivo?",
    "O replay fica disponível por 14 dias após o segundo encontro, até 11 de novembro de 2026, às 22h30, horário de Brasília. As orientações de acesso às gravações serão informadas aos participantes. Você mantém os modelos entregues para continuar praticando.",
  ],
  [
    "Vou sair com uma venda?",
    "A entrega é a organização de cinco contatos e uma cadência de acompanhamento. A conclusão depende de participar da prática. Não há promessa de venda de imóvel, comissão ou faturamento.",
  ],
  [
    "Haverá oferta?",
    "Sim. No segundo encontro, das 21h10 às 21h30, haverá apresentação opcional da Comunidade Imobiturbo por R$997 anuais, contratada separadamente. Depois, retomamos a prática, a revisão e as dúvidas até 22h30. O ingresso não inclui assinatura, consultoria ou implantação personalizada.",
  ],
  [
    "Como peço ajuda ou reembolso?",
    "Você pode solicitar reembolso em até sete dias corridos após a confirmação da compra pelo suporte@imobiturbo.com.br. Solicitação com identificação da compra, processada pela forma de pagamento utilizada; prazo bancário será informado no atendimento.",
  ],
];
function Action({
  children = "Quero organizar minha carteira",
}: {
  children?: string;
}) {
  return (
    <Button
      asChild
      size="lg"
    >
      <a href="#inscricao">{children}</a>
    </Button>
  );
}
function Footer() {
  return (
    <footer className="site-header mx-auto space-y-it-4 px-it-5 py-it-8 text-it-sm">
      <Separator />
      <img className="brand-logo" src={logoLight} alt="Imobiturbo" width="2456" height="875" />
      <p>Imobiturbo · WORKSHOP VGV 10X: do lead ao próximo passo</p>
      <div className="flex flex-wrap gap-x-it-6 gap-y-it-2">
        <Button asChild variant="link">
          <a href="mailto:suporte@imobiturbo.com.br">
            suporte@imobiturbo.com.br
          </a>
        </Button>
        <Button asChild variant="link">
          <a href="/politica-de-privacidade/">Privacidade</a>
        </Button>
        <Button asChild variant="link">
          <a href={window.location.pathname.includes("/obrigado") ? "/oficina/#condicoes" : "#condicoes"}>Condições da oficina</a>
        </Button>
      </div>
    </footer>
  );
}
function Thanks() {
  return (
    <>
      <main className="mx-auto max-w-2xl space-y-it-8 px-it-5 py-it-16">
        <Button asChild variant="link">
          <a href="/oficina/">Imobiturbo · WORKSHOP VGV 10X</a>
        </Button>
        <h1 className="text-it-3xl font-it-semibold sm:text-it-4xl">
          Acompanhe sua inscrição
          <span className="thanks-event">WORKSHOP VGV 10X</span>
        </h1>
        <Alert>
          <AlertTitle>A confirmação depende do processador</AlertTitle>
          <AlertDescription>
            Esta página não comprova pagamento. A inscrição será confirmada após
            a identificação do pagamento pelo Asaas.
          </AlertDescription>
        </Alert>
        <div className="space-y-it-5 text-it-base leading-it-loose">
          <p>
            Confira a confirmação no checkout ou na comunicação do processador.
            Se o pagamento ainda estiver pendente, acompanhe as instruções
            exibidas lá.
          </p>
          <p>
            Os encontros serão em{" "}
            <strong>
              27 e 28 de outubro de 2026, das 18h30 às 22h30, horário de Brasília
            </strong>
            , online. As orientações de acesso serão enviadas pelo canal
            informado na inscrição após a confirmação do pagamento.
          </p>
          <p>
            Se já pagou e não recebeu a confirmação, fale com o suporte. Não
            refaça o pagamento sem conferir a situação da compra.
          </p>
          <p>
            Cada noite tem 240 minutos, incluindo duas pausas de 10 minutos.
            O replay fica disponível por 14 dias, até 11/11/2026 às 22h30 Brasília.
          </p>
          <p>
            O ingresso da oficina não inclui nem ativa acesso à Comunidade
            Imobiturbo.
          </p>
        </div>
        <div className="flex flex-wrap gap-it-3">
          <Button asChild>
            <a href="mailto:suporte@imobiturbo.com.br?subject=Confirmacao%20Oficina%20Imobiturbo">
              Falar com o suporte
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href="/oficina/">Voltar à oficina</a>
          </Button>
        </div>
      </main>
      <Footer />
    </>
  );
}
export default function App() {
  if (window.location.pathname.includes("/obrigado")) return <Thanks />;
  return (
    <>
      <header id="top" className="site-header mx-auto flex flex-wrap items-center justify-between gap-it-4 px-it-5 py-it-5">
        <Button
          asChild
          variant="link"
          size="lg"
        >
          <a href="#top" aria-label="Imobiturbo · início"><img className="brand-logo" src={logoLight} alt="Imobiturbo" width="2456" height="875" /></a>
        </Button>
        <div className="flex flex-wrap gap-it-2">
          <Button asChild variant="ghost">
            <a href="#programa">Programa</a>
          </Button>
          <Button asChild variant="outline">
            <a href="#inscricao">Participar</a>
          </Button>
        </div>
      </header>
      <Separator />
      <main className="landing-shell">
        <section className="hero-composition">
          <div className="hero-copy space-y-it-6">
            <h1 className="hero-title">
              WORKSHOP VGV 10X
              <span className="hero-editorial">do lead ao próximo passo</span>
            </h1>
            <p className="max-w-2xl text-it-xl leading-it-loose">
              Uma carteira fica mais útil quando cada contato tem um próximo
              passo com data.
            </p>
            <p className="max-w-2xl text-it-base leading-it-loose text-it-text-muted">
              Em dois encontros ao vivo, organize cinco contatos, defina quem
              priorizar e monte uma cadência de acompanhamento para os próximos
              sete dias. Você pode começar em uma planilha.
            </p>
            <div className="event-details">
              <p className="font-it-medium">27 e 28 de outubro de 2026 · online</p>
              <p>18h30–22h30 · horário de Brasília</p>
              <p>
                Ingresso individual: <strong>R$47</strong>
              </p>
            </div>
            <Action />
            <p className="text-it-sm text-it-text-muted">
              Dois encontros de 240 minutos, incluindo duas pausas de 10 minutos
              por noite, e materiais editáveis. Replay por 14 dias, até
              11/11/2026 às 22h30 Brasília.
            </p>
          </div>
          <aside className="example-composition" aria-label="Exemplo fictício da prática">
          <Card>
            <CardHeader>
              <CardTitle>
                Do contato solto à próxima ação
              </CardTitle>
              <CardDescription>
                Exemplo fictício da prática. Não representa uma venda ou
                resultado de cliente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-it-2">
                <Badge variant="neutral">Antes</Badge>
                <p className="text-it-sm leading-it-loose">
                  Um contato pediu opções. O prazo ainda não foi informado e o
                  retorno ficou sem data.
                </p>
              </div>
              <Separator />
              <div className="space-y-it-2">
                <Badge variant="default">Depois</Badge>
                <Table>
                  <TableBody>
                    {[
                      ["Contexto", "Pediu opções; prazo desconhecido"],
                      ["Próxima ação", "Perguntar sobre o prazo"],
                      ["Responsável", "Corretor do exemplo"],
                      ["Data", "Próximo dia de acompanhamento"],
                    ].map(([a, b]) => (
                      <TableRow key={a}>
                        <TableCell>
                          {a}
                        </TableCell>
                        <TableCell>{b}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-it-sm text-it-text-muted">
                Organizar o que sabe e registrar o que precisa descobrir.
              </p>
            </CardContent>
          </Card>
          </aside>
        </section>
        <section className="practice-section" data-theme="dark">
          <div className="practice-intro">
          <img className="brand-logo brand-logo-dark" src={logoDark} alt="Imobiturbo" width="2456" height="875" />
          <h2 className="text-it-3xl font-it-semibold">Quem merece atenção hoje?</h2>
          <p className="max-w-3xl text-it-base leading-it-loose">
            Você abre as conversas, encontra um contato que pediu informações e
            precisa lembrar onde parou. Qual mensagem respeita o contexto? Quem
            ficou responsável por retornar? Na oficina, você transforma essas
            perguntas em registros que pode consultar.
          </p>
          <h3 className="text-it-xl font-it-semibold">
            Carteira → Prioridade → Próximo passo → Cadência de sete dias
          </h3>
          </div>
          <ol className="practice-steps">
            <li>
              Separe cinco contatos para praticar. Use dados anonimizados ou
              nossos exemplos fictícios.
            </li>
            <li>
              Defina prioridade pelo contexto conhecido: prazo informado,
              pendência e compromisso combinado.
            </li>
            <li>
              Escreva a próxima ação, quem executa e quando. Se faltam
              informações, a ação pode ser perguntar.
            </li>
            <li>
              Monte uma agenda de sete dias com critérios para continuar, pausar
              ou encerrar o acompanhamento.
            </li>
          </ol>
          <p className="practice-note">
            O silêncio de um contato não revela sua intenção. Você vai trabalhar
            com o que sabe.
          </p>
        </section>
        <section className="audience-section space-y-it-6">
          <h2 className="text-it-3xl font-it-semibold">
            Uma prática para sua rotina
          </h2>
          <Tabs defaultValue="corretor">
            <TabsList>
              <TabsTrigger value="corretor">Corretor(a)</TabsTrigger>
              <TabsTrigger value="gestor">Gestor(a)</TabsTrigger>
              <TabsTrigger value="cliente">Cliente atual</TabsTrigger>
            </TabsList>
            <TabsContent value="corretor">
              <h3 className="text-it-xl font-it-semibold">
                Organize sua carteira e saiba quem acompanhar.
              </h3>
              <p className="max-w-3xl leading-it-loose">
                Para quem já recebe contatos e quer organizar retornos. Trabalhe
                cinco contatos, defina prioridades e monte mensagens e datas de
                acompanhamento.
              </p>
            </TabsContent>
            <TabsContent value="gestor">
              <h3 className="text-it-xl font-it-semibold">
                Dê a cada contato um responsável, uma ação e uma data.
              </h3>
              <p className="max-w-3xl leading-it-loose">
                Para quem precisa padronizar o acompanhamento na imobiliária.
                Monte uma regra de repasse entre responsáveis. A inscrição é
                individual e não inclui licenças para sua equipe.
              </p>
            </TabsContent>
            <TabsContent value="cliente">
              <h3 className="text-it-xl font-it-semibold">
                Aplique a rotina no acesso que você já possui.
              </h3>
              <p className="max-w-3xl leading-it-loose">
                Você pode praticar com seu acesso atual. O ingresso é distinto
                da assinatura; não precisa recomprar a Comunidade.
              </p>
            </TabsContent>
          </Tabs>
          <p className="max-w-3xl text-it-sm leading-it-loose text-it-text-muted">
            Se ainda não tem contatos, pode aprender com os exemplos. O foco é
            acompanhar uma carteira, e não ensinar captação do zero. A conclusão
            depende da participação na prática.
          </p>
        </section>
        <section className="materials-section grid gap-it-8 md:grid-cols-2">
          <div className="space-y-it-6">
            <h2 className="text-it-3xl font-it-semibold">O que você recebe</h2>
            <ul className="space-y-it-4 pl-it-5 list-disc leading-it-loose">
              <li>
                Dois encontros ao vivo de 240 minutos cada, com prática guiada
                e duas pausas de 10 minutos por noite (8 horas no total).
              </li>
              <li>Modelo editável de carteira e agenda de acompanhamento.</li>
              <li>Textos de mensagens para adaptar ao contexto do contato.</li>
              <li>Exercício de passagem entre IA e atendimento humano.</li>
              <li>Replay por 14 dias, até 11/11/2026 às 22h30 Brasília.</li>
            </ul>
          </div>
          <div className="space-y-it-5">
            <h3 className="text-it-2xl font-it-semibold">
              O material continua com você.
            </h3>
            <p className="leading-it-loose">
              Você mantém os modelos entregues após o fim do replay. Não é
              necessário comprar a Comunidade para terminar a atividade.
            </p>
            <p className="leading-it-loose">
              A oficina é conduzida por Natan Pimentel, da Imobiturbo. A prática
              usa o modelo editável e demonstrações da rotina de acompanhamento.
            </p>
            <Alert>
              <AlertTitle>A entrega é organização</AlertTitle>
              <AlertDescription>
                Não há promessa de venda de imóvel, comissão ou faturamento.
                Você pode participar usando exemplos fictícios, sem expor
                clientes.
              </AlertDescription>
            </Alert>
          </div>
        </section>
        <section id="programa" className="scroll-mt-it-8 space-y-it-6">
          <h2 className="text-it-3xl font-it-semibold">
            Dois encontros. Uma carteira para trabalhar.
          </h2>
          <div className="program-meetings">
            <article className="program-meeting">
              <p className="meeting-date">
                27 de outubro de 2026<br />18h30–22h30 Brasília
              </p>
              <h3>Encontro 1 — carteira e prioridade</h3>
              <ul className="mt-it-2 space-y-it-2 pl-it-5 list-disc leading-it-loose">
                <li>18h30–18h45 · Abertura, objetivos e preparação dos exemplos anonimizados.</li>
                <li>18h45–19h30 · Diagnóstico da carteira e atividade de organização de cinco contatos.</li>
                <li>19h30–19h40 · Primeiro intervalo (10 minutos).</li>
                <li>19h40–20h20 · Critérios de prioridade e prática de próxima ação, responsável e data.</li>
                <li>20h20–20h40 · Revisão dos exercícios e Q&amp;A.</li>
                <li>20h40–20h50 · Segundo intervalo (10 minutos).</li>
                <li>20h50–21h35 · Laboratório de mensagens: contexto, pergunta e compromisso de retorno.</li>
                <li>21h35–22h10 · Simulação de acompanhamento e passagem entre IA e atendimento humano.</li>
                <li>22h10–22h30 · Q&amp;A, revisão da carteira e tarefa: adaptar uma mensagem e registrar uma dificuldade.</li>
              </ul>
            </article>
            <article className="program-meeting">
              <p className="meeting-date">
                28 de outubro de 2026<br />18h30–22h30 Brasília
              </p>
              <h3>Encontro 2 — cadência e aplicação</h3>
              <ul className="mt-it-2 space-y-it-2 pl-it-5 list-disc leading-it-loose">
                <li>18h30–18h50 · Revisão da tarefa e Q&amp;A sobre as dificuldades encontradas.</li>
                <li>18h50–19h30 · Atividade: agenda de sete dias, mensagens e regras de pausa.</li>
                <li>19h30–19h40 · Primeiro intervalo (10 minutos).</li>
                <li>19h40–20h20 · Demonstração em CRM e prática de passagem IA → humano.</li>
                <li>20h20–20h40 · Revisão da cadência e Q&amp;A.</li>
                <li>20h40–20h50 · Segundo intervalo (10 minutos).</li>
                <li>20h50–21h10 · Preparação do plano individual de aplicação.</li>
                <li>21h10–21h30 · Apresentação opcional da Comunidade Imobiturbo: R$997 anuais, contratação separada (20 minutos).</li>
                <li>21h30–22h00 · Prática guiada: finalizar a agenda e simular o próximo acompanhamento.</li>
                <li>22h00–22h20 · Revisão dos planos e Q&amp;A de aplicação.</li>
                <li>22h20–22h30 · Checklist de execução, materiais e orientações de replay.</li>
              </ul>
            </article>
          </div>
          <p className="text-it-sm text-it-text-muted">
            Encontros online em dias consecutivos. Acesso e orientações serão
            enviados após a confirmação do pagamento.
          </p>
        </section>
        <Registration />
        <section className="space-y-it-6">
          <h2 className="text-it-3xl font-it-semibold">Perguntas frequentes</h2>
          <Accordion type="multiple">
            {faq.map(([q, a], i) => (
              <AccordionItem value={String(i)} key={q}>
                <AccordionTrigger>{q}</AccordionTrigger>
                <AccordionContent>
                  {a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
        <section id="condicoes" className="scroll-mt-it-8 space-y-it-6">
          <h2 className="text-it-3xl font-it-semibold">Condições da oficina</h2>
          <div className="max-w-3xl space-y-it-5 text-it-sm leading-it-loose">
            <p>
              Ingresso individual de R$47 para os encontros online de 27 e 28 de
              outubro de 2026, das 18h30 às 22h30, horário de Brasília. Inclui
              materiais editáveis e replay por 14 dias, até 11 de novembro de
              2026 às 22h30 Brasília. Cada noite tem 240 minutos, incluindo duas
              pausas de 10 minutos. As orientações de acesso às gravações serão
              informadas aos participantes.
            </p>
            <p>
              O pagamento é processado no checkout Asaas. Seu registro ou a
              visita à página de obrigado não comprovam pagamento. A confirmação
              depende da identificação pelo processador.
            </p>
            <p>
              Você pode solicitar reembolso em até sete dias corridos após a confirmação da compra pelo suporte@imobiturbo.com.br. Solicitação com identificação da compra, processada pela forma de pagamento utilizada; prazo bancário será informado no atendimento.
            </p>
            <p>
              As aulas serão gravadas para replay. Câmera é opcional e dúvidas
              por texto são permitidas. Use exemplos fictícios ou dados
              anonimizados; não compartilhe dados ou conversas de clientes. Sua
              participação não será tratada como autorização de uso em anúncios
              ou depoimentos.
            </p>
            <p>
              A oficina não inclui assinatura da Comunidade, licenças de equipe,
              consultoria ou implantação personalizada. A oferta opcional no
              segundo encontro, das 21h10 às 21h30, custa R$997 anuais e tem
              contratação e termos próprios. Após a apresentação, a prática e
              as dúvidas continuam até 22h30.
            </p>
            <p>
              Se houver reagendamento ou cancelamento pelo organizador, você
              será comunicado pelos canais da inscrição e poderá escolher uma
              nova data ou solicitar restituição integral. Nenhuma venda,
              comissão ou resultado financeiro é garantido.
            </p>
          </div>
        </section>
        <section className="space-y-it-6">
          <h2 className="max-w-3xl text-it-3xl font-it-semibold">
            Escolha cinco contatos. Defina o próximo passo. Coloque uma data.
          </h2>
          <p className="leading-it-loose">
            Faça isso com orientação nos dois encontros do WORKSHOP VGV 10X.
          </p>
          <p>27 e 28 de outubro · 18h30–22h30 Brasília · R$47</p>
          <Action />
        </section>
      </main>
      <Footer />
    </>
  );
}
