import { copyFile, mkdir } from "node:fs/promises";
const app = new URL("../", import.meta.url);
await mkdir(new URL("obrigado/", app), { recursive: true });
await copyFile(
  new URL("../../oficina/index.html", app),
  new URL("index.html", app),
);
await copyFile(
  new URL("../../oficina-obrigado/index.html", app),
  new URL("obrigado/index.html", app),
);
