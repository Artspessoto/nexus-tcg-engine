import { describe, it, expect } from "vitest";
import { formatTemplate } from "./TranslationUtils";

describe("TranslationUtils - formatTemplate", () => {
  it("should replace placeholders with corresponding string and number params", () => {
    const template = "Turno {turnCount} iniciado por {actor}";
    const params = { turnCount: 1, actor: "Jogador" };

    const result = formatTemplate(template, params);

    expect(result).toBe("Turno 1 iniciado por Jogador");
  });

  it("should replace multiple occurrences of the same key", () => {
    const template = "{val} + {val} = 2";
    const result = formatTemplate(template, { val: 1 });

    expect(result).toBe("1 + 1 = 2");
  });

  it("should keep the original placeholder when key is missing in params (covers line 7 branch)", () => {
    const template = "Dano causado: {damage}, alvo: {targetName}";
    // targetName não é fornecido propositalmente
    const params = { damage: 50 };

    const result = formatTemplate(template, params);

    // {targetName} deve ser mantido intacto
    expect(result).toBe("Dano causado: 50, alvo: {targetName}");
  });

  it("should correctly handle params with value 0", () => {
    const template = "Pontos restantes: {points}";
    const result = formatTemplate(template, { points: 0 });

    expect(result).toBe("Pontos restantes: 0");
  });

  it("should return original text if no template tags exist", () => {
    const template = "Texto simples sem chaves.";
    const result = formatTemplate(template, { any: "value" });

    expect(result).toBe("Texto simples sem chaves.");
  });
});
