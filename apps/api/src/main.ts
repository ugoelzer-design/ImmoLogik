import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import {
  API_DEFAULT_PORT,
  API_DOCS_PATH,
  API_GLOBAL_PREFIX,
  DEFAULT_AUTH_MODE,
  DEFAULT_NODE_ENV,
  ENTRA_REQUIRED_ENV_VARS,
  SWAGGER_CONFIG,
  WEB_ALLOWED_ORIGINS,
} from './config/app.constants';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const authMode = process.env.AUTH_MODE ?? DEFAULT_AUTH_MODE;
  const nodeEnv = process.env.NODE_ENV ?? DEFAULT_NODE_ENV;

  // ─── Sicherheitsprüfung: Dev-Auth in Produktion verhindern ──────────────────
  if (nodeEnv === 'production' && authMode === 'dev') {
    logger.error(
      'SICHERHEITSFEHLER: AUTH_MODE=dev ist in der Produktionsumgebung nicht erlaubt. ' +
        'Bitte AUTH_MODE=entra setzen und ENTRA_TENANT_ID sowie ENTRA_CLIENT_ID konfigurieren.',
    );
    process.exit(1);
  }

  // ─── Entra-Konfigurationsprüfung ─────────────────────────────────────────────
  if (authMode === 'entra') {
    const missingVars = ENTRA_REQUIRED_ENV_VARS.filter(
      (key) => !process.env[key],
    );
    if (missingVars.length > 0) {
      logger.error(
        `KONFIGURATIONSFEHLER: AUTH_MODE=entra erfordert folgende Umgebungsvariablen: ${missingVars.join(', ')}`,
      );
      process.exit(1);
    }
  }

  logger.log(`Auth-Modus: ${authMode} | Umgebung: ${nodeEnv}`);
  // ─────────────────────────────────────────────────────────────────────────────

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix(API_GLOBAL_PREFIX);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: WEB_ALLOWED_ORIGINS,
    credentials: true,
  });

  // ─── Swagger / OpenAPI ────────────────────────────────────────────────────────
  const docsEnabled =
    nodeEnv !== 'production' || process.env.API_DOCS_ENABLED === 'true';

  if (docsEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(SWAGGER_CONFIG.title)
      .setDescription(SWAGGER_CONFIG.description)
      .setVersion(SWAGGER_CONFIG.version);
    SWAGGER_CONFIG.tags.forEach(([name, description]) => {
      swaggerConfig.addTag(name, description);
    });
    const document = SwaggerModule.createDocument(app, swaggerConfig.build());
    SwaggerModule.setup(API_DOCS_PATH, app, document);
  } else {
    logger.log('Swagger/OpenAPI ist in Produktion deaktiviert.');
  }
  // ─────────────────────────────────────────────────────────────────────────────

  await app.listen(process.env.API_PORT ?? API_DEFAULT_PORT);
}
void bootstrap();
