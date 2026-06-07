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

  if (env.cloudwatch.ec2InstanceId) {
    queries.push({
      Id: "cpu",
      MetricStat: {
        Metric: {
          Namespace: "AWS/EC2",
          MetricName: "CPUUtilization",
          Dimensions: [
            { Name: "InstanceId", Value: env.cloudwatch.ec2InstanceId },
          ],
        },
        Period: 60,
        Stat: "Average",
      },
    });
  }

  if (env.cloudwatch.albDimension) {
    queries.push(
      {
        Id: "requests",
        MetricStat: {
          Metric: {
            Namespace: "AWS/ApplicationELB",
            MetricName: "RequestCount",
            Dimensions: [
              { Name: "LoadBalancer", Value: env.cloudwatch.albDimension },
            ],
          },
          Period: 60,
          Stat: "Sum",
        },
      },
      {
        Id: "latency",
        MetricStat: {
          Metric: {
            Namespace: "AWS/ApplicationELB",
            MetricName: "TargetResponseTime",
            Dimensions: [
              { Name: "LoadBalancer", Value: env.cloudwatch.albDimension },
            ],
          },
          Period: 60,
          Stat: "p95",
        },
      },
      {
        Id: "errors",
        MetricStat: {
          Metric: {
            Namespace: "AWS/ApplicationELB",
            MetricName: "HTTPCode_ELB_5XX_Count",
            Dimensions: [
              { Name: "LoadBalancer", Value: env.cloudwatch.albDimension },
            ],
          },
          Period: 60,
          Stat: "Sum",
        },
      },
    );
  }

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
  const hasConfig = env.cloudwatch.ec2InstanceId || env.cloudwatch.albDimension;

  if (!hasConfig) {
    console.log(
      "⚠ CloudWatch: CW_EC2_INSTANCE_ID o CW_ALB_DIMENSION no configurados — poller inactivo",
    );
    return;
  }

  void poll();
  timer = setInterval(() => void poll(), interval);
  console.log(
    `✓ CloudWatch poller iniciado (cada ${interval / 1000}s)`,
  );
}

export function stopCloudWatchPoller(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
