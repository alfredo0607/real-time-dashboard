import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  ResourceNotFoundException,
} from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { env } from "./env";

const clientConfig: ConstructorParameters<typeof DynamoDBClient>[0] = {
  region: env.aws.region,
};

if (env.aws.accessKeyId && env.aws.secretAccessKey) {
  clientConfig.credentials = {
    accessKeyId: env.aws.accessKeyId,
    secretAccessKey: env.aws.secretAccessKey,
  };
}

const rawClient = new DynamoDBClient(clientConfig);

export const docClient = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: { removeUndefinedValues: true },
});

export async function connectDatabase(): Promise<void> {
  const tableName = env.dynamodb.tableName;

  try {
    await rawClient.send(new DescribeTableCommand({ TableName: tableName }));
    console.log(`✓ DynamoDB table "${tableName}" ready`);
  } catch (err) {
    if (err instanceof ResourceNotFoundException) {
      await rawClient.send(
        new CreateTableCommand({
          TableName: tableName,
          KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
          AttributeDefinitions: [
            { AttributeName: "id", AttributeType: "S" },
            { AttributeName: "email", AttributeType: "S" },
          ],
          GlobalSecondaryIndexes: [
            {
              IndexName: "EmailIndex",
              KeySchema: [{ AttributeName: "email", KeyType: "HASH" }],
              Projection: { ProjectionType: "ALL" },
            },
          ],
          BillingMode: "PAY_PER_REQUEST",
        }),
      );
      console.log(`✓ DynamoDB table "${tableName}" created`);
    } else {
      throw err;
    }
  }
}
