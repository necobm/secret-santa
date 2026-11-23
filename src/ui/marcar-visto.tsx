"use client";

import { useEffect } from "react";

/**
 * Marca como Visto cuando la Asignación se muestra de verdad en un navegador.
 * Se hace en el cliente para que ni el precargado de Next ni las vistas previas de
 * enlaces (WhatsApp, etc.) cuenten como Visto.
 */
export function MarcarVisto({ accion }: { accion: () => Promise<void> }) {
  useEffect(() => {
    void accion();
  }, [accion]);
  return null;
}
