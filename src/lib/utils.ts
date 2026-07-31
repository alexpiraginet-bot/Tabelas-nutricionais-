import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Junta classes condicionais e resolve conflitos do Tailwind (a última vence).
 *  É o utilitário que todo componente shadcn/21st.dev espera encontrar em
 *  "@/lib/utils" — sem ele, os componentes colados não compilam. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
