"use client";

import { Button } from "@/components/ui/button";
import { sendAdminSessionNoticeAction } from "@/lib/actions";

export function SendAdminSessionNoticeButton({
  customerId,
  size = "default",
  label = "Kirim sisa sesi ke admin",
}: {
  customerId: string;
  size?: "default" | "sm";
  label?: string;
}) {
  return (
    <form action={sendAdminSessionNoticeAction}>
      <input type="hidden" name="customerId" value={customerId} />
      <Button type="submit" variant="outline" size={size}>
        {label}
      </Button>
    </form>
  );
}
