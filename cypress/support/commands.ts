function requiredEnv(name: string): string {
  const value = Cypress.env(name);
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing Cypress env var: ${name}`);
  }
  return value;
}

Cypress.Commands.add('loginWithEmailPassword', () => {
  const email = requiredEnv('E2E_EMAIL');
  const password = requiredEnv('E2E_PASSWORD');

  cy.visit('/login');
  cy.get('input[type="email"]').should('be.visible').clear().type(email);
  cy.get('input[type="password"]').should('be.visible').clear().type(password, { log: false });

  cy.contains('button', /Entrar con correo|Sign in with email/i).click();
  cy.location('pathname', { timeout: 20000 }).should('eq', '/');
});

declare global {
  namespace Cypress {
    interface Chainable {
      loginWithEmailPassword(): Chainable<void>;
    }
  }
}

export {};
