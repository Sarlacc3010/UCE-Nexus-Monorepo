import KcAdminClient from '@keycloak/keycloak-admin-client';

class KeycloakService {
  private kcAdminClient: KcAdminClient;

  constructor() {
    this.kcAdminClient = new KcAdminClient({
      baseUrl: process.env.KEYCLOAK_BASE_URL || 'http://localhost:8080',
      realmName: process.env.KEYCLOAK_REALM || 'master',
    });
  }

  async authenticate() {
    await this.kcAdminClient.auth({
      username: process.env.KEYCLOAK_ADMIN_USERNAME || 'admin',
      password: process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin',
      grantType: 'password',
      clientId: 'admin-cli',
    });
  }

  async getUsers() {
    await this.authenticate();
    return await this.kcAdminClient.users.find();
  }

  async createUser(user: any) {
    await this.authenticate();
    return await this.kcAdminClient.users.create(user);
  }
}

export const keycloakService = new KeycloakService();
