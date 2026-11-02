const joinItems = (items) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} e ${items.at(-1)}` : items[0]);

export const logDate = (value) => new Date(value).toLocaleString('pt-BR');

export function logMessage({ createdAt, username, drawTitle, outcomeTitle, items }) {
  const received = items.length ? ` e recebeu ${joinItems(items)}` : '';
  return `${logDate(createdAt)}: O ${username} realizou o Sorteio de ${drawTitle}, e teve como resultado ${outcomeTitle}${received}.`;
}
