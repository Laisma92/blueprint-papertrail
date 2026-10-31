export type Perfil = "recepcao" | "enfermagem" | "medico";

export interface Paciente {
  id: string;
  nome: string;
  cpf: string;
  nascimento: string;
  email: string;
  empresa: string;
  telefone: string;
}

export interface Atendimento {
  id: string;
  pacienteId: string;
  data: string;
  tipo: string;
  exames: string[];
  observacoes: string;
}

export interface Aso {
  id: string;
  pacienteId: string;
  data: string;
  tipo: string;
  resultado: "Apto" | "Inapto" | "Apto com restrições";
  medico: string;
  crm: string;
}

export function limparCpf(cpf: string) {
  return cpf.replace(/\D/g, "");
}

export function formatarCpf(v: string) {
  const d = limparCpf(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function cpfValido(cpf: string) {
  const d = limparCpf(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (len: number) => {
    let s = 0;
    for (let i = 0; i < len; i++) s += Number(d[i]) * (len + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

export function validarPaciente(p: Omit<Paciente, "id">, existentes: Paciente[] = []) {
  const erros: Partial<Record<keyof Paciente, string>> = {};
  if (p.nome.trim().length < 3) erros.nome = "Informe o nome completo (mínimo 3 letras).";
  if (!cpfValido(p.cpf)) erros.cpf = "CPF inválido. Confira os 11 números.";
  else if (existentes.some((e) => limparCpf(e.cpf) === limparCpf(p.cpf)))
    erros.cpf = "Já existe um paciente com este CPF.";
  if (!p.nascimento) erros.nascimento = "Informe a data de nascimento.";
  else if (new Date(p.nascimento) > new Date()) erros.nascimento = "A data não pode estar no futuro.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) erros.email = "Informe um e-mail válido, ex.: nome@empresa.com.";
  return erros;
}

/** Somente o médico do trabalho pode emitir ASO. */
export function podeEmitirAso(perfil: Perfil) {
  return perfil === "medico";
}

/** Recepção não registra atendimentos clínicos. */
export function podeRegistrarAtendimento(perfil: Perfil) {
  return perfil === "enfermagem" || perfil === "medico";
}

export const sementePacientes: Paciente[] = [
  { id: "1", nome: "João Silva", cpf: "123.456.789-09", nascimento: "1990-03-15", email: "joao.silva@abc.com.br", empresa: "Construtora ABC Ltda", telefone: "(41) 99876-4321" },
  { id: "2", nome: "Maria Oliveira", cpf: "987.654.321-00", nascimento: "1985-07-22", email: "maria.oliveira@email.com", empresa: "Metalúrgica Sul", telefone: "(41) 98765-1234" },
  { id: "3", nome: "Carlos Pereira", cpf: "529.982.247-25", nascimento: "1978-11-02", email: "carlos.p@email.com", empresa: "Transportes Paraná", telefone: "(41) 99123-5566" },
];
