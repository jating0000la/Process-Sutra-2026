import type { Response } from "express";

type Client = {
  id: string;
  userId: string;
  email: string;
  organizationId: string;
  res: Response;
  heartbeat?: ReturnType<typeof setInterval>;
};

const clients = new Map<string, Client>(); // key by id

export function addClient(client: Client) {
  clients.set(client.id, client);
}

export function removeClient(id: string) {
  const client = clients.get(id);
  if (client?.heartbeat) clearInterval(client.heartbeat as any);
  clients.delete(id);
}

function sendRaw(res: Response, event: string, data: any) {
  const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
  res.write(payload);
}

export function sendToEmail(email: string, event: string, data: any) {
  clients.forEach((c) => {
    if (c.email?.toLowerCase() === email?.toLowerCase()) {
      sendRaw(c.res, event, data);
    }
  });
}

export function sendToOrganization(organizationId: string, event: string, data: any) {
  clients.forEach((c) => {
    if (c.organizationId === organizationId) {
      sendRaw(c.res, event, data);
    }
  });
}

export function sendBroadcast(event: string, data: any) {
  clients.forEach((c) => sendRaw(c.res, event, data));
}
