import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

const messageImports = {
  de: () => import("../messages/de.json"),
  en: () => import("../messages/en.json"),
} as const;

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as "de" | "en")) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: (await messageImports[locale as "de" | "en"]()).default,
    timeZone: "Europe/Vienna",
    now: new Date(),
  };
});
