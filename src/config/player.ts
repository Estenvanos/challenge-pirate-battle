// Jogador local (sem autenticação): o id é fixo; o nome é escolhido pelo jogador e salvo localmente.
export const LOCAL_PLAYER_ID = "local-player";

export const PLAYER_NAME_LIMITS = Object.freeze({ min: 2, max: 16 });

/** Remove espaços extras nas pontas e colapsa os internos. */
export function normalizePlayerName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}
