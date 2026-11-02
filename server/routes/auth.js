import { Router } from 'express';

// Rotas reservadas: a tabela app_user ja existe, falta implementar quando o login for necessario.
export const authRouter = Router();

authRouter.use((_req, res) => {
  res.status(501).json({ error: 'Login ainda não implementado' });
});
