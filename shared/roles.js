export const ROLES = {
  admin: 'Admin',
  moderator: 'Moderador',
  game_master: 'Game Master',
  player: 'Jogador',
};

export const isStaff = (user) => user?.role === 'admin' || user?.role === 'moderator';

// Moderador cuida so de Jogadores. Quem da ou tira credenciais especiais e sempre o Admin.
export const canManageUser = (actor, target) => {
  if (actor?.role === 'admin') return true;
  return actor?.role === 'moderator' && target.role === 'player';
};
