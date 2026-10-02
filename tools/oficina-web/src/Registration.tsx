import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { trackEvent } from "@/lib/tracking";
import {
  loadConfig,
  registerLead,
  trackingFrom,
  type OficinaConfig,
} from "@/lib/registration";
export function Registration() {
  const [config, setConfig] = useState<OficinaConfig | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    profile: "",
    consent: false,
  });
  async function refresh() {
    setChecking(true);
    setError("");
    try {
      setConfig(await loadConfig());
    } catch (e) {
      setConfig(null);
      setError((e as Error).message);
    } finally {
      setChecking(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !config) return;
    setBusy(true);
    setError("");
    try {
      const url = await registerLead(
        {
          ...form,
          tracking: trackingFrom(window.location.search),
        },
        fetch,
        () => trackEvent("Lead", { profile: form.profile }),
      );
      trackEvent("InitiateCheckout", { profile: form.profile });
      window.location.assign(url);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <section id="inscricao" className="registration-composition">
      <div className="registration-intro space-y-it-6">
        <h2 className="text-it-3xl font-it-semibold">Quero participar do WORKSHOP VGV 10X</h2>
        <p className="registration-offer">
          Ingresso individual: R$47. Dois encontros, materiais editáveis e
          replay previsto por 14 dias.
        </p>
      </div>
      <Card>
      <CardContent>
        <p className="text-it-sm leading-it-loose">
          Registre seus dados para seguir ao checkout da oficina. O pagamento
          será feito no Asaas; os meios disponíveis aparecem lá.
        </p>
        <form
          onSubmit={submit}
          className="space-y-it-5"
          aria-busy={busy || checking}
        >
          <div className="grid gap-it-5 sm:grid-cols-2">
            {[
              ["name", "Nome", "text", "name"],
              ["email", "E-mail", "email", "email"],
              ["phone", "Telefone com DDD", "tel", "tel"],
            ].map(([key, label, type, autocomplete]) => (
              <div key={key} className="space-y-it-2">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  name={key}
                  type={type}
                  autoComplete={autocomplete}
                  required
                  maxLength={key === "name" ? 120 : 254}
                  value={form[key as "name" | "email" | "phone"]}
                  disabled={busy}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
            <div className="space-y-it-2">
              <Label htmlFor="profile">Seu perfil</Label>
              <Select
                required
                value={form.profile}
                onValueChange={(profile) => setForm({ ...form, profile })}
                disabled={busy}
              >
                <SelectTrigger id="profile">
                  <SelectValue placeholder="Selecione seu perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corretor">Corretor(a)</SelectItem>
                  <SelectItem value="gestor">
                    Gestor(a) / imobiliária
                  </SelectItem>
                  <SelectItem value="cliente_atual">
                    Cliente Imobiturbo
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-start gap-it-3">
            <Checkbox
              required
              id="consent"
              checked={form.consent}
              disabled={busy}
              onCheckedChange={(checked) =>
                setForm({ ...form, consent: checked === true })
              }
            />
            <div className="space-y-it-1 text-it-sm leading-it-loose">
              <Label htmlFor="consent">
                Li as condições da oficina e a política de privacidade e
                concordo com o uso dos meus dados para inscrição e comunicações
                relacionadas ao evento.
              </Label>
              <div className="flex flex-wrap gap-x-it-4">
                <Button asChild variant="link">
                  <a href="#condicoes">Ler condições</a>
                </Button>
                <Button asChild variant="link">
                  <a
                    href="/politica-de-privacidade/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Política de privacidade
                  </a>
                </Button>
              </div>
            </div>
          </div>
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertTitle>Precisamos concluir este passo</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-wrap gap-it-3">
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={busy || checking || !config || !form.consent}
            >
              {busy
                ? "Registrando…"
                : checking
                  ? "Verificando inscrições…"
                  : config
                    ? "Registrar e continuar para o pagamento"
                    : "Inscrições em preparação"}
            </Button>
            {!config && !checking && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void refresh()}
              >
                Tentar novamente
              </Button>
            )}
            <Button asChild variant="outline">
              <a href="mailto:suporte@imobiturbo.com.br?subject=Oficina%20Imobiturbo">
                Falar com o suporte
              </a>
            </Button>
          </div>
          <p className="text-it-sm text-it-text-muted">
            O registro não confirma pagamento. A oficina é uma contratação
            separada da Comunidade e não libera acesso à assinatura.
          </p>
        </form>
      </CardContent>
      </Card>
    </section>
  );
}
