"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, fieldControlClass } from "@/components/site/field";
import { GOALS, waUrl } from "@/lib/site";

export function LeadForm() {
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const name = String(data.get("name") ?? "").trim();
        const goal = String(data.get("goal") ?? "").trim();
        const notes = String(data.get("notes") ?? "").trim();
        const lines = [
          `Halo FortyFit, saya ${name}.`,
          `Tujuan: ${goal}.`,
        ];
        if (notes) lines.push(notes);
        window.location.href = waUrl(lines.join(" "));
      }}
    >
      <Field label="Nama">
        <Input name="name" required placeholder="Nama lengkap" />
      </Field>
      <Field label="Tujuan">
        <select name="goal" className={fieldControlClass} defaultValue={GOALS[0]}>
          {GOALS.map((goal) => (
            <option key={goal}>{goal}</option>
          ))}
        </select>
      </Field>
      <Field label="Cerita singkat">
        <Textarea
          name="notes"
          placeholder="Pernah gym? Ada cedera? Jam yang nyaman?"
        />
      </Field>
      <Button type="submit">Lanjut ke WhatsApp</Button>
    </form>
  );
}
