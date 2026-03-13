"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const COOLDOWN_SECONDS = 60;

interface ResendEmailButtonProps {
  onResend: () => Promise<void>;
  labels: {
    resend: string;
    resendCooldown: string;
  };
  disabled?: boolean;
}

export function ResendEmailButton({
  onResend,
  labels,
  disabled = false,
}: ResendEmailButtonProps) {
  const [cooldown, setCooldown] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleClick() {
    if (cooldown > 0 || isLoading) return;
    setIsLoading(true);
    try {
      await onResend();
      setCooldown(COOLDOWN_SECONDS);
    } finally {
      setIsLoading(false);
    }
  }

  const isDisabled = disabled || cooldown > 0 || isLoading;
  const buttonText =
    cooldown > 0
      ? labels.resendCooldown.replace("{seconds}", String(cooldown))
      : labels.resend;

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={isDisabled}
      className="gap-2"
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {buttonText}
    </Button>
  );
}
