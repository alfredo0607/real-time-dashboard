import {
  CloudWatchClient,
  GetMetricDataCommand,
  type MetricDataQuery,
} from "@aws-sdk/client-cloudwatch";
import { env } from "../config/env";
import { broadcast, type MetricName } from "../websocket/broadcaster";

const client = new CloudWatchClient({
  region: env.aws.region,
  ...(env.aws.accessKeyId && env.aws.secretAccessKey
    ? {
        credentials: {
          accessKeyId: env.aws.accessKeyId,
          secretAccessKey: env.aws.secretAccessKey,
        },
      }
    : {}),
});

function buildQueries(): MetricDataQuery[] {
  const queries: MetricDataQuery[] = [];

  const instanceId = env.cloudwatch.ec2InstanceId;

  if (!instanceId) return queries;

  const ec2Dimension = [{ Name: "InstanceId", Value: instanceId }];

  queries.push(
    {
      Id: "cpu",
      MetricStat: {
        Metric: {
          Namespace: "AWS/EC2",
          MetricName: "CPUUtilization",
          Dimensions: ec2Dimension,
        },
        Period: 60,
        Stat: "Average",
      },
    },
    {
      Id: "networkIn",
      MetricStat: {
        Metric: {
          Namespace: "AWS/EC2",
          MetricName: "NetworkIn",
          Dimensions: ec2Dimension,
        },
        Period: 60,
        Stat: "Average",
      },
    },
    {
      Id: "networkOut",
      MetricStat: {
        Metric: {
          Namespace: "AWS/EC2",
          MetricName: "NetworkOut",
          Dimensions: ec2Dimension,
        },
        Period: 60,
        Stat: "Average",
      },
    },
    {
      Id: "diskRead",
      MetricStat: {
        Metric: {
          Namespace: "AWS/EC2",
          MetricName: "EBSReadBytes",
          Dimensions: ec2Dimension,
        },
        Period: 60,
        Stat: "Average",
      },
    },
    {
      Id: "diskWrite",
      MetricStat: {
        Metric: {
          Namespace: "AWS/EC2",
          MetricName: "EBSWriteBytes",
          Dimensions: ec2Dimension,
        },
        Period: 60,
        Stat: "Average",
      },
    },
    {
      // Requires CloudWatch Agent installed on the instance
      Id: "memory",
      MetricStat: {
        Metric: {
          Namespace: "CWAgent",
          MetricName: "mem_used_percent",
          Dimensions: ec2Dimension,
        },
        Period: 60,
        Stat: "Average",
      },
    },
  );

  return queries;
}

async function poll(): Promise<void> {
  const queries = buildQueries();

  if (queries.length === 0) return;

  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - env.cloudwatch.pollIntervalMs);

  try {
    const { MetricDataResults } = await client.send(
      new GetMetricDataCommand({
        StartTime: startTime,
        EndTime: endTime,
        MetricDataQueries: queries,
      }),
    );

    for (const result of MetricDataResults ?? []) {
      if (!result.Id || !result.Values?.length) continue;

      console.log(result);

      broadcast({
        type: "metric",
        name: result.Id as MetricName,
        value: result.Values[0],
        timestamp:
          result.Timestamps?.[0]?.toISOString() ?? endTime.toISOString(),
      });
    }
  } catch (err) {
    console.error("CloudWatch poll error:", err);
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startCloudWatchPoller(): void {
  if (timer) return;

  const interval = env.cloudwatch.pollIntervalMs;
  if (!env.cloudwatch.ec2InstanceId) {
    console.log(
      "⚠ CloudWatch: CW_EC2_INSTANCE_ID no configurado — poller inactivo",
    );
    return;
  }

  void poll();
  timer = setInterval(() => void poll(), interval);
  console.log(`✓ CloudWatch poller iniciado (cada ${interval / 1000}s)`);
}

export function stopCloudWatchPoller(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
