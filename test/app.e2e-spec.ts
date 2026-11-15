import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.setGlobalPrefix('api');

    const config = new DocumentBuilder()
      .setTitle('Automated Garden API')
      .setDescription('REST API for automated garden management')
      .setVersion('1.0')
      .addTag('gardens')
      .build();

    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, documentFactory);

    await app.init();
  });

  it('/api (GET)', () => {
    return request(app.getHttpServer()).get('/api').expect(200).expect('Hello World!');
  });

  it('/ (GET) is not exposed without the API prefix', () => {
    return request(app.getHttpServer()).get('/').expect(404);
  });

  it('/docs/ (GET) serves Swagger UI', () => {
    return request(app.getHttpServer())
      .get('/docs/')
      .expect(200)
      .expect('Content-Type', /html/)
      .expect(/swagger-ui/);
  });

  it('/docs-json (GET) exposes the API metadata and prefixed routes', async () => {
    const response = await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200)
      .expect('Content-Type', /json/);

    const document = response.body as OpenAPIObject;

    expect(document.info).toMatchObject({
      title: 'Automated Garden API',
      description: 'REST API for automated garden management',
      version: '1.0',
    });

    expect(document.paths['/api']?.get).toBeDefined();
    expect(document.paths['/']).toBeUndefined();
  });

  afterEach(async () => {
    await app?.close();
  });
});
