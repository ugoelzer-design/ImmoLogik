import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BankkontoModule } from "./BankkontoModule";

describe("BankkontoModule", () => {
  it("shows transaction metrics and rows", () => {
    render(<BankkontoModule />);

    expect(screen.getByText("Eingänge").nextElementSibling).toHaveTextContent("1.675,00 €");
    expect(screen.getByText("Ausgänge").nextElementSibling).toHaveTextContent("184,42 €");
    expect(screen.getByText("Saldo").nextElementSibling).toHaveTextContent("1.490,58 €");
    expect(screen.getAllByText("Offen")[0]?.nextElementSibling).toHaveTextContent("2");
    expect(screen.getByText("Anna Becker")).toBeInTheDocument();
    expect(screen.getByText("Stadtwerke")).toBeInTheDocument();
  });

  it("filters transactions by search text and status", () => {
    render(<BankkontoModule />);

    fireEvent.change(screen.getByLabelText("Kontobewegungen suchen"), {
      target: { value: "Stadtwerke" },
    });

    expect(screen.queryByText("Anna Becker")).not.toBeInTheDocument();
    expect(screen.getByText("Stadtwerke")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Zuordnungsstatus filtern"), {
      target: { value: "Offen" },
    });

    expect(screen.getByText("Keine Kontobewegungen passen zur Suche.")).toBeInTheDocument();
  });
});
