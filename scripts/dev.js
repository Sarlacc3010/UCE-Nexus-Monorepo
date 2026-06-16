const { spawn } = require('child_process');

console.log('🚀 Iniciando UCE-Nexus Monorepo en modo híbrido...');

// 1. Iniciar Docker Compose para los backends e infraestructura unificada
// Esto evita condiciones de carrera al levantar dependencias gRPC y de bases de datos
const dockerProcess = spawn('docker-compose', [
  '-f', 'infra/docker/docker-compose.local.yml',
  'up', '--build'
], { 
  stdio: 'inherit', 
  shell: true,
  env: {
    ...process.env,
    DOCKER_BUILDKIT: '0',
    COMPOSE_DOCKER_CLI_BUILD: '0'
  }
});

// 2. Iniciar Turborepo para los frontends locales en la máquina host
const turboProcess = spawn('npx', [
  'turbo', 'run', 'dev',
  '--filter=web-host',
  '--filter=web-academic',
  '--filter=web-campus',
  '--filter=web-chatbot'
], { stdio: 'inherit', shell: true });

// Apagado limpio y coordinado de ambos procesos al presionar Ctrl+C
const cleanup = () => {
  console.log('\n👋 Cerrando servicios y apagando contenedores...');
  dockerProcess.kill('SIGINT');
  turboProcess.kill('SIGINT');
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
