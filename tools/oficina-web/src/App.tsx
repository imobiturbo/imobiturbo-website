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
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Registration } from "./Registration";
const faq = [
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
    "O replay está previsto por 14 dias após o segundo encontro. A disponibilização e o encerramento das gravações serão informados aos participantes. Você mantém os modelos entregues para continuar praticando.",
  ],
  [
    "Vou sair com uma venda?",
    "A entrega é a organização de cinco contatos e uma cadência de acompanhamento. A conclusão depende de participar da prática. Não há promessa de venda de imóvel, comissão ou faturamento.",
  ],
  [
    "Haverá oferta?",
    "Sim. Ao final do segundo encontro, haverá apresentação opcional da Comunidade Imobiturbo, contratada separadamente. O ingresso não inclui assinatura, consultoria ou implantação personalizada.",
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
      className="h-auto min-h-11 whitespace-normal py-3"
    >
      <a href="#inscricao">{children}</a>
    </Button>
  );
}
function Footer() {
  return (
    <footer className="mx-auto max-w-6xl space-y-4 px-5 py-8 text-sm">
      <Separator />
      <p>Imobiturbo · Oficina: do lead ao próximo passo</p>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Button asChild variant="link" className="h-auto p-0">
          <a href="mailto:suporte@imobiturbo.com.br">
            suporte@imobiturbo.com.br
          </a>
        </Button>
        <Button asChild variant="link" className="h-auto p-0">
          <a href="/politica-de-privacidade/">Privacidade</a>
        </Button>
        <Button asChild variant="link" className="h-auto p-0">
          <a href={window.location.pathname.includes("/obrigado") ? "/oficina/#condicoes" : "#condicoes"}>Condições da oficina</a>
        </Button>
      </div>
    </footer>
  );
}
function Thanks() {
  return (
    <>
      <main className="mx-auto max-w-2xl space-y-8 px-5 py-16">
        <Button asChild variant="link" className="h-auto p-0">
          <a href="/oficina/">Imobiturbo · Oficina</a>
        </Button>
        <h1 className="text-3xl font-semibold sm:text-4xl">
          Acompanhe sua inscrição
        </h1>
        <Alert>
          <AlertTitle>A confirmação depende do processador</AlertTitle>
          <AlertDescription>
            Esta página não comprova pagamento. A inscrição será confirmada após
            a identificação do pagamento pelo Asaas.
          </AlertDescription>
        </Alert>
        <div className="space-y-5 text-base leading-7">
          <p>
            Confira a confirmação no checkout ou na comunicação do processador.
            Se o pagamento ainda estiver pendente, acompanhe as instruções
            exibidas lá.
          </p>
          <p>
            Os encontros serão em{" "}
            <strong>
              9 e 10 de outubro de 2026, das 19h30 às 21h30, horário de Brasília
            </strong>
            , online. As orientações de acesso serão enviadas pelo canal
            informado na inscrição após a confirmação do pagamento.
          </p>
          <p>
            Se já pagou e não recebeu a confirmação, fale com o suporte. Não
            refaça o pagamento sem conferir a situação da compra.
          </p>
          <p>
            O ingresso da oficina não inclui nem ativa acesso à Comunidade
            Imobiturbo.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
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
      <header id="top" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5">
        <Button
          asChild
          variant="link"
          className="h-auto p-0 text-base font-semibold"
        >
          <a href="#top">Imobiturbo</a>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="ghost">
            <a href="#programa">Programa</a>
          </Button>
          <Button asChild variant="outline">
            <a href="#inscricao">Participar</a>
          </Button>
        </div>
      </header>
      <Separator />
      <main className="mx-auto max-w-6xl space-y-16 px-5 py-10 md:py-16">
        <section className="grid items-start gap-10 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-6">
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
              Oficina Imobiturbo: do lead ao próximo passo
            </h1>
            <p className="max-w-2xl text-xl leading-8">
              Uma carteira fica mais útil quando cada contato tem um próximo
              passo com data.
            </p>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              Em dois encontros ao vivo, organize cinco contatos, defina quem
              priorizar e monte uma cadência de acompanhamento para os próximos
              sete dias. Você pode começar em uma planilha.
            </p>
            <div className="space-y-2">
              <p className="font-medium">9 e 10 de outubro de 2026 · online</p>
              <p>19h30–21h30 · horário de Brasília</p>
              <p>
                Ingresso individual: <strong>R$47</strong>
              </p>
            </div>
            <Action />
            <p className="text-sm text-muted-foreground">
              Dois encontros de 120 minutos e materiais editáveis. Replay
              previsto por 14 dias após o segundo encontro.
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">
                Do contato solto à próxima ação
              </CardTitle>
              <CardDescription>
                Exemplo fictício da prática. Não representa uma venda ou
                resultado de cliente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Badge variant="secondary">Antes</Badge>
                <p className="text-sm leading-6">
                  Um contato pediu opções. O prazo ainda não foi informado e o
                  retorno ficou sem data.
                </p>
              </div>
              <Separator />
              <div className="space-y-2">
                <Badge variant="outline">Depois</Badge>
                <Table>
                  <TableBody>
                    {[
                      ["Contexto", "Pediu opções; prazo desconhecido"],
                      ["Próxima ação", "Perguntar sobre o prazo"],
                      ["Responsável", "Corretor do exemplo"],
                      ["Data", "Próximo dia de acompanhamento"],
                    ].map(([a, b]) => (
                      <TableRow key={a}>
                        <TableCell className="whitespace-normal font-medium">
                          {a}
                        </TableCell>
                        <TableCell className="whitespace-normal">{b}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-sm text-muted-foreground">
                Organizar o que sabe e registrar o que precisa descobrir.
              </p>
            </CardContent>
          </Card>
        </section>
        <section className="space-y-6">
          <h2 className="text-3xl font-semibold">Quem merece atenção hoje?</h2>
          <p className="max-w-3xl text-base leading-7">
            Você abre as conversas, encontra um contato que pediu informações e
            precisa lembrar onde parou. Qual mensagem respeita o contexto? Quem
            ficou responsável por retornar? Na oficina, você transforma essas
            perguntas em registros que pode consultar.
          </p>
          <h3 className="text-xl font-semibold">
            Carteira → Prioridade → Próximo passo → Cadência de sete dias
          </h3>
          <ol className="grid gap-6 pl-5 md:grid-cols-2 list-decimal text-base leading-7">
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
          <p className="max-w-3xl text-muted-foreground">
            O silêncio de um contato não revela sua intenção. Você vai trabalhar
            com o que sabe.
          </p>
        </section>
        <section className="space-y-6">
          <h2 className="text-3xl font-semibold">
            Uma prática para sua rotina
          </h2>
          <Tabs defaultValue="corretor">
            <TabsList className="h-auto flex-wrap">
              <TabsTrigger value="corretor">Corretor(a)</TabsTrigger>
              <TabsTrigger value="gestor">Gestor(a)</TabsTrigger>
              <TabsTrigger value="cliente">Cliente atual</TabsTrigger>
            </TabsList>
            <TabsContent value="corretor" className="space-y-4 pt-4">
              <h3 className="text-xl font-semibold">
                Organize sua carteira e saiba quem acompanhar.
              </h3>
              <p className="max-w-3xl leading-7">
                Para quem já recebe contatos e quer organizar retornos. Trabalhe
                cinco contatos, defina prioridades e monte mensagens e datas de
                acompanhamento.
              </p>
            </TabsContent>
            <TabsContent value="gestor" className="space-y-4 pt-4">
              <h3 className="text-xl font-semibold">
                Dê a cada contato um responsável, uma ação e uma data.
              </h3>
              <p className="max-w-3xl leading-7">
                Para quem precisa padronizar o acompanhamento na imobiliária.
                Monte uma regra de repasse entre responsáveis. A inscrição é
                individual e não inclui licenças para sua equipe.
              </p>
            </TabsContent>
            <TabsContent value="cliente" className="space-y-4 pt-4">
              <h3 className="text-xl font-semibold">
                Aplique a rotina no acesso que você já possui.
              </h3>
              <p className="max-w-3xl leading-7">
                Você pode praticar com seu acesso atual. O ingresso é distinto
                da assinatura; não precisa recomprar a Comunidade.
              </p>
            </TabsContent>
          </Tabs>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Se ainda não tem contatos, pode aprender com os exemplos. O foco é
            acompanhar uma carteira, e não ensinar captação do zero. A conclusão
            depende da participação na prática.
          </p>
        </section>
        <section className="grid gap-8 md:grid-cols-2">
          <div className="space-y-6">
            <h2 className="text-3xl font-semibold">O que você recebe</h2>
            <ul className="space-y-4 pl-5 list-disc leading-7">
              <li>
                Dois encontros ao vivo de 120 minutos, com prática guiada.
              </li>
              <li>Modelo editável de carteira e agenda de acompanhamento.</li>
              <li>Textos de mensagens para adaptar ao contexto do contato.</li>
              <li>Exercício de passagem entre IA e atendimento humano.</li>
              <li>Replay previsto por 14 dias após o segundo encontro.</li>
            </ul>
          </div>
          <div className="space-y-5">
            <h3 className="text-2xl font-semibold">
              O material continua com você.
            </h3>
            <p className="leading-7">
              Você mantém os modelos entregues após o fim do replay. Não é
              necessário comprar a Comunidade para terminar a atividade.
            </p>
            <p className="leading-7">
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
        <section id="programa" className="scroll-mt-8 space-y-6">
          <h2 className="text-3xl font-semibold">
            Dois encontros. Uma carteira para trabalhar.
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-36">Quando</TableHead>
                <TableHead className="min-w-56">Prática</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="whitespace-normal align-top">
                  9 de outubro de 2026
                  <br />
                  19h30–21h30 Brasília
                </TableCell>
                <TableCell className="whitespace-normal">
                  <strong>Encontro 1 — carteira e prioridade</strong>
                  <p className="mt-2 leading-7">
                    Diagnóstico do acompanhamento; cinco contatos organizados;
                    escolha da próxima ação; prática e revisão. Tarefa para o
                    dia seguinte: adaptar uma mensagem e anotar uma dificuldade.
                  </p>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="whitespace-normal align-top">
                  10 de outubro de 2026
                  <br />
                  19h30–21h30 Brasília
                </TableCell>
                <TableCell className="whitespace-normal">
                  <strong>Encontro 2 — cadência e aplicação</strong>
                  <p className="mt-2 leading-7">
                    Revisão da tarefa; agenda de sete dias; mensagens e regras
                    de pausa; demonstração da rotina em CRM e passagem IA →
                    humano. Ao final, apresentação opcional da Comunidade,
                    contratada separadamente.
                  </p>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p className="text-sm text-muted-foreground">
            Encontros online em dias consecutivos. Acesso e orientações serão
            enviados após a confirmação do pagamento.
          </p>
        </section>
        <Registration />
        <section className="space-y-6">
          <h2 className="text-3xl font-semibold">Perguntas frequentes</h2>
          <Accordion type="multiple">
            {faq.map(([q, a], i) => (
              <AccordionItem value={String(i)} key={q}>
                <AccordionTrigger className="text-base">{q}</AccordionTrigger>
                <AccordionContent className="max-w-3xl text-base leading-7">
                  {a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
        <section id="condicoes" className="scroll-mt-8 space-y-6">
          <h2 className="text-3xl font-semibold">Condições da oficina</h2>
          <div className="max-w-3xl space-y-5 text-sm leading-7">
            <p>
              Ingresso individual de R$47 para os encontros online de 9 e 10 de
              outubro de 2026, das 19h30 às 21h30, horário de Brasília. Inclui
              materiais editáveis e replay previsto por 14 dias após o segundo
              encontro. A disponibilização e o horário de encerramento do replay
              serão informados aos participantes.
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
              consultoria ou implantação personalizada. A oferta opcional ao
              final do segundo encontro tem contratação e termos próprios.
            </p>
            <p>
              Se houver reagendamento ou cancelamento pelo organizador, você
              será comunicado pelos canais da inscrição e poderá escolher uma
              nova data ou solicitar restituição integral. Nenhuma venda,
              comissão ou resultado financeiro é garantido.
            </p>
          </div>
        </section>
        <section className="space-y-6">
          <h2 className="max-w-3xl text-3xl font-semibold">
            Escolha cinco contatos. Defina o próximo passo. Coloque uma data.
          </h2>
          <p className="leading-7">
            Faça isso com orientação nos dois encontros da Oficina Imobiturbo.
          </p>
          <p>9 e 10 de outubro · 19h30–21h30 Brasília · R$47</p>
          <Action />
        </section>
      </main>
      <Footer />
    </>
  );
}
