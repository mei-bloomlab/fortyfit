"use client";

import { Button } from "@/components/ui/button";
import { sendCustomerReminderAction } from "@/lib/actions";

export function SendCustomerReminderButton({
  customerId,
  size = "default",
  label = "Kirim reminder ke customer",
}: {
  customerId: string;
  size?: "default" | "sm";
  label?: string;
}) {
  return (
    <form action={sendCustomerReminderAction}>
      <input type="hidden" name="customerId" value={customerId} />
      <Button type="submit" variant="outline" size={size}>
        {label}
      </Button>
    </form>
  );
}
