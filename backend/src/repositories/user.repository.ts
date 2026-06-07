import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { docClient } from "../config/database";
import { env } from "../config/env";
import type { User } from "../models/user.model";
import type { UserRole } from "../types";

const TABLE = env.dynamodb.tableName;

export async function findByEmail(email: string): Promise<User | null> {
  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "EmailIndex",
      KeyConditionExpression: "email = :email",
      ExpressionAttributeValues: { ":email": email },
      Limit: 1,
    }),
  );
  return (Items?.[0] as User) ?? null;
}

export async function findById(id: string): Promise<User | null> {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } }),
  );
  return (Item as User) ?? null;
}

export async function findAll(): Promise<Omit<User, "password_hash">[]> {
  const { Items } = await docClient.send(
    new ScanCommand({
      TableName: TABLE,
      ProjectionExpression:
        "id, #n, email, roles, is_active, created_at, updated_at",
      ExpressionAttributeNames: { "#n": "name" },
    }),
  );
  return ((Items ?? []) as Omit<User, "password_hash">[]).sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export async function create(data: {
  name: string;
  email: string;
  passwordHash: string;
  role?: UserRole;
}): Promise<User> {
  const now = new Date().toISOString();
  const role: UserRole = data.role ?? "user";

  const user: User = {
    id: uuidv4(),
    name: data.name,
    email: data.email,
    password_hash: data.passwordHash,
    roles: [role],
    is_active: true,
    created_at: new Date(now),
    updated_at: new Date(now),
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: { ...user, created_at: now, updated_at: now },
      ConditionExpression: "attribute_not_exists(id)",
    }),
  );

  return user;
}

export async function update(
  id: string,
  data: Partial<Pick<User, "name" | "email" | "is_active"> & { role: UserRole }>,
): Promise<User | null> {
  const expressions: string[] = ["updated_at = :updated_at"];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {
    ":updated_at": new Date().toISOString(),
  };

  if (data.name !== undefined) {
    expressions.push("#name = :name");
    names["#name"] = "name";
    values[":name"] = data.name;
  }
  if (data.email !== undefined) {
    expressions.push("email = :email");
    values[":email"] = data.email;
  }
  if (data.is_active !== undefined) {
    expressions.push("is_active = :is_active");
    values[":is_active"] = data.is_active;
  }
  if (data.role !== undefined) {
    expressions.push("roles = :roles");
    values[":roles"] = [data.role];
  }

  try {
    const { Attributes } = await docClient.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { id },
        UpdateExpression: `SET ${expressions.join(", ")}`,
        ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
        ExpressionAttributeValues: values,
        ConditionExpression: "attribute_exists(id)",
        ReturnValues: "ALL_NEW",
      }),
    );
    return (Attributes as User) ?? null;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.name === "ConditionalCheckFailedException"
    ) {
      return null;
    }
    throw err;
  }
}

export async function remove(id: string): Promise<boolean> {
  try {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE,
        Key: { id },
        ConditionExpression: "attribute_exists(id)",
      }),
    );
    return true;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.name === "ConditionalCheckFailedException"
    ) {
      return false;
    }
    throw err;
  }
}
