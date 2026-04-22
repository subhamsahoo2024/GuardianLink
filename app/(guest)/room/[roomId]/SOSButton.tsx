"use client";

import React from "react";
import { Siren } from "lucide-react";
import Button from "@/app/_components/ui/Button";

interface SOSButtonProps {
  onTrigger?: () => void;
  disabled?: boolean;
}

export default function SOSButton({
  onTrigger,
  disabled = false,
}: SOSButtonProps) {
  return (
    <Button
      variant="danger"
      size="xl"
      pulse
      disabled={disabled}
      icon={<Siren size={18} />}
      aria-label="Trigger emergency SOS"
      onClick={onTrigger}
      className="w-full sm:w-auto min-w-[220px]"
    >
      Trigger SOS
    </Button>
  );
}
