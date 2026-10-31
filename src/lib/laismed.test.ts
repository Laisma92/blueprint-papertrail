import { describe, it, expect } from "vitest";
import { cpfValido, validarPaciente, podeEmitirAso, podeRegistrarAtendimento } from "./laismed";

const base = { nome: "Ana Souza", cpf: "529.982.247-25", nascimento: "1990-01-01", email: "ana@x.com", empresa: "", telefone: "" };

describe("regras LAISMED", () => {
  it("valida CPF", () => {
    expect(cpfValido("529.982.247-25")).toBe(true);
    expect(cpfValido("111.111.111-11")).toBe(false);
    expect(cpfValido("529.982.247-26")).toBe(false);
  });
  it("exige campos obrigatórios", () => {
    const e = validarPaciente({ ...base, nome: "", email: "x", nascimento: "" });
    expect(Object.keys(e).sort()).toEqual(["email", "nascimento", "nome"]);
  });
  it("bloqueia CPF duplicado", () => {
    expect(validarPaciente(base, [{ ...base, id: "1" }]).cpf).toBeDefined();
  });
  it("apenas médico emite ASO", () => {
    expect(podeEmitirAso("medico")).toBe(true);
    expect(podeEmitirAso("enfermagem")).toBe(false);
    expect(podeEmitirAso("recepcao")).toBe(false);
  });
  it("recepção não registra atendimento", () => {
    expect(podeRegistrarAtendimento("recepcao")).toBe(false);
  });
});
