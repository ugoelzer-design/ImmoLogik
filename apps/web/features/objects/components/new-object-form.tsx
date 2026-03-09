"use client";

import { useState } from "react";
import type { CreateObjectInput } from "@/features/objects/services/objects.service";

type NewObjectFormProps = {
  onCreate: (input: CreateObjectInput) => Promise<void> | void;
};

export function NewObjectForm({ onCreate }: NewObjectFormProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || !address.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onCreate({
        name: name.trim(),
        address: address.trim(),
      });

      setName("");
      setAddress("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-900">Neues Objekt</h2>
        <p className="text-sm text-zinc-500">
          Schnelles Anlegen eines neuen Objekts im Frontend-Status.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">
            Objektname
          </label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="z. B. Rosenweg 8"
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-400"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">
            Adresse
          </label>
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Straße, Ort"
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-400"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Objekt wird angelegt..." : "Objekt anlegen"}
        </button>
      </form>
    </section>
  );
}
