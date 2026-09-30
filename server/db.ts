import { and, desc, eq, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, activity, artifacts, comments, notifications, sources, users, workspaceInvites, workspaceMembers, workspaces } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

const insertId = (result: unknown) => Number((result as any)?.[0]?.insertId ?? 0);

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  (['name', 'email', 'loginMethod'] as const).forEach((field) => {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  });
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getWorkspaceForUser(ownerId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(workspaces).where(eq(workspaces.ownerId, ownerId)).limit(1);
  return result[0];
}

export async function createWorkspace(ownerId: number, name: string, displayName: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(workspaces).values({ ownerId, name, displayName });
  const id = insertId(result);
  await db.insert(workspaceMembers).values({ workspaceId: id, userId: ownerId, role: "owner" });
  return (await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1))[0];
}

export async function updateWorkspace(ownerId: number, values: { name?: string; displayName?: string }) {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(workspaces).set(values).where(eq(workspaces.ownerId, ownerId));
  return getWorkspaceForUser(ownerId);
}

export async function createSource(values: typeof sources.$inferInsert) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(sources).values(values);
  const id = insertId(result);
  return (await db.select().from(sources).where(eq(sources.id, id)).limit(1))[0];
}

export async function createArtifact(values: typeof artifacts.$inferInsert) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(artifacts).values(values);
  const id = insertId(result);
  return (await db.select().from(artifacts).where(eq(artifacts.id, id)).limit(1))[0];
}

export async function getArtifactComments(artifactId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(comments).where(eq(comments.artifactId, artifactId)).orderBy(desc(comments.createdAt));
}

export async function addComment(values: typeof comments.$inferInsert) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(comments).values(values);
  const id = insertId(result);
  return (await db.select().from(comments).where(eq(comments.id, id)).limit(1))[0];
}

export async function setArtifactApproved(artifactId: number, workspaceId: number, approved: number) {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(artifacts).set({ approved }).where(and(eq(artifacts.id, artifactId), eq(artifacts.workspaceId, workspaceId)));
  return (await db.select().from(artifacts).where(eq(artifacts.id, artifactId)).limit(1))[0];
}

export async function listWorkspaceMembers(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspaceId)).orderBy(desc(workspaceMembers.createdAt));
}

export async function addActivity(values: typeof activity.$inferInsert) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(activity).values(values);
  const id = insertId(result);
  return (await db.select().from(activity).where(eq(activity.id, id)).limit(1))[0];
}

export async function listActivity(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(activity).where(eq(activity.workspaceId, workspaceId)).orderBy(desc(activity.createdAt)).limit(30);
}

export async function addNotification(values: typeof notifications.$inferInsert) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(notifications).values(values);
  const id = insertId(result);
  return (await db.select().from(notifications).where(eq(notifications.id, id)).limit(1))[0];
}

export async function listNotifications(userId: number, workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.workspaceId, workspaceId))).orderBy(desc(notifications.createdAt)).limit(30);
}

export async function markNotificationRead(notificationId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(notifications).set({ read: 1 }).where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
  return true;
}

export async function updateMemberRole(workspaceId: number, userId: number, role: string) {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(workspaceMembers).set({ role }).where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)));
  return true;
}

export async function createWorkspaceInvite(values: typeof workspaceInvites.$inferInsert) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(workspaceInvites).values(values);
  const id = insertId(result);
  return (await db.select().from(workspaceInvites).where(eq(workspaceInvites.id, id)).limit(1))[0];
}

export async function listWorkspaceInvites(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workspaceInvites).where(eq(workspaceInvites.workspaceId, workspaceId)).orderBy(desc(workspaceInvites.createdAt));
}

export async function updateArtifactContent(artifactId: number, workspaceId: number, content: string) {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(artifacts).set({ content }).where(and(eq(artifacts.id, artifactId), eq(artifacts.workspaceId, workspaceId)));
  return (await db.select().from(artifacts).where(eq(artifacts.id, artifactId)).limit(1))[0];
}

export async function searchWorkspace(workspaceId: number, query: string) {
  const db = await getDb();
  if (!db) return { sources: [], artifacts: [], activity: [] };
  const pattern = `%${query}%`;
  const [sourceRows, artifactRows, activityRows] = await Promise.all([
    db.select().from(sources).where(and(eq(sources.workspaceId, workspaceId), or(like(sources.filename, pattern), like(sources.normalizedText, pattern)))).limit(20),
    db.select().from(artifacts).where(and(eq(artifacts.workspaceId, workspaceId), or(like(artifacts.title, pattern), like(artifacts.content, pattern)))).limit(20),
    db.select().from(activity).where(and(eq(activity.workspaceId, workspaceId), like(activity.message, pattern))).orderBy(desc(activity.createdAt)).limit(20),
  ]);
  return { sources: sourceRows, artifacts: artifactRows, activity: activityRows };
}
