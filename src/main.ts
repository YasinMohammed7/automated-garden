import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Automated Garden API')
    .setDescription('REST API for automated garden management')
    .setVersion('1.0')
    .addTag('gardens')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`App running on: http://localhost:${port}/api`);
  logger.log(`Documentation found on: http://localhost:${port}/docs`);
}
await bootstrap();
