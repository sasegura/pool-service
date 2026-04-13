import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      common: {
        save: 'Save',
        cancel: 'Cancel',
        edit: 'Edit',
        delete: 'Delete',
        loading: 'Loading...',
        status: 'Status',
        date: 'Date',
        worker: 'Worker',
        client: 'Client',
        admin: 'Admin',
        actions: 'Actions',
        name: 'Name',
        address: 'Address',
        notes: 'Notes',
        today: 'Today',
        pending: 'Pending',
        inProgress: 'In Progress',
        completed: 'Completed',
        error: 'Error',
        success: 'Success',
      },
      nav: {
        dashboard: 'Dashboard',
        pools: 'Pools',
        routes: 'Routes',
        team: 'Team',
        incidents: 'Incidents',
        logout: 'Logout',
      },
      admin: {
        overview: 'Overview',
        operationStatus: 'Current operation status in Miami',
        activeRoutes: 'Active Routes',
        completedRoutes: 'Completed',
        incidents: 'Incidents',
        routeStatus: 'Route Status',
        assignedTo: 'Assigned to',
      },
      worker: {
        myRoute: 'My Route',
        noRouteToday: 'No route assigned for today',
        startService: 'Start Service',
        finishService: 'Finish Service',
        poolDetails: 'Pool Details',
        serviceLog: 'Service Log',
        arrival: 'Arrival',
        departure: 'Departure',
        photos: 'Photos',
        addPhoto: 'Add Photo',
        notifyClient: 'Notify Client',
      },
      routes: {
        title: 'Route Management',
        newRoute: 'New Route',
        editRoute: 'Edit Route',
        routeName: 'Route Name',
        scheduling: 'Scheduling',
        recurrence: 'Recurrence',
        startDate: 'Start Date',
        endDate: 'End Date',
        daysOfWeek: 'Days of Week',
        optimize: 'Optimize with AI',
        poolSelection: 'Pool Selection',
        order: 'Order',
        weeklyPlanner: 'Weekly Planner',
        templates: 'Templates / No Date Routes',
        assignedRoutes: 'Assigned Routes (Single Day)',
      }
    }
  },
  es: {
    translation: {
      common: {
        save: 'Guardar',
        cancel: 'Cancelar',
        edit: 'Editar',
        delete: 'Eliminar',
        loading: 'Cargando...',
        status: 'Estado',
        date: 'Fecha',
        worker: 'Técnico',
        client: 'Cliente',
        admin: 'Admin',
        actions: 'Acciones',
        name: 'Nombre',
        address: 'Dirección',
        notes: 'Notas',
        today: 'Hoy',
        pending: 'Pendiente',
        inProgress: 'En curso',
        completed: 'Completado',
        error: 'Error',
        success: 'Éxito',
      },
      nav: {
        dashboard: 'Dashboard',
        pools: 'Piscinas',
        routes: 'Rutas',
        team: 'Equipo',
        incidents: 'Incidentes',
        logout: 'Cerrar Sesión',
      },
      admin: {
        overview: 'Vista General',
        operationStatus: 'Estado actual de la operación en Miami',
        activeRoutes: 'Rutas Activas',
        completedRoutes: 'Completadas',
        incidents: 'Incidentes',
        routeStatus: 'Estado de Rutas',
        assignedTo: 'Asignado a',
      },
      worker: {
        myRoute: 'Mi Ruta',
        noRouteToday: 'No tienes ruta asignada para hoy',
        startService: 'Iniciar Servicio',
        finishService: 'Finalizar Servicio',
        poolDetails: 'Detalles de la Piscina',
        serviceLog: 'Registro de Servicio',
        arrival: 'Llegada',
        departure: 'Salida',
        photos: 'Fotos',
        addPhoto: 'Añadir Foto',
        notifyClient: 'Notificar al Cliente',
      },
      routes: {
        title: 'Gestión de Rutas',
        newRoute: 'Nueva Ruta',
        editRoute: 'Editar Ruta',
        routeName: 'Nombre de la Ruta',
        scheduling: 'Planificación',
        recurrence: 'Recurrencia',
        startDate: 'Fecha Inicio',
        endDate: 'Fecha Fin',
        daysOfWeek: 'Días de la semana',
        optimize: 'Optimizar con IA',
        poolSelection: 'Selección de Piscinas',
        order: 'Orden',
        weeklyPlanner: 'Planificador Semanal',
        templates: 'Plantillas / Rutas sin fecha',
        assignedRoutes: 'Rutas Asignadas (Día único)',
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
