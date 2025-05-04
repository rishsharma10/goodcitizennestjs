import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { config } from 'dotenv';
config()
const PORT = process.env.PORT || 3001; 

async function bootstrap() {
  const app = await NestFactory.create(AppModule,{
    logger: ['debug', 'error', 'log', 'verbose', 'warn']
  });
  app.enableVersioning({ type: VersioningType.URI }); // URL versioning e.g., /v1/auth
  app.enableCors();
  app.use(express.json());
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, skipMissingProperties: true  }));
  const config = new DocumentBuilder()
    .setTitle('Goodcitizen App')
    .setDescription('Goodcitizen App API description')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', name: 'authorization', in: 'header' }, 'authorization')
    .addServer(`http://localhost:3001/`, "local server")
    .addServer(`https://goodcitizennestjs-1.onrender.com/`, "live server")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  await app.listen(PORT);
  console.log(`Server running at port ${PORT}....`);
}


bootstrap();
