describe('Auth and protected navigation', () => {
  it('redirects unauthenticated users to login', () => {
    cy.visit('/pools');
    cy.location('pathname').should('eq', '/login');
    cy.contains(/Miami Pool Care/i).should('be.visible');
  });

  it('allows email login and displays dashboard shell', () => {
    cy.loginWithEmailPassword();
    cy.contains(/Vista general|Overview|Mi ruta|My route|Mi piscina|My pool/i, { timeout: 20000 }).should('be.visible');
    cy.contains(/Dashboard/i).should('be.visible');
  });

  it('navigates to pools, routes, team and incidents pages for admin/supervisor roles', () => {
    cy.loginWithEmailPassword();

    cy.contains('a', /Piscinas|Pools/i).click();
    cy.location('pathname').should('eq', '/pools');
    cy.contains(/Gestión de piscinas|Pool management/i).should('be.visible');

    cy.contains('a', /Rutas|Routes/i).click();
    cy.location('pathname').should('eq', '/routes');
    cy.contains(/Gestión de rutas|Route management/i).should('be.visible');

    cy.contains('a', /Equipo|Team/i).click();
    cy.location('pathname').should('eq', '/team');
    cy.contains(/Gestión del equipo|Team management/i).should('be.visible');

    cy.contains('a', /Incidentes|Incidents/i).click();
    cy.location('pathname').should('eq', '/incidents');
    cy.contains(/Incidencias reportadas|Reported incidents/i).should('be.visible');
  });

  it('supports language toggle in the authenticated layout', () => {
    cy.loginWithEmailPassword();
    cy.get('header').contains('button', /ES|EN/i).click();
    cy.contains(/Pools|Piscinas/i).should('be.visible');
  });
});
