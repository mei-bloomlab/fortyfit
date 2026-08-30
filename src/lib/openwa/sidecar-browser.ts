export const DEFAULT_SIDECAR_URL = "http://127.0.0.1:43201";

export function browserSidecarUrl(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string {
  return (env.OPENWA_URL ?? DEFAULT_SIDECAR_URL).replace(/\/$/, "");
}

export function sidecarHealthUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/health`;
}

export function sidecarQrSrc(baseUrl: string, nonce: number | string): string {
  return `${baseUrl.replace(/\/$/, "")}/qr?t=${nonce}`;
}
