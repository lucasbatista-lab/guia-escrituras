"use client";

import { useState } from "react";
import { AmemSplash } from "@/components/brand/amem-splash";

/** Mounts splash once per cold session for web/PWA shell. */
export function AmemSplashHost() {
  const [show, setShow] = useState(true);
  if (!show) return null;
  return <AmemSplash onDone={() => setShow(false)} />;
}
