import {
  DynamoDBStreamsClient,
  DescribeStreamCommand,
  GetShardIteratorCommand,
  GetRecordsCommand,
  type Shard,
} from "@aws-sdk/client-dynamodb-streams";
import { DynamoDBClient, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import type { AttributeValue } from "@aws-sdk/client-dynamodb";
import { env } from "../config/env";
import { broadcast } from "../websocket/broadcaster";

const awsConfig = {
  region: env.aws.region,
  ...(env.aws.accessKeyId && env.aws.secretAccessKey
    ? {
        credentials: {
          accessKeyId: env.aws.accessKeyId,
          secretAccessKey: env.aws.secretAccessKey,
        },
      }
    : {}),
};

const streamsClient = new DynamoDBStreamsClient(awsConfig);
const dynamoClient = new DynamoDBClient(awsConfig);

async function getStreamArn(tableName: string): Promise<string | undefined> {
  const { Table } = await dynamoClient.send(
    new DescribeTableCommand({ TableName: tableName }),
  );
  return Table?.LatestStreamArn;
}

async function getShards(streamArn: string): Promise<Shard[]> {
  const { StreamDescription } = await streamsClient.send(
    new DescribeStreamCommand({ StreamArn: streamArn }),
  );
  return StreamDescription?.Shards ?? [];
}

const shardIterators = new Map<string, string>();

async function initShards(streamArn: string): Promise<void> {
  const shards = await getShards(streamArn);

  for (const shard of shards) {
    if (!shard.ShardId || shardIterators.has(shard.ShardId)) continue;

    const { ShardIterator } = await streamsClient.send(
      new GetShardIteratorCommand({
        StreamArn: streamArn,
        ShardId: shard.ShardId,
        ShardIteratorType: "LATEST",
      }),
    );

    if (ShardIterator) {
      shardIterators.set(shard.ShardId, ShardIterator);
    }
  }
}

async function pollRecords(): Promise<void> {
  const tableName = env.streams.tableName;

  for (const [shardId, iterator] of [...shardIterators]) {
    try {
      const { Records, NextShardIterator } = await streamsClient.send(
        new GetRecordsCommand({ ShardIterator: iterator, Limit: 100 }),
      );

      if (NextShardIterator) {
        shardIterators.set(shardId, NextShardIterator);
      } else {
        shardIterators.delete(shardId);
      }

      for (const record of Records ?? []) {
        if (!record.dynamodb || !record.eventName) continue;

        const raw = record.dynamodb;

        const keys = raw.Keys
          ? unmarshall(raw.Keys as Record<string, AttributeValue>)
          : {};
        const newImage = raw.NewImage
          ? unmarshall(raw.NewImage as Record<string, AttributeValue>)
          : undefined;
        const oldImage = raw.OldImage
          ? unmarshall(raw.OldImage as Record<string, AttributeValue>)
          : undefined;

        broadcast({
          type: "stream-event",
          eventName: record.eventName as "INSERT" | "MODIFY" | "REMOVE",
          tableName,
          keys,
          newImage,
          oldImage,
          timestamp:
            raw.ApproximateCreationDateTime?.toISOString() ??
            new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(`Streams shard ${shardId} error:`, err);
      shardIterators.delete(shardId);
    }
  }
}

let streamArn: string | undefined;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let reinitTimer: ReturnType<typeof setInterval> | null = null;

export async function startDynamoStreamsListener(): Promise<void> {
  if (!env.streams.tableName) {
    console.log(
      "⚠ DYNAMODB_STREAM_TABLE no configurado — streams listener inactivo",
    );
    return;
  }

  try {
    streamArn = await getStreamArn(env.streams.tableName);

    if (!streamArn) {
      console.warn(
        `⚠ DynamoDB Streams no está habilitado en la tabla "${env.streams.tableName}"`,
      );
      return;
    }

    await initShards(streamArn);

    pollTimer = setInterval(
      () => void pollRecords(),
      env.streams.pollIntervalMs,
    );

    // Re-detecta nuevos shards cada 60s (por shard splits/merges)
    reinitTimer = setInterval(async () => {
      if (streamArn) await initShards(streamArn);
    }, 60_000);

    console.log(
      `✓ DynamoDB Streams listener iniciado en "${env.streams.tableName}" (cada ${env.streams.pollIntervalMs}ms)`,
    );
  } catch (err) {
    console.error("DynamoDB Streams init error:", err);
  }
}

export function stopDynamoStreamsListener(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (reinitTimer) {
    clearInterval(reinitTimer);
    reinitTimer = null;
  }
}
