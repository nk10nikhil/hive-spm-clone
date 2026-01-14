import config from "../../config";
import { MongoClient } from "mongodb";

declare const _ACHO_MG_DB: undefined | { db: (name: string) => unknown };

let client: MongoClient | null = null;

const getMongoClient = async (): Promise<MongoClient> => {
  if (client) return client;
  if (!config.mongodb.url) {
    throw new Error("Missing MONGODB_URL in environment");
  }
  client = new MongoClient(config.mongodb.url);
  await client.connect();
  return client;
};

const getMongoDb = async (dbName = config.mongodb.dbName): Promise<unknown> => {
  if (typeof _ACHO_MG_DB !== "undefined" && _ACHO_MG_DB && typeof _ACHO_MG_DB.db === "function") {
    return _ACHO_MG_DB.db(dbName);
  }
  const c = await getMongoClient();
  return c.db(dbName);
};

export { getMongoDb };
