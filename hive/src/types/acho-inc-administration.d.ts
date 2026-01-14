declare module '@acho-inc/administration' {
  import { Pool } from 'pg';
  import { Strategy } from 'passport-jwt';

  export interface MySQLPoolConfig {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
    ssl?: {
      ca?: string | Buffer;
      key?: string | Buffer;
      cert?: string | Buffer;
    } | null;
  }

  export interface UserDbServiceConfig {
    /** MySQL connection pool (for production) */
    mysqlPool?: any;
    /** PostgreSQL connection pool (for local development) */
    pgPool?: Pool;
    /** Database type: 'mysql' or 'postgres' */
    dbType?: 'mysql' | 'postgres';
    /** Redis client for caching (optional) */
    redisClient?: any;
    /** Table name mapping */
    tables: {
      USER: string;
      DEVELOPERS?: string;
    };
    /** Service account salt lookup function (optional) */
    findServiceAccountSalt?: (token: string) => Promise<string | null>;
  }

  export interface DevTokenObject {
    id: number;
    user_id: number;
    team_id: number;
    token: string;
    label: string;
    system?: boolean;
    create_time: number;
  }

  export interface LoginResult {
    token: string;
    email: string;
    firstname?: string;
    lastname?: string;
    name?: string;
    current_team_id?: number;
    created_at?: Date | number;
  }

  export interface TokenResult {
    token: string;
    salt: string;
  }

  export interface LoginOptions {
    jwtSecret: string;
    expiresIn?: string;
  }

  export interface RegisterOptions extends LoginOptions {
    defaultTeamId?: number;
  }

  export interface UserData {
    email: string;
    password: string;
    name?: string;
    firstname?: string;
    lastname?: string;
  }

  export interface RegisterResult {
    id: number;
    token: string;
    email: string;
    name?: string;
    firstname?: string;
    lastname?: string;
    current_team_id?: number;
    created_at?: Date;
  }

  export interface UserDbService {
    findSaltByToken: (token: string) => Promise<string | null>;
    findById: (id: number) => Promise<any>;
    findByToken: (token: string) => Promise<any>;
    findByEmail: (email: string) => Promise<any>;
    getLatestUserDevToken: (user: { id: number; current_team_id: number }) => Promise<DevTokenObject | null>;
    // Auth methods
    verifyPassword: (password: string, hash: string) => Promise<boolean>;
    hashPassword: (password: string) => Promise<string>;
    generateToken: (user: any, options: LoginOptions) => Promise<TokenResult>;
    updateUserToken: (userId: number, token: string, salt: string) => Promise<void>;
    login: (email: string, password: string, options: LoginOptions) => Promise<LoginResult>;
    register: (userData: UserData, options: RegisterOptions) => Promise<RegisterResult>;
    dbType?: 'mysql' | 'postgres';
  }

  export interface PassportStrategyConfig {
    findSaltByToken: (token: string) => Promise<string | null>;
    jwtSecret?: string;
  }

  export const auth: {
    createPassportStrategy: (config: PassportStrategyConfig) => Strategy;
    verifyToken: (token: string, secret: string) => Promise<any>;
  };

  export const database: {
    createMySQLPool: (config: MySQLPoolConfig) => any;
    createPGPool: (connectionString: string) => Pool;
  };

  export const models: {
    createUserDbService: (config: UserDbServiceConfig) => UserDbService;
  };
}
