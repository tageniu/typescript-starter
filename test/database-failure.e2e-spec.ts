import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

describe('Database failure handling (e2e)', () => {
  let app: INestApplication<App>;
  let databasePath: string;
  let tempDirectory: string;

  beforeEach(async () => {
    tempDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'event-mgmt-db-failure-'),
    );
    databasePath = path.join(tempDirectory, 'event-mgmt.sqlite');
    process.env.DB_PATH = databasePath;

    const appModule = (await import(
      '../src/app.module'
    )) as typeof import('../src/app.module');
    const moduleFixture = await Test.createTestingModule({
      imports: [appModule.AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    delete process.env.DB_PATH;
    fs.rmSync(tempDirectory, { force: true, recursive: true });
  });

  it('returns 503 when the sqlite file disappears during runtime', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'Alice' })
      .expect(201);

    fs.unlinkSync(databasePath);

    await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'Bob' })
      .expect(503)
      .expect({
        error: 'Service Unavailable',
        message: 'Database temporarily unavailable',
        path: '/users',
        statusCode: 503,
      });
  });
});
