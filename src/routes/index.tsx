import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  type Aso, type Atendimento, type Paciente, type Perfil,
  formatarCpf, podeEmitirAso, podeRegistrarAtendimento, sementePacientes, validarPaciente,
} from "@/lib/laismed";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LAISMED — Painel de Saúde Ocupacional" },
      { name: "description", content: "Cadastre pacientes, registre atendimentos e exames e emita ASO com controle de acesso." },
      { property: "og:title", content: "LAISMED — Painel de Saúde Ocupacional" },
      { property: "og:description", content: "Cadastro de pacientes, atendimentos, exames e emissão de ASO." },
    ],
  }),
  component: App,
});

type Aba = "pacientes" | "novo" | "ficha";
const EXAMES = ["Exame clínico", "Audiometria", "Acuidade visual", "Espirometria", "Hemograma", "Raio-X de tórax"];
const PERFIS: Record<Perfil, string> = { recepcao: "Recepção", enfermagem: "Enfermagem", medico: "Médico do trabalho" };

function usePersist<T>(key: string, inicial: T) {
  const [v, setV] = useState<T>(inicial);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const s = localStorage.getItem(key);
    if (s) setV(JSON.parse(s));
    setOk(true);
  }, [key]);
  useEffect(() => { if (ok) localStorage.setItem(key, JSON.stringify(v)); }, [key, v, ok]);
  return [v, setV] as const;
}

const fmtData = (d: string) => (d ? d.split("-").reverse().join("/") : "—");
const hoje = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 9);

function App() {
  const [pacientes, setPacientes] = usePersist<Paciente[]>("lm-pacientes", sementePacientes);
  const [atends, setAtends] = usePersist<Atendimento[]>("lm-atend", []);
  const [asos, setAsos] = usePersist<Aso[]>("lm-aso", []);
  const [perfil, setPerfil] = usePersist<Perfil>("lm-perfil", "medico");
  const [contraste, setContraste] = usePersist("lm-contraste", false);
  const [fonte, setFonte] = usePersist("lm-fonte", 100);
  const [aba, setAba] = useState<Aba>("pacientes");
  const [selId, setSelId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    document.documentElement.classList.toggle("alto-contraste", contraste);
    document.documentElement.style.fontSize = `${fonte}%`;
  }, [contraste, fonte]);

  const sel = pacientes.find((p) => p.id === selId) ?? null;
  const lista = useMemo(
    () => pacientes.filter((p) => (p.nome + p.cpf + p.empresa).toLowerCase().includes(busca.toLowerCase())),
    [pacientes, busca],
  );
  const avisar = (m: string) => { setAviso(m); setTimeout(() => setAviso(""), 4000); };

  return (
    <div className="min-h-screen font-sans md:grid md:grid-cols-[260px_1fr]">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:m-2 focus:rounded focus:bg-accent focus:p-2 focus:text-accent-foreground">Pular para o conteúdo</a>
      <aside className="flex flex-col gap-6 bg-sidebar p-6 text-sidebar-foreground">
        <div>
          <p className="font-display text-2xl font-bold tracking-tight">LAIS<span className="text-sidebar-primary">MED</span></p>
          <p className="text-sm opacity-80">Saúde ocupacional</p>
        </div>
        <nav aria-label="Principal" className="flex flex-col gap-1">
          {([["pacientes", "Pacientes"], ["novo", "Novo paciente"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setAba(k)} aria-current={aba === k ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-left font-medium transition ${aba === k ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent"}`}>
              {l}
            </button>
          ))}
        </nav>
        <label className="flex flex-col gap-1 text-sm">
          Perfil de acesso
          <select value={perfil} onChange={(e) => setPerfil(e.target.value as Perfil)}
            className="rounded-lg border border-sidebar-border bg-sidebar-accent px-2 py-2 text-sidebar-accent-foreground">
            {Object.entries(PERFIS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        <fieldset className="mt-auto flex flex-col gap-2 rounded-lg border border-sidebar-border p-3 text-sm">
          <legend className="px-1 font-semibold">Acessibilidade</legend>
          <div className="flex items-center gap-2">
            <span>Texto</span>
            <button aria-label="Diminuir texto" onClick={() => setFonte(Math.max(87, fonte - 12))} className="rounded bg-sidebar-accent px-2 font-bold">A−</button>
            <button aria-label="Aumentar texto" onClick={() => setFonte(Math.min(150, fonte + 12))} className="rounded bg-sidebar-accent px-2 font-bold">A+</button>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={contraste} onChange={(e) => setContraste(e.target.checked)} /> Alto contraste
          </label>
        </fieldset>
      </aside>

      <main id="conteudo" className="p-6 md:p-10">
        <div role="status" aria-live="polite" className="min-h-0">
          {aviso && <p className="mb-4 rounded-lg bg-secondary px-4 py-3 font-medium text-secondary-foreground">{aviso}</p>}
        </div>

        {aba === "pacientes" && (
          <section aria-labelledby="t-pac">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 id="t-pac" className="font-display text-3xl font-semibold">Pacientes</h1>
                <p className="text-muted-foreground">{pacientes.length} cadastrados · {asos.length} ASOs emitidos</p>
              </div>
              <label className="flex flex-col text-sm">
                Buscar
                <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, CPF ou empresa"
                  className="w-72 rounded-lg border border-input bg-card px-3 py-2" />
              </label>
            </div>
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full text-left">
                <caption className="sr-only">Lista de pacientes</caption>
                <thead className="bg-muted text-sm text-muted-foreground">
                  <tr><th className="p-3">Nome</th><th className="p-3">CPF</th><th className="p-3">Nascimento</th><th className="p-3">Empresa</th><th className="p-3">Último ASO</th><th className="p-3"><span className="sr-only">Ações</span></th></tr>
                </thead>
                <tbody>
                  {lista.map((p) => {
                    const ultimo = asos.filter((a) => a.pacienteId === p.id).at(-1);
                    return (
                      <tr key={p.id} className="border-t">
                        <td className="p-3 font-medium">{p.nome}</td>
                        <td className="p-3 tabular-nums">{p.cpf}</td>
                        <td className="p-3">{fmtData(p.nascimento)}</td>
                        <td className="p-3">{p.empresa || "—"}</td>
                        <td className="p-3">{ultimo ? <Resultado r={ultimo.resultado} /> : <span className="text-muted-foreground">Pendente</span>}</td>
                        <td className="p-3 text-right"><Button size="sm" variant="outline" onClick={() => { setSelId(p.id); setAba("ficha"); }}>Abrir ficha</Button></td>
                      </tr>
                    );
                  })}
                  {!lista.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum paciente encontrado.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {aba === "novo" && (
          <FormPaciente existentes={pacientes} onSalvar={(p) => {
            setPacientes([...pacientes, p]); setAba("pacientes"); avisar(`Paciente ${p.nome} cadastrado com sucesso.`);
          }} />
        )}

        {aba === "ficha" && sel && (
          <Ficha paciente={sel} perfil={perfil}
            atendimentos={atends.filter((a) => a.pacienteId === sel.id)}
            asos={asos.filter((a) => a.pacienteId === sel.id)}
            onVoltar={() => setAba("pacientes")}
            onAtendimento={(a) => { setAtends([...atends, a]); avisar("Atendimento registrado."); }}
            onAso={(a) => { setAsos([...asos, a]); avisar("ASO emitido."); }} />
        )}
      </main>
    </div>
  );
}

function Resultado({ r }: { r: Aso["resultado"] }) {
  const cls = r === "Apto" ? "bg-success text-primary-foreground" : r === "Inapto" ? "bg-destructive text-destructive-foreground" : "bg-accent text-accent-foreground";
  return <span className={`rounded-full px-2.5 py-0.5 text-sm font-medium ${cls}`}>{r}</span>;
}

function Campo({ id, label, erro, ...props }: { id: string; label: string; erro?: string | undefined } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <input id={id} aria-invalid={!!erro} aria-describedby={erro ? `${id}-erro` : undefined}
        className={`rounded-lg border bg-card px-3 py-2 ${erro ? "border-destructive" : "border-input"}`} {...props} />
      {erro && <p id={`${id}-erro`} className="text-sm text-destructive">{erro}</p>}
    </div>
  );
}

function FormPaciente({ existentes, onSalvar }: { existentes: Paciente[]; onSalvar: (p: Paciente) => void }) {
  const [f, setF] = useState({ nome: "", cpf: "", nascimento: "", email: "", empresa: "", telefone: "" });
  const [erros, setErros] = useState<Partial<Record<string, string>>>({});
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: k === "cpf" ? formatarCpf(e.target.value) : e.target.value });
  return (
    <section aria-labelledby="t-novo" className="max-w-2xl">
      <h1 id="t-novo" className="mb-1 font-display text-3xl font-semibold">Novo paciente</h1>
      <p className="mb-6 text-muted-foreground">Campos com * são obrigatórios.</p>
      <form noValidate className="grid gap-4 rounded-xl border bg-card p-6 sm:grid-cols-2" onSubmit={(e) => {
        e.preventDefault();
        const er = validarPaciente(f, existentes) as Partial<Record<string, string>>;
        setErros(er);
        if (!Object.keys(er).length) onSalvar({ ...f, id: uid() });
      }}>
        <div className="sm:col-span-2"><Campo id="nome" label="Nome completo *" value={f.nome} onChange={set("nome")} erro={erros["nome"]} /></div>
        <Campo id="cpf" label="CPF *" inputMode="numeric" placeholder="000.000.000-00" value={f.cpf} onChange={set("cpf")} erro={erros["cpf"]} />
        <Campo id="nasc" label="Data de nascimento *" type="date" value={f.nascimento} onChange={set("nascimento")} erro={erros["nascimento"]} />
        <Campo id="email" label="E-mail *" type="email" value={f.email} onChange={set("email")} erro={erros["email"]} />
        <Campo id="tel" label="Telefone" value={f.telefone} onChange={set("telefone")} />
        <div className="sm:col-span-2"><Campo id="emp" label="Empresa" value={f.empresa} onChange={set("empresa")} /></div>
        <div className="sm:col-span-2"><Button type="submit" size="lg">Cadastrar paciente</Button></div>
      </form>
    </section>
  );
}

function Ficha({ paciente: p, perfil, atendimentos, asos, onVoltar, onAtendimento, onAso }: {
  paciente: Paciente; perfil: Perfil; atendimentos: Atendimento[]; asos: Aso[];
  onVoltar: () => void; onAtendimento: (a: Atendimento) => void; onAso: (a: Aso) => void;
}) {
  const [tipo, setTipo] = useState("Admissional");
  const [exames, setExames] = useState<string[]>([]);
  const [obs, setObs] = useState("");
  const [res, setRes] = useState<Aso["resultado"]>("Apto");
  const [medico, setMedico] = useState("");
  const [crm, setCrm] = useState("");
  const [erroAso, setErroAso] = useState("");
  const examesFeitos = [...new Set(atendimentos.flatMap((a) => a.exames))];

  return (
    <section aria-labelledby="t-ficha" className="space-y-6">
      <Button variant="ghost" onClick={onVoltar}>← Voltar para pacientes</Button>
      <div className="rounded-xl border bg-card p-6">
        <h1 id="t-ficha" className="font-display text-3xl font-semibold">{p.nome}</h1>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          {[["CPF", p.cpf], ["Nascimento", fmtData(p.nascimento)], ["E-mail", p.email], ["Telefone", p.telefone || "—"], ["Empresa", p.empresa || "—"], ["Exames realizados", examesFeitos.join(", ") || "Nenhum"]].map(([k, v]) => (
            <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
          ))}
        </dl>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6">
          <h2 className="mb-4 font-display text-xl font-semibold">Novo atendimento</h2>
          {podeRegistrarAtendimento(perfil) ? (
            <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault();
              onAtendimento({ id: uid(), pacienteId: p.id, data: hoje(), tipo, exames, observacoes: obs });
              setExames([]); setObs("");
            }}>
              <label className="flex flex-col gap-1 text-sm font-medium">Tipo de exame ocupacional
                <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded-lg border border-input bg-card px-3 py-2 font-normal">
                  {["Admissional", "Periódico", "Retorno ao trabalho", "Mudança de função", "Demissional"].map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <fieldset><legend className="mb-2 text-sm font-medium">Exames solicitados</legend>
                <div className="grid grid-cols-2 gap-2">
                  {EXAMES.map((x) => (
                    <label key={x} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={exames.includes(x)} onChange={(e) => setExames(e.target.checked ? [...exames, x] : exames.filter((y) => y !== x))} />{x}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="flex flex-col gap-1 text-sm font-medium">Observações
                <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={3} className="rounded-lg border border-input bg-card px-3 py-2 font-normal" />
              </label>
              <Button type="submit">Registrar atendimento</Button>
            </form>
          ) : <p className="text-muted-foreground">O perfil {PERFIS[perfil]} não pode registrar atendimentos clínicos.</p>}
        </div>

        <div className="rounded-xl border bg-card p-6">
          <h2 className="mb-4 font-display text-xl font-semibold">Emitir ASO</h2>
          {podeEmitirAso(perfil) ? (
            <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault();
              if (!atendimentos.length) return setErroAso("Registre ao menos um atendimento antes de emitir o ASO.");
              if (medico.trim().length < 3 || !/^\d{4,7}/.test(crm)) return setErroAso("Informe o nome do médico e um CRM válido (somente números).");
              setErroAso("");
              onAso({ id: uid(), pacienteId: p.id, data: hoje(), tipo: atendimentos.at(-1)!.tipo, resultado: res, medico, crm });
            }}>
              <fieldset><legend className="mb-2 text-sm font-medium">Resultado</legend>
                <div className="flex flex-wrap gap-4">
                  {(["Apto", "Apto com restrições", "Inapto"] as const).map((r) => (
                    <label key={r} className="flex items-center gap-2 text-sm"><input type="radio" name="res" checked={res === r} onChange={() => setRes(r)} />{r}</label>
                  ))}
                </div>
              </fieldset>
              <Campo id="med" label="Médico do trabalho" value={medico} onChange={(e) => setMedico(e.target.value)} />
              <Campo id="crm" label="CRM" inputMode="numeric" value={crm} onChange={(e) => setCrm(e.target.value)} />
              {erroAso && <p role="alert" className="text-sm text-destructive">{erroAso}</p>}
              <Button type="submit">Emitir ASO</Button>
            </form>
          ) : <p className="text-muted-foreground">Apenas o médico do trabalho pode emitir o ASO. Troque o perfil de acesso no menu.</p>}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 font-display text-xl font-semibold">Histórico</h2>
        {!atendimentos.length && !asos.length && <p className="text-muted-foreground">Nenhum registro ainda.</p>}
        <ul className="space-y-3">
          {atendimentos.map((a) => (
            <li key={a.id} className="rounded-lg bg-muted p-3 text-sm">
              <strong>{fmtData(a.data)} · Atendimento {a.tipo}</strong> — {a.exames.join(", ") || "sem exames"}{a.observacoes && ` · ${a.observacoes}`}
            </li>
          ))}
          {asos.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
              <span><strong>{fmtData(a.data)} · ASO {a.tipo}</strong> — Dr(a). {a.medico}, CRM {a.crm}</span>
              <span className="flex items-center gap-2"><Resultado r={a.resultado} /><Button size="sm" variant="outline" onClick={() => window.print()}>Imprimir</Button></span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
