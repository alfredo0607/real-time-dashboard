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

async function poll(lookbackMs: number = env.cloudwatch.pollIntervalMs): Promise<void> {
  const queries = buildQueries();

  if (queries.length === 0) return;

  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - lookbackMs);

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

      // CloudWatch devuelve los puntos de más reciente a más antiguo; revertir
      // para emitirlos en orden cronológico y que el buffer del cliente quede bien.
      const points = result.Values.map((value, i) => ({
        value,
        timestamp: result.Timestamps?.[i]?.toISOString() ?? endTime.toISOString(),
      })).reverse();

      for (const point of points) {
        broadcast({
          type: "metric",
          name: result.Id as MetricName,
          value: point.value,
          timestamp: point.timestamp,
        });
      }
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

  void poll(60 * 60 * 1000); // fetch inicial: última hora para poblar las gráficas
  timer = setInterval(() => void poll(), interval);
  console.log(`✓ CloudWatch poller iniciado (cada ${interval / 1000}s)`);
}

export function stopCloudWatchPoller(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
